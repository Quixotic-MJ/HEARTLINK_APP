"""HL-156: strict daily limits. Patients can't raise (or change) their sodium limit; the care team can only lower it."""
import pytest
from fastapi.testclient import TestClient

from app.api.analytics_api import analytics_api
from app.main import app
from app.utils.security import get_current_user

PATIENT = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def client(monkeypatch):
    saved = []
    monkeypatch.setattr(analytics_api, "update_thresholds", lambda uid, data: saved.append((uid, data)) or data)
    monkeypatch.setattr(analytics_api, "verify_user_access", lambda user, uid: None)
    monkeypatch.setattr(analytics_api, "check_expert_permission", lambda user, perm: None)
    before = dict(app.dependency_overrides)

    def as_role(role):
        app.dependency_overrides[get_current_user] = lambda: {"user_id": PATIENT if role == "patient" else "expert-1", "role": role}
        return TestClient(app)

    yield as_role, saved
    app.dependency_overrides.clear()
    app.dependency_overrides.update(before)


def put(c, body):
    return c.put(f"/api/analytics/{PATIENT}/thresholds", json=body)


def test_a_patient_can_save_their_movement_goal(client):
    as_role, saved = client
    res = put(as_role("patient"), {"active_minutes_goal": 45})
    assert res.status_code == 200
    assert saved == [(PATIENT, {"active_minutes_goal": 45})]  # nothing else is overwritten


@pytest.mark.parametrize("sodium", [2300, 5000, 1200])
def test_a_patient_cant_change_their_sodium_limit(client, sodium):
    as_role, saved = client
    res = put(as_role("patient"), {"sodium_limit_mg": sodium, "active_minutes_goal": 30})
    assert res.status_code == 403
    assert "care team" in res.json()["detail"]
    assert saved == []


def test_an_older_app_sending_the_guideline_value_still_saves(client):
    """Older app builds send every field; the guideline value is quietly left out."""
    as_role, saved = client
    res = put(as_role("patient"), {"sodium_limit_mg": 1500, "active_minutes_goal": 30, "fluid_limit_ml": 2000,
                                   "systolic_threshold": 120, "diastolic_threshold": 80})
    assert res.status_code == 200
    assert "sodium_limit_mg" not in saved[0][1] and saved[0][1]["active_minutes_goal"] == 30


def test_the_care_team_can_only_set_a_stricter_limit(client):
    as_role, saved = client
    expert = as_role("medical_expert")
    assert put(expert, {"sodium_limit_mg": 1200}).status_code == 200
    assert saved[-1] == (PATIENT, {"sodium_limit_mg": 1200})
    res = put(expert, {"sodium_limit_mg": 2000})
    assert res.status_code == 400 and "stricter" in res.json()["detail"]
