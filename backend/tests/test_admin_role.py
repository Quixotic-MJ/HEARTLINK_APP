"""HL-074: one Admin role with full staff access (Super Admin is gone), kept apart from the Expert sub-roles."""
import re
from pathlib import Path

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.admin_api import admin_api
from app.api.admin_api.admin_api import _resolve_expert_type, delete_user_or_staff, toggle_user_status
from app.utils.security import (
    ADMIN_ROLES,
    STAFF_ROLES,
    create_access_token,
    get_current_admin_only,
    get_current_admin_user,
    revoked_token_hashes,
    verify_user_access,
)

PROFILES = {
    "admin-1": {"id": "admin-1", "role": "admin", "account_status": "active"},
    "admin-2": {"id": "admin-2", "role": "admin", "account_status": "active"},
    "expert-1": {"id": "expert-1", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
    "patient-1": {"id": "patient-1", "role": "patient", "account_status": "active"},
}


class FakeProfileRepo:
    def __init__(self, profiles):
        self.profiles = profiles

    def get_by_id(self, user_id):
        return self.profiles.get(user_id)

    def list_all(self, role_filter=None, exclude_archived=True):
        return list(self.profiles.values())

    def update_profile(self, user_id, data):
        self.profiles[user_id].update(data)
        return self.profiles[user_id]

    def archive(self, user_id):
        self.profiles[user_id]["account_status"] = "archived"
        return True


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


guarded_app = FastAPI()


@guarded_app.get("/staff")
def staff_only(user: dict = Depends(get_current_admin_user)):
    return {"role": user["role"]}


@guarded_app.get("/admin")
def admin_only(user: dict = Depends(get_current_admin_only)):
    return {"role": user["role"]}


@pytest.fixture(autouse=True)
def fakes(monkeypatch):
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: FakeProfileRepo(PROFILES))
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    yield
    revoked_token_hashes.clear()


@pytest.fixture
def staff_repo(monkeypatch):
    """A fresh copy of the accounts for the endpoints that change them."""
    repo = FakeProfileRepo({k: dict(v) for k, v in PROFILES.items()})
    monkeypatch.setattr(admin_api, "get_profile_repo", lambda: repo)
    monkeypatch.setattr(admin_api, "record_admin_activity", lambda **k: None)
    monkeypatch.setattr("app.services.admin_notifications.create_admin_notification", lambda **k: None)
    return repo


def _get(path, user_id, role=None):
    token = create_access_token({"user_id": user_id, "role": role or PROFILES[user_id]["role"]})
    return TestClient(guarded_app).get(path, headers={"Authorization": f"Bearer {token}"})


def test_admin_passes_staff_and_admin_guards():
    assert _get("/staff", "admin-1").status_code == 200
    assert _get("/admin", "admin-1").status_code == 200


def test_experts_are_staff_but_not_admins():
    assert _get("/staff", "expert-1").status_code == 200
    assert _get("/admin", "expert-1").status_code == 403


def test_patient_is_not_staff():
    assert _get("/staff", "patient-1").status_code == 403


def test_an_old_super_admin_session_is_refused():
    """A token issued before the change still says super_admin; signing in again gives an admin token."""
    assert _get("/staff", "admin-1", role="super_admin").status_code == 403


def test_admin_can_open_any_patient_record():
    verify_user_access({"user_id": "admin-1", "role": "admin"}, "patient-1")


@pytest.mark.parametrize("legacy_role", ["doctor", "clinician", "superadmin", "Super Admin", "super_admin"])
def test_unknown_role_names_get_no_access(legacy_role):
    with pytest.raises(HTTPException) as exc:
        verify_user_access({"user_id": "x", "role": legacy_role}, "patient-1")
    assert exc.value.status_code == 403


def test_admin_never_carries_an_expert_type():
    assert _resolve_expert_type("admin", "Cardiologist") is None


def test_only_one_admin_role_exists():
    assert STAFF_ROLES == {"admin", "medical_expert"}
    assert ADMIN_ROLES == {"admin"}
    sql = (Path(__file__).resolve().parents[1] / "supabase/migrations/038_single_admin_role.sql").read_text(encoding="utf-8")
    allowed = re.search(r"CHECK \(role IN \(([^)]*)\)\)", sql).group(1)
    assert sorted(r.strip(" '") for r in allowed.split(",")) == ["admin", "medical_expert", "patient"]


def test_an_admin_can_disable_and_enable_another_admin(staff_repo):
    admin = {"user_id": "admin-1", "role": "admin"}
    assert toggle_user_status("admin-2", {"reason": "User request"}, current_user=admin)["new_status"] == "disabled"
    assert toggle_user_status("admin-2", None, current_user=admin)["new_status"] == "active"


def test_an_admin_can_manage_expert_accounts(staff_repo):
    admin = {"user_id": "admin-1", "role": "admin"}
    assert toggle_user_status("expert-1", None, current_user=admin)["new_status"] == "disabled"


def test_the_last_active_admin_cannot_be_disabled(staff_repo):
    staff_repo.profiles["admin-1"]["account_status"] = "disabled"
    with pytest.raises(HTTPException) as exc:
        # admin-1's session is still open while admin-2 is the last active admin
        toggle_user_status("admin-2", None, current_user={"user_id": "admin-1", "role": "admin"})
    assert exc.value.status_code == 400
    assert "last active admin" in exc.value.detail


def test_nobody_can_disable_themselves(staff_repo):
    with pytest.raises(HTTPException) as exc:
        toggle_user_status("admin-1", None, current_user={"user_id": "admin-1", "role": "admin"})
    assert exc.value.status_code == 400


def test_an_admin_cannot_delete_another_admin(staff_repo):
    with pytest.raises(HTTPException) as exc:
        delete_user_or_staff("admin-2", current_user={"user_id": "admin-1", "role": "admin"})
    assert exc.value.status_code == 400
    assert staff_repo.profiles["admin-2"]["account_status"] == "active"


def test_an_admin_can_delete_a_patient(staff_repo):
    delete_user_or_staff("patient-1", current_user={"user_id": "admin-1", "role": "admin"})
    assert staff_repo.profiles["patient-1"]["account_status"] == "archived"
