"""Staff settings use the session projection, never a personal health profile."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.admin_notifications import portal_notification
from app.utils.security import create_access_token, revoked_token_hashes


@pytest.fixture
def staff(monkeypatch):
    profile = {
        "id": "synthetic-staff", "role": "admin", "account_status": "active",
        "first_name": "Synthetic", "last_name": "Staff", "email": "staff@example.test",
        "phone": "", "expert_type": None, "must_change_password": False,
        "baseline_bp": "synthetic-private-field", "hss_score": 45,
        "onboarding_data": {"private": True}, "unexpected_secret": "not-for-portal",
    }
    repo = SimpleNamespace(get_by_id=lambda user_id: profile if user_id == profile["id"] else None)
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: repo)
    monkeypatch.setattr("app.api.auth.auth.get_profile_repo", lambda: repo)
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    yield profile
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


def headers(role):
    token = create_access_token({"user_id": "synthetic-staff", "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("expert_type", [None, "Dietitian", "Physical Therapist", "Cardiologist"])
def test_staff_settings_receive_only_account_fields(staff, expert_type):
    staff.update(role="medical_expert" if expert_type else "admin", expert_type=expert_type)
    response = TestClient(app).get("/api/auth/me", headers=headers(staff["role"]))
    assert response.status_code == 200
    assert response.json() == {
        "user_id": "synthetic-staff", "role": staff["role"], "expert_type": expert_type,
        "first_name": "Synthetic", "last_name": "Staff", "email": "staff@example.test",
        "phone": "", "account_status": "active", "must_change_password": False,
    }


@pytest.mark.parametrize("status", ["disabled", "archived", None, "unknown"])
def test_settings_session_never_claims_inactive_accounts_are_active(staff, status):
    staff["account_status"] = status
    assert TestClient(app).get("/api/auth/me", headers=headers("admin")).status_code == 403


def test_nonstaff_and_stale_roles_cannot_read_staff_settings(staff):
    client = TestClient(app)
    assert client.get("/api/auth/me").status_code == 401
    staff["role"] = "patient"
    assert client.get("/api/auth/me", headers=headers("patient")).status_code == 403
    assert client.get("/api/auth/me", headers=headers("admin")).status_code == 403


@pytest.mark.parametrize("expert_type", ["Dietitian", "Physical Therapist", "Cardiologist"])
def test_expert_account_notifications_can_open_own_settings(expert_type):
    notification = {"type": "system", "title": "Account notice", "message": "Review your account settings.", "route": "/settings"}
    assert portal_notification(notification, "medical_expert", expert_type) == notification
    assert portal_notification({**notification, "type": "clinical"}, "medical_expert", expert_type)["route"] is None
    assert portal_notification(notification, "patient")["route"] is None
