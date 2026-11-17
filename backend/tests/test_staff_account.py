"""The portal's Settings: /api/auth/me reports the account status and sign-in type, and staff edit their own name and phone."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token, revoked_token_hashes

STAFF_ID = "staff-1"
OTHER_ID = "patient-9"


class FakeProfileRepo:
    def __init__(self):
        self.rows = {
            STAFF_ID: {"id": STAFF_ID, "role": "admin", "account_status": "active", "first_name": "System",
                       "last_name": "Super Admin", "email": "admin@example.com", "phone": None},
            OTHER_ID: {"id": OTHER_ID, "role": "patient", "account_status": "active", "first_name": "Pia",
                       "last_name": "", "email": "pia@example.com", "phone": "+639171112222"},
        }
        self.updates = []

    def get_by_id(self, user_id):
        return self.rows.get(user_id)

    def get_by_identifier(self, identifier):
        return next((r for r in self.rows.values() if r.get("phone") == identifier), None)

    def update_profile(self, user_id, data):
        self.updates.append((user_id, data))
        self.rows[user_id] = {**self.rows[user_id], **data}
        return self.rows[user_id]


@pytest.fixture
def repo(monkeypatch):
    fake = FakeProfileRepo()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: fake)
    monkeypatch.setattr("app.api.auth.auth.get_profile_repo", lambda: fake)
    monkeypatch.setattr("app.api.auth.auth.record_admin_activity", lambda **kw: None)
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    yield fake
    app.dependency_overrides.update(saved)


def _client(user_id=STAFF_ID, role="admin"):
    token = create_access_token({"user_id": user_id, "role": role})
    client = TestClient(app, base_url="https://testserver")
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def test_me_reports_status_and_sign_in_type(repo, monkeypatch):
    monkeypatch.delenv("STAFF_2FA_ENABLED", raising=False)
    body = _client().get("/api/auth/me").json()
    assert body["account_status"] == "active"
    assert body["two_factor"] is True

    monkeypatch.setenv("STAFF_2FA_ENABLED", "false")
    assert _client().get("/api/auth/me").json()["two_factor"] is False


def test_staff_edits_own_name_and_phone(repo):
    res = _client().put("/api/auth/me", json={"first_name": "  John  Mark ", "last_name": "Magdasal",
                                              "phone": "0917 123 4567"})
    assert res.status_code == 200
    assert res.json()["first_name"] == "John Mark"
    assert res.json()["phone"] == "+639171234567"
    # Only the caller's own row, and only these fields: never the role, email or status
    assert repo.updates == [(STAFF_ID, {"first_name": "John Mark", "last_name": "Magdasal", "phone": "+639171234567"})]


def test_clearing_the_phone_is_allowed(repo):
    res = _client().put("/api/auth/me", json={"first_name": "John", "last_name": "", "phone": ""})
    assert res.status_code == 200
    assert repo.updates[-1][1]["phone"] is None


def test_role_and_email_in_the_request_are_ignored(repo):
    res = _client().put("/api/auth/me", json={"first_name": "John", "role": "medical_expert", "email": "x@example.com"})
    assert res.status_code == 200
    assert set(repo.updates[-1][1]) == {"first_name", "last_name", "phone"}
    assert repo.rows[STAFF_ID]["role"] == "admin"


@pytest.mark.parametrize("body", [
    {"first_name": "   "},
    {"first_name": "A" * 51},
    {"first_name": "John", "phone": "12345"},
    {"first_name": "John", "phone": "0217 123 4567"},
])
def test_bad_details_are_refused(repo, body):
    assert _client().put("/api/auth/me", json=body).status_code == 422
    assert repo.updates == []


def test_phone_used_by_another_account_is_refused(repo):
    res = _client().put("/api/auth/me", json={"first_name": "John", "phone": "09171112222"})
    assert res.status_code == 409
    assert repo.updates == []


def test_patients_cannot_use_the_staff_route(repo):
    assert _client(OTHER_ID, "patient").put("/api/auth/me", json={"first_name": "Pia"}).status_code == 403
    assert repo.updates == []
