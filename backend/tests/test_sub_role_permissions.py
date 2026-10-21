"""HL-012: each expert type only reaches its own area; admin-only actions are closed to experts."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import (
    EXPERT_PERMISSIONS,
    create_access_token,
    has_permission,
    revoked_token_hashes,
)

PATIENT_ID = "11111111-1111-1111-1111-111111111111"
PROFILES = {
    "diet-1": {"id": "diet-1", "role": "medical_expert", "expert_type": "Dietitian", "account_status": "active"},
    "pt-1": {"id": "pt-1", "role": "medical_expert", "expert_type": "Physical Therapist", "account_status": "active"},
    "cardio-1": {"id": "cardio-1", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
    "admin-1": {"id": "admin-1", "role": "admin", "account_status": "active"},
    "super-1": {"id": "super-1", "role": "super_admin", "account_status": "active"},
    PATIENT_ID: {"id": PATIENT_ID, "role": "patient", "account_status": "active"},
}


class FakeProfileRepo:
    def get_by_id(self, user_id):
        return PROFILES.get(user_id)


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


@pytest.fixture(autouse=True)
def fakes(monkeypatch):
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: FakeProfileRepo())
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    # Care-team checks are covered elsewhere; here every expert is on the patient's care team.
    for module in ("meals.meals", "exercises.exercises", "health_logs.health_logs", "sleep_logs.sleep_logs", "analytics_api.analytics_api"):
        monkeypatch.setattr(f"app.api.{module}.verify_user_access", lambda *a, **k: None)
    monkeypatch.setattr("app.api.meals.meals.get_paginated_meal_logs", lambda *a, **k: {"data": []})
    monkeypatch.setattr("app.api.exercises.exercises.get_exercise_logs", lambda *a, **k: [])
    monkeypatch.setattr("app.api.health_logs.health_logs.get_paginated_health_logs", lambda *a, **k: {"data": []})
    monkeypatch.setattr("app.api.sleep_logs.sleep_logs.get_sleep_logs", lambda *a, **k: [])
    monkeypatch.setattr("app.api.recipes_api.recipes_api.create_recipe", lambda data, **k: {"id": "r1", "name": "Soup"})
    monkeypatch.setattr("app.api.recipes_api.recipes_api.record_admin_activity", lambda **k: None)
    monkeypatch.setattr("app.api.exercises.exercises.create_routine", lambda data, **k: {"id": "e1", "name": "Walk"})
    monkeypatch.setattr("app.api.exercises.exercises.record_admin_activity", lambda **k: None)
    # Other test modules install app-wide dependency overrides at import time; use the real guards here.
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


def _call(method, path, user_id, **kwargs):
    token = create_access_token({"user_id": user_id, "role": PROFILES[user_id]["role"]})
    client = TestClient(app, base_url="https://testserver")
    return client.request(method, path, headers={"Authorization": f"Bearer {token}"}, **kwargs)


ADD_RECIPE = ("POST", "/api/recipes", {"json": {"name": "Soup"}})
ADD_EXERCISE = ("POST", "/api/exercises/", {"json": {"name": "Walk"}})
READ_MEALS = ("GET", f"/api/meals/{PATIENT_ID}", {})
READ_EXERCISE_LOGS = ("GET", f"/api/exercises/logs/{PATIENT_ID}", {})
READ_HEALTH = ("GET", f"/api/health-logs/{PATIENT_ID}", {})
READ_SLEEP = ("GET", f"/api/sleep-logs/{PATIENT_ID}", {})
READ_ANALYTICS = ("GET", f"/api/analytics/{PATIENT_ID}", {})
ADD_HEALTH = ("POST", f"/api/health-logs/{PATIENT_ID}", {"json": {}})
ADD_SLEEP = ("POST", f"/api/sleep-logs/{PATIENT_ID}", {"json": {}})

ALLOWED = 200
FORBIDDEN = 403


@pytest.mark.parametrize("user_id, call, expected", [
    # Dietitian: recipes and food logs, reads vitals
    ("diet-1", ADD_RECIPE, ALLOWED),
    ("diet-1", ADD_EXERCISE, FORBIDDEN),
    ("diet-1", READ_MEALS, ALLOWED),
    ("diet-1", READ_EXERCISE_LOGS, FORBIDDEN),
    ("diet-1", READ_HEALTH, ALLOWED),
    ("diet-1", READ_SLEEP, ALLOWED),
    ("diet-1", READ_ANALYTICS, ALLOWED),
    ("diet-1", ADD_HEALTH, FORBIDDEN),
    ("diet-1", ADD_SLEEP, FORBIDDEN),
    # Physical Therapist: exercises and exercise logs, reads vitals
    ("pt-1", ADD_EXERCISE, ALLOWED),
    ("pt-1", ADD_RECIPE, FORBIDDEN),
    ("pt-1", READ_EXERCISE_LOGS, ALLOWED),
    ("pt-1", READ_MEALS, FORBIDDEN),
    ("pt-1", READ_HEALTH, ALLOWED),
    ("pt-1", READ_SLEEP, ALLOWED),
    ("pt-1", ADD_HEALTH, FORBIDDEN),
    # Cardiologist: reads every patient log, edits no recipes or exercises
    ("cardio-1", READ_MEALS, ALLOWED),
    ("cardio-1", READ_EXERCISE_LOGS, ALLOWED),
    ("cardio-1", READ_HEALTH, ALLOWED),
    ("cardio-1", READ_SLEEP, ALLOWED),
    ("cardio-1", READ_ANALYTICS, ALLOWED),
    ("cardio-1", ADD_RECIPE, FORBIDDEN),
    ("cardio-1", ADD_EXERCISE, FORBIDDEN),
    # Admins keep full access
    ("admin-1", ADD_RECIPE, ALLOWED),
    ("admin-1", ADD_EXERCISE, ALLOWED),
    ("super-1", ADD_RECIPE, ALLOWED),
    ("super-1", ADD_EXERCISE, ALLOWED),
])
def test_permission_boundaries(user_id, call, expected):
    method, path, kwargs = call
    assert _call(method, path, user_id, **kwargs).status_code == expected


@pytest.mark.parametrize("user_id", ["diet-1", "pt-1", "cardio-1"])
@pytest.mark.parametrize("method, path", [
    ("GET", "/api/admin/dashboard"),
    ("GET", "/api/admin/analytics"),
    ("GET", "/api/admin/broadcasts"),
    ("POST", "/api/admin/broadcasts"),
    ("DELETE", "/api/admin/broadcasts/b1"),
    ("PUT", f"/api/admin/users/{PATIENT_ID}/status"),
    ("GET", f"/api/admin/users/{PATIENT_ID}/timeline"),
    ("GET", "/api/admin/activity"),
])
def test_experts_cannot_use_admin_actions(user_id, method, path):
    assert _call(method, path, user_id, json={}).status_code == FORBIDDEN


@pytest.mark.parametrize("user_id, bucket, expected_403", [
    ("pt-1", "recipes", True),
    ("diet-1", "exercises", True),
    ("cardio-1", "recipes", True),
    ("cardio-1", "exercises", True),
])
def test_uploads_follow_expert_type(user_id, bucket, expected_403):
    res = _call("POST", "/api/upload/", user_id, data={"bucket": bucket}, files={"file": ("a.png", b"x", "image/png")})
    assert (res.status_code == FORBIDDEN) == expected_403


def test_unknown_expert_type_gets_nothing():
    PROFILES["odd-1"] = {"id": "odd-1", "role": "medical_expert", "expert_type": None, "account_status": "active"}
    try:
        for permissions in EXPERT_PERMISSIONS.values():
            for permission in permissions:
                assert not has_permission({"user_id": "odd-1", "role": "medical_expert"}, permission)
    finally:
        del PROFILES["odd-1"]


def test_patients_are_not_limited_by_expert_rules():
    assert _call(*READ_MEALS[:2], PATIENT_ID).status_code == ALLOWED
