"""HL-164 (panel revision): the health check before setup and the main goal. Someone with a condition HeartLink isn't
made for can only set up with their doctor's OK; the goal is saved with the other goals and can be changed later."""
import pytest

from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token
from tests.test_setup_score_flow import PATIENT_ID, SETUP, call, world  # noqa: F401  (world is a fixture)


@pytest.fixture
def goals(world, monkeypatch):  # noqa: F811
    baseline, _ = world
    saved = []
    baseline.update_thresholds = lambda user_id, data: saved.append(data) or data
    monkeypatch.setattr("app.services.analytics.get_baseline_repo", lambda: baseline)
    return baseline, saved


def test_setup_saves_the_health_check_and_the_goal(goals):
    baseline, thresholds = goals
    body = {**SETUP, "health_conditions": ["kidney_disease"], "doctor_cleared": True, "main_goal": "less_salt"}
    assert call("POST", "/baseline/complete", body).status_code == 201
    assert baseline.saved["health_conditions"] == ["kidney_disease"] and baseline.saved["doctor_cleared"] is True
    # The goal goes with the other goals, not the setup answers
    assert "main_goal" not in baseline.saved
    assert thresholds == [{"main_goal": "less_salt"}]


def test_no_conditions_needs_no_doctors_ok(goals):
    baseline, _ = goals
    body = {**SETUP, "health_conditions": [], "main_goal": "move_more"}
    assert call("POST", "/baseline/complete", body).status_code == 201
    assert baseline.saved["health_conditions"] == [] and "doctor_cleared" not in baseline.saved


@pytest.mark.parametrize("cleared", [None, False])
def test_a_condition_without_the_doctors_ok_is_refused(goals, cleared):
    baseline, _ = goals
    body = {**SETUP, "health_conditions": ["heart_disease", "pregnancy"], "doctor_cleared": cleared}
    assert call("POST", "/baseline/complete", body).status_code == 422
    assert baseline.saved == {}


def test_unknown_conditions_and_goals_are_refused(goals):
    assert call("POST", "/baseline/complete", {**SETUP, "health_conditions": ["flu"], "doctor_cleared": True}).status_code == 422
    assert call("POST", "/baseline/complete", {**SETUP, "main_goal": "get_rich"}).status_code == 422


def test_an_older_app_still_finishes_setup(goals):
    baseline, thresholds = goals
    assert call("POST", "/baseline/complete", SETUP).status_code == 201
    for key in ("health_conditions", "doctor_cleared", "main_goal"):
        assert key not in baseline.saved
    assert thresholds == []


def save_goals(body):
    token = create_access_token({"user_id": PATIENT_ID, "role": "patient"})
    client = TestClient(app, base_url="https://testserver")
    return client.put(f"/api/analytics/{PATIENT_ID}/thresholds", json=body, headers={"Authorization": f"Bearer {token}"})


def test_the_goal_can_be_changed_in_goals_and_limits(goals):
    _, thresholds = goals
    assert save_goals({"main_goal": "sleep_better"}).status_code == 200
    assert thresholds[-1] == {"main_goal": "sleep_better"}
    assert save_goals({"main_goal": "nope"}).status_code == 422
