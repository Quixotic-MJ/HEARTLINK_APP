"""HL-044: one-time random staff passwords and the forced password change on first login."""
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.admin_api import admin_api
from app.api.admin_api.admin_api import create_system_staff, generate_temp_password
from app.main import app
from app.utils.password_policy import validate_strong_password
from app.utils.security import (
    PASSWORD_CHANGE_REQUIRED,
    create_access_token,
    get_current_admin_user,
    get_current_user,
    revoked_token_hashes,
)

STAFF_ID = str(uuid.uuid4())
SUPER_ADMIN = {"user_id": "super-admin-id", "role": "super_admin"}


class FakeProfileRepo:
    def __init__(self, profiles=None):
        self.profiles = {p["id"]: dict(p) for p in (profiles or [])}

    def get_by_id(self, user_id):
        return self.profiles.get(user_id)

    def update(self, user_id, data):
        if user_id not in self.profiles:
            return None
        self.profiles[user_id].update(data)
        return self.profiles[user_id]

    def list_all(self, exclude_archived=True):
        return list(self.profiles.values())

    def create_profile(self, data):
        self.profiles[data["id"]] = dict(data)
        return self.profiles[data["id"]]


def staff_profile(must_change_password=True):
    return {
        "id": STAFF_ID,
        "role": "medical_expert",
        "expert_type": "Dietitian",
        "account_status": "active",
        "first_name": "Dee",
        "last_name": "Dietitian",
        "email": "dee@example.com",
        "phone": "",
        "must_change_password": must_change_password,
    }


@pytest.fixture
def repo(monkeypatch):
    fake = FakeProfileRepo([staff_profile()])
    for target in (
        "app.utils.security.get_profile_repo",
        "app.api.auth.auth.get_profile_repo",
        "app.db.repositories.get_profile_repo",
        "app.api.admin_api.admin_api.get_profile_repo",
    ):
        monkeypatch.setattr(target, lambda: fake)
    revoked_token_hashes.clear()
    saved_overrides = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield fake
    app.dependency_overrides.update(saved_overrides)
    revoked_token_hashes.clear()


def bearer(role="medical_expert"):
    return {"Authorization": f"Bearer {create_access_token({'user_id': STAFF_ID, 'role': role})}"}


# --- the random password -----------------------------------------------------

def test_temp_password_meets_policy_and_is_random():
    passwords = {generate_temp_password() for _ in range(50)}
    assert len(passwords) == 50
    for pw in passwords:
        assert validate_strong_password(pw) == pw
        assert pw != "TempPassword2026!"


# --- the lock until the password is changed ---------------------------------

lock_app = FastAPI()


@lock_app.get("/api/admin/cases")
def admin_route(user: dict = Depends(get_current_admin_user)):
    return {"ok": True}


@lock_app.get("/api/users/{user_id}/profile")
def user_route(user_id: str, user: dict = Depends(get_current_user)):
    return {"ok": True}


def test_flagged_staff_is_blocked_everywhere_else(repo):
    client = TestClient(lock_app)
    for path in ("/api/admin/cases", f"/api/users/{STAFF_ID}/profile"):
        res = client.get(path, headers=bearer())
        assert res.status_code == 403
        assert res.json()["detail"] == PASSWORD_CHANGE_REQUIRED


def test_unflagged_staff_is_not_blocked(repo):
    repo.profiles[STAFF_ID]["must_change_password"] = False
    res = TestClient(lock_app).get("/api/admin/cases", headers=bearer())
    assert res.status_code == 200


def test_session_probe_still_works_and_reports_the_flag(repo):
    res = TestClient(app).get("/api/auth/me", headers=bearer())
    assert res.status_code == 200
    assert res.json()["must_change_password"] is True


def test_changing_the_password_unlocks_the_account(repo, monkeypatch):
    monkeypatch.setattr("app.api.users.profile.change_password", lambda uid, cur, new: True)
    client = TestClient(app)

    res = client.put(
        f"/api/users/{STAFF_ID}/password",
        json={"current_password": "Temp-password-123!", "new_password": "My-own-new-password-456!"},
        headers=bearer(),
    )

    assert res.status_code == 200
    assert repo.profiles[STAFF_ID]["must_change_password"] is False
    assert TestClient(lock_app).get("/api/admin/cases", headers=bearer()).status_code == 200


