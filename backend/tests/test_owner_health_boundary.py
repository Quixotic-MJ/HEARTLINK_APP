"""General Wellness staff review content, not other accounts' personal records."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils import security
from app.utils.security import get_current_user

OWNER = "11111111-1111-1111-1111-111111111111"
STAFF = ["admin", "Dietitian", "Physical Therapist", "Cardiologist"]
PERSONAL_READS = [
    f"/api/users/{OWNER}/profile", f"/api/users/{OWNER}/reminders",
    f"/api/health-logs/{OWNER}", f"/api/meals/{OWNER}",
    f"/api/exercises/logs/{OWNER}", f"/api/sleep-logs/{OWNER}",
    f"/api/analytics/{OWNER}", f"/api/analytics/{OWNER}/long-term",
    f"/api/reports/{OWNER}", f"/api/notifications/{OWNER}",
    f"/api/recipes/saved/{OWNER}", f"/api/exercises/saved/{OWNER}",
]
CONTACT = {"name": "Synthetic contact", "role_title": "Contact", "phone": "09123456789"}
PERSONAL_WRITES = [
    ("PUT", f"/api/users/{OWNER}/profile", {"first_name": "Synthetic", "date_of_birth": "1990-01-01",
                                            "sex": "female", "height_cm": 160, "weight_kg": 60}),
    ("DELETE", f"/api/users/{OWNER}", {"password": "SyntheticNotARealCredential"}),
    ("PUT", f"/api/users/{OWNER}/reminders", {key: {"enabled": True, "time": "08:00"}
                                             for key in ("morning", "evening", "activity")}),
    ("POST", f"/api/users/{OWNER}/care-team", CONTACT),
    ("PUT", f"/api/users/{OWNER}/care-team/contact", CONTACT),
    ("DELETE", f"/api/users/{OWNER}/care-team/contact", None),
    ("POST", f"/api/recipes/synthetic-recipe/save/{OWNER}", None),
    ("DELETE", f"/api/recipes/synthetic-recipe/save/{OWNER}", None),
    ("POST", f"/api/exercises/synthetic-routine/save/{OWNER}", None),
    ("DELETE", f"/api/exercises/synthetic-routine/save/{OWNER}", None),
    ("POST", f"/api/meals/{OWNER}", {}), ("DELETE", f"/api/meals/{OWNER}/log", None),
    ("POST", f"/api/health-logs/{OWNER}", {}), ("DELETE", f"/api/health-logs/{OWNER}/log", None),
    ("POST", f"/api/health-logs/{OWNER}/clear-symptom-lock", {}),
    ("POST", f"/api/sleep-logs/{OWNER}", {}), ("DELETE", f"/api/sleep-logs/{OWNER}/log", None),
    ("POST", f"/api/exercises/logs/{OWNER}", {}), ("DELETE", f"/api/exercises/logs/{OWNER}/log", None),
    ("PUT", f"/api/analytics/{OWNER}/thresholds", {"sodium_limit_mg": 1500, "active_minutes_goal": 30,
                                                "systolic_threshold": 120, "diastolic_threshold": 80}),
    ("PUT", f"/api/notifications/{OWNER}/mark-all-read", {}),
]


@pytest.fixture
def personal_api(monkeypatch):
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    from app.utils.rate_limiter import limiter
    limiter.reset()
    caller = {"user_id": "synthetic-staff", "role": "admin"}
    app.dependency_overrides[get_current_user] = lambda: dict(caller)
    profiles = SimpleNamespace(get_by_id=lambda uid: {
        "id": uid, "role": caller["role"], "expert_type": caller.get("expert_type"),
        "account_status": "active", "plan": "premium", "premium_until": "2099-01-01T00:00:00+00:00",
    })
    # Even a historical care-team assignment must not grant portal health access.
    baseline = SimpleNamespace(list_care_team=lambda _uid: [{"contact_user_id": caller["user_id"]}])
    monkeypatch.setattr(security, "get_profile_repo", lambda: profiles)
    monkeypatch.setattr("app.db.repositories.get_baseline_repo", lambda: baseline)
    monkeypatch.setattr("app.services.premium.get_profile_repo", lambda: profiles)
    try:
        yield TestClient(app, raise_server_exceptions=False), caller
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)


@pytest.mark.parametrize("staff", STAFF)
@pytest.mark.parametrize("path", PERSONAL_READS)
def test_staff_cannot_read_another_accounts_personal_data(personal_api, staff, path):
    client, caller = personal_api
    caller.update(role="admin" if staff == "admin" else "medical_expert", expert_type=staff)
    assert client.get(path).status_code == 403


@pytest.mark.parametrize("staff", STAFF)
def test_real_signed_staff_session_cannot_read_consumer_logs(personal_api, staff):
    client, caller = personal_api
    caller.update(role="admin" if staff == "admin" else "medical_expert", expert_type=staff)
    app.dependency_overrides.pop(get_current_user)
    token = security.create_access_token({"user_id": caller["user_id"], "role": caller["role"]})
    response = client.get(f"/api/health-logs/{OWNER}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert "own personal records" in response.json()["detail"]


@pytest.mark.parametrize("staff", STAFF)
@pytest.mark.parametrize("method,path,body", PERSONAL_WRITES)
def test_staff_cannot_modify_another_accounts_personal_data(personal_api, staff, method, path, body):
    client, caller = personal_api
    caller.update(role="admin" if staff == "admin" else "medical_expert", expert_type=staff)
    assert client.request(method, path, json=body).status_code == 403


def test_admin_personal_notification_update_is_scoped_to_their_own_account(personal_api, monkeypatch):
    client, caller = personal_api
    filters = []
    monkeypatch.setattr("app.api.notifications_api.notifications_api.mark_notification_read",
                        lambda _id, user_id: filters.append(user_id) or True)
    assert client.put("/api/notifications/synthetic-notification/read").status_code == 200
    assert filters == [caller["user_id"]]


def test_failed_notification_update_is_not_acknowledged(personal_api, monkeypatch):
    client, _ = personal_api
    monkeypatch.setattr("app.api.notifications_api.notifications_api.mark_notification_read", lambda *_args, **_kwargs: False)
    assert client.put("/api/notifications/synthetic-notification/read").status_code == 404


@pytest.mark.parametrize("specialty", STAFF[1:])
@pytest.mark.parametrize("permission", ["meal_logs:read", "meal_logs:write", "exercise_logs:read", "vitals:read", "vitals:write"])
def test_content_review_specialty_does_not_grant_personal_log_permissions(personal_api, specialty, permission):
    _, caller = personal_api
    caller.update(role="medical_expert", expert_type=specialty)
    assert not security.has_permission(caller, permission)


def test_consumer_can_still_read_their_own_logs_and_not_another_accounts(personal_api, monkeypatch):
    client, caller = personal_api
    caller.update(user_id=OWNER, role="patient")
    reads = []
    def logs(user_id, *_args):
        reads.append(user_id)
        return {"data": [], "total": 0}
    monkeypatch.setattr("app.api.health_logs.health_logs.get_paginated_health_logs", logs)
    assert client.get(f"/api/health-logs/{OWNER}").json() == {"data": [], "total": 0}
    assert client.get("/api/health-logs/22222222-2222-2222-2222-222222222222").status_code == 403
    assert reads == [OWNER]


@pytest.mark.parametrize("caller", [{}, {"role": "admin"}, {"user_id": OWNER, "role": "unknown"}])
def test_missing_or_unknown_identity_never_passes_personal_ownership(caller):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        security.verify_user_access(caller, caller.get("user_id"))
    assert error.value.status_code == 403
