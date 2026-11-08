"""HL-012: each expert type only reaches its own area; admin-only actions are closed to experts."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.recipes import RecipeReviewConflict
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
    # Keep real ownership checks; only data/service boundaries below are synthetic.
    monkeypatch.setattr("app.api.meals.meals.get_paginated_meal_logs", lambda *a, **k: {"data": []})
    monkeypatch.setattr("app.api.exercises.exercises.get_exercise_logs", lambda *a, **k: [])
    monkeypatch.setattr("app.api.health_logs.health_logs.get_paginated_health_logs", lambda *a, **k: {"data": []})
    monkeypatch.setattr("app.api.sleep_logs.sleep_logs.get_sleep_logs", lambda *a, **k: [])
    monkeypatch.setattr("app.api.analytics_api.analytics_api.get_analytics", lambda *a, **k: {"history": []})
    monkeypatch.setattr("app.api.recipes_api.recipes_api.create_recipe", lambda data, **k: {"id": "r1", "name": "Soup"})
    monkeypatch.setattr("app.api.recipes_api.recipes_api.get_recipe", lambda recipe_id: {"id": recipe_id, "name": "Soup", "status": "draft"})
    monkeypatch.setattr("app.api.recipes_api.recipes_api.update_recipe", lambda recipe_id, data, **k: {"id": recipe_id, "name": "Soup", "status": "draft"})
    monkeypatch.setattr("app.api.recipes_api.recipes_api.delete_recipe", lambda recipe_id: True)
    monkeypatch.setattr(
        "app.api.recipes_api.recipes_api.review_recipe",
        lambda recipe_id, **k: {"id": recipe_id, "name": "Soup", "status": "draft", "expert_validated": True},
        raising=False,
    )
    monkeypatch.setattr("app.api.recipes_api.recipes_api.record_admin_activity", lambda **k: None)
    monkeypatch.setattr("app.api.recipes_api.recipes_api.notify_waiting_content", lambda *a, **k: None)
    monkeypatch.setattr("app.api.exercises.exercises.create_routine", lambda data, **k: {"id": "e1", "name": "Walk"})
    monkeypatch.setattr("app.api.exercises.exercises.get_routines", lambda: [{"id": "e1", "status": "draft"}])
    monkeypatch.setattr("app.api.exercises.exercises.update_routine", lambda routine_id, data, **k: {"id": routine_id, "name": "Walk"})
    monkeypatch.setattr("app.api.exercises.exercises.review_routine", lambda routine_id, **k: {"id": routine_id, "name": "Walk"}, raising=False)
    monkeypatch.setattr("app.api.exercises.exercises.notify_waiting_content", lambda *a, **k: None)
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
EDIT_RECIPE = (
    "PUT",
    "/api/recipes/r1",
    {"json": {"name": "Revised soup", "expectedUpdatedAt": "2026-11-07T01:00:00+00:00"}},
)
DELETE_RECIPE = ("DELETE", "/api/recipes/r1", {})
REVIEW_RECIPE = (
    "POST",
    "/api/recipes/r1/review",
    {"json": {"decision": "approve", "expectedUpdatedAt": "2026-11-07T01:00:00+00:00"}},
)
ADD_EXERCISE = ("POST", "/api/exercises/", {"json": {"name": "Walk"}})
EDIT_EXERCISE = ("PUT", "/api/exercises/e1", {"json": {"name": "Walk", "expectedUpdatedAt": "revision-1"}})
REVIEW_EXERCISE = ("POST", "/api/exercises/e1/review", {"json": {"decision": "approve", "expectedUpdatedAt": "revision-1"}})
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
    # Dietitian: formally reviews recipes, but cannot author or publish them
    ("diet-1", ADD_RECIPE, FORBIDDEN),
    ("diet-1", EDIT_RECIPE, FORBIDDEN),
    ("diet-1", DELETE_RECIPE, FORBIDDEN),
    ("diet-1", REVIEW_RECIPE, ALLOWED),
    ("diet-1", ADD_EXERCISE, FORBIDDEN),
    ("diet-1", READ_MEALS, FORBIDDEN),
    ("diet-1", READ_EXERCISE_LOGS, FORBIDDEN),
    ("diet-1", READ_HEALTH, FORBIDDEN),
    ("diet-1", READ_SLEEP, FORBIDDEN),
    ("diet-1", READ_ANALYTICS, FORBIDDEN),
    ("diet-1", ADD_HEALTH, FORBIDDEN),
    ("diet-1", ADD_SLEEP, FORBIDDEN),
    # Physical Therapists review routines; only Admin authors them.
    ("pt-1", ADD_EXERCISE, FORBIDDEN),
    ("pt-1", EDIT_EXERCISE, FORBIDDEN),
    ("pt-1", REVIEW_EXERCISE, ALLOWED),
    ("diet-1", REVIEW_EXERCISE, FORBIDDEN),
    ("cardio-1", REVIEW_EXERCISE, FORBIDDEN),
    ("admin-1", REVIEW_EXERCISE, FORBIDDEN),
    ("pt-1", ADD_RECIPE, FORBIDDEN),
    ("pt-1", REVIEW_RECIPE, FORBIDDEN),
    ("pt-1", READ_EXERCISE_LOGS, FORBIDDEN),
    ("pt-1", READ_MEALS, FORBIDDEN),
    ("pt-1", READ_HEALTH, FORBIDDEN),
    ("pt-1", READ_SLEEP, FORBIDDEN),
    ("pt-1", ADD_HEALTH, FORBIDDEN),
    # Cardiologist: no consumer health access or specialty approval is assigned.
    ("cardio-1", READ_MEALS, FORBIDDEN),
    ("cardio-1", READ_EXERCISE_LOGS, FORBIDDEN),
    ("cardio-1", READ_HEALTH, FORBIDDEN),
    ("cardio-1", READ_SLEEP, FORBIDDEN),
    ("cardio-1", READ_ANALYTICS, FORBIDDEN),
    ("cardio-1", ADD_RECIPE, FORBIDDEN),
    ("cardio-1", REVIEW_RECIPE, FORBIDDEN),
    ("cardio-1", ADD_EXERCISE, FORBIDDEN),
    # Admins keep full access
    ("admin-1", ADD_RECIPE, ALLOWED),
    ("admin-1", EDIT_RECIPE, ALLOWED),
    ("admin-1", DELETE_RECIPE, ALLOWED),
    ("admin-1", REVIEW_RECIPE, FORBIDDEN),
    ("admin-1", ADD_EXERCISE, ALLOWED),
    ("admin-1", EDIT_EXERCISE, ALLOWED),
])
def test_permission_boundaries(user_id, call, expected):
    method, path, kwargs = call
    assert _call(method, path, user_id, **kwargs).status_code == expected


def test_stale_recipe_review_returns_conflict(monkeypatch):
    def stale(*args, **kwargs):
        raise RecipeReviewConflict()

    monkeypatch.setattr("app.api.recipes_api.recipes_api.review_recipe", stale)
    response = _call(*REVIEW_RECIPE[:2], "diet-1", **REVIEW_RECIPE[2])
    assert response.status_code == 409
    assert "changed after you opened it" in response.json()["detail"]


def test_stale_recipe_author_save_returns_conflict(monkeypatch):
    def stale(*args, **kwargs):
        raise RecipeReviewConflict()

    monkeypatch.setattr("app.api.recipes_api.recipes_api.update_recipe", stale)
    response = _call(*EDIT_RECIPE[:2], "admin-1", **EDIT_RECIPE[2])
    assert response.status_code == 409
    assert "changed after you opened it" in response.json()["detail"]


def test_recipe_author_save_requires_an_opened_revision():
    response = _call("PUT", "/api/recipes/r1", "admin-1", json={"name": "Unversioned"})
    assert response.status_code == 400
    assert response.json()["detail"].startswith("expectedUpdatedAt is required")


def test_routine_author_save_requires_an_opened_revision():
    assert _call("PUT", "/api/exercises/e1", "admin-1", json={"name": "Unversioned"}).status_code == 400


def test_stale_routine_review_returns_conflict(monkeypatch):
    from app.services.exercises import RoutineReviewConflict

    def stale(*args, **kwargs):
        raise RoutineReviewConflict()

    monkeypatch.setattr("app.api.exercises.exercises.review_routine", stale)
    assert _call(*REVIEW_EXERCISE[:2], "pt-1", **REVIEW_EXERCISE[2]).status_code == 409


@pytest.mark.parametrize("user_id", ["diet-1", "cardio-1", PATIENT_ID])
def test_other_roles_cannot_read_unpublished_routines(user_id):
    assert _call("GET", "/api/exercises/", user_id).json() == []


def test_deactivated_pt_cannot_read_unpublished_routines(monkeypatch):
    monkeypatch.setitem(PROFILES, "pt-1", {**PROFILES["pt-1"], "account_status": "deactivated"})
    assert _call("GET", "/api/exercises/", "pt-1").json() == []


@pytest.mark.parametrize("user_id", ["diet-1", "pt-1", "cardio-1"])
@pytest.mark.parametrize("method, path", [
    ("GET", "/api/admin/dashboard"),
    ("GET", "/api/admin/analytics"),
    ("GET", "/api/admin/broadcasts"),
    ("POST", "/api/admin/broadcasts"),
    ("DELETE", "/api/admin/broadcasts/b1"),
    ("PUT", f"/api/admin/users/{PATIENT_ID}/status"),
    ("GET", "/api/admin/activity"),
])
def test_experts_cannot_use_admin_actions(user_id, method, path):
    assert _call(method, path, user_id, json={}).status_code == FORBIDDEN


@pytest.mark.parametrize("user_id, bucket, expected_403", [
    ("diet-1", "recipes", True),
    ("pt-1", "recipes", True),
    ("diet-1", "exercises", True),
    ("pt-1", "exercises", True),
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