def test_wrong_current_password_keeps_the_lock(repo, monkeypatch):
    monkeypatch.setattr("app.api.users.profile.change_password", lambda uid, cur, new: False)
    res = TestClient(app).put(
        f"/api/users/{STAFF_ID}/password",
        json={"current_password": "wrong", "new_password": "My-own-new-password-456!"},
        headers=bearer(),
    )
    assert res.status_code == 400
    assert repo.profiles[STAFF_ID]["must_change_password"] is True


def test_new_password_must_differ_from_current(repo, monkeypatch):
    monkeypatch.setattr("app.api.users.profile.change_password", lambda uid, cur, new: True)
    same = "Same-password-123456!"
    res = TestClient(app).put(
        f"/api/users/{STAFF_ID}/password",
        json={"current_password": same, "new_password": same},
        headers=bearer(),
    )
    assert res.status_code == 400
    assert repo.profiles[STAFF_ID]["must_change_password"] is True


# --- creating a staff account ------------------------------------------------

class FakeHttpxClient:
    calls = []

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, url, headers=None, json=None):
        FakeHttpxClient.calls.append(json)
        return SimpleNamespace(status_code=201, json=lambda: {"id": str(uuid.uuid4())})


@pytest.fixture
def staff_creation(monkeypatch):
    repo = FakeProfileRepo()
    monkeypatch.setattr(admin_api, "get_profile_repo", lambda: repo)
    supabase = MagicMock()
    supabase.auth.admin.list_users.return_value = []
    monkeypatch.setattr(admin_api, "get_supabase_client", lambda: supabase)
    monkeypatch.setattr(admin_api, "record_admin_activity", lambda **k: None)
    monkeypatch.setattr("httpx.Client", FakeHttpxClient)
    FakeHttpxClient.calls = []
    return repo, supabase


def test_new_staff_gets_a_unique_temp_password_and_must_change_it(staff_creation):
    repo, _ = staff_creation
    payload = {"name": "Dee Dietitian", "email": "dee2@example.com", "role": "medical_expert", "expert_type": "Dietitian"}

    first = create_system_staff(dict(payload), current_user=SUPER_ADMIN)
    second = create_system_staff(dict(payload, email="dee3@example.com"), current_user=SUPER_ADMIN)

    assert first["temp_password"] != second["temp_password"]
    assert [c["password"] for c in FakeHttpxClient.calls] == [first["temp_password"], second["temp_password"]]
    assert repo.get_by_id(first["id"])["must_change_password"] is True
    validate_strong_password(first["temp_password"])


def test_existing_login_is_reset_to_the_new_temp_password(staff_creation):
    repo, supabase = staff_creation
    existing_id = str(uuid.uuid4())
    supabase.auth.admin.list_users.return_value = [SimpleNamespace(id=existing_id, email="dee4@example.com")]

    result = create_system_staff(
        {"name": "Dee Four", "email": "dee4@example.com", "role": "admin"}, current_user=SUPER_ADMIN
    )

    supabase.auth.admin.update_user_by_id.assert_called_once_with(existing_id, {"password": result["temp_password"]})
    assert FakeHttpxClient.calls == []
    assert repo.get_by_id(existing_id)["must_change_password"] is True


# --- password checks never sign in on the shared Supabase client ------------

def test_change_password_leaves_the_shared_client_alone(monkeypatch):
    from app.services import auth_service
    from app.services.auth_service import SupabaseAuthService

    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: FakeProfileRepo([staff_profile()]))
    shared = MagicMock()
    isolated = MagicMock()
    isolated.sign_in_with_password.return_value = SimpleNamespace(user=SimpleNamespace(id=STAFF_ID))
    svc = SupabaseAuthService(shared)
    monkeypatch.setattr(svc, "_isolated_auth", lambda: isolated)

    assert svc.change_password(STAFF_ID, "Temp-password-123!", "My-own-new-password-456!") is True
    assert svc.verify_credentials(STAFF_ID, "My-own-new-password-456!") is True

    shared.auth.sign_in_with_password.assert_not_called()
    shared.auth.update_user.assert_not_called()
    shared.auth.admin.update_user_by_id.assert_called_once_with(STAFF_ID, {"password": "My-own-new-password-456!"})
