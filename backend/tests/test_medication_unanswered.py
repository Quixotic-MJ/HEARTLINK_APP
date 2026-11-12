"""Migration 033: "I don't take any medicines" is saved as null and scores like "not taken"."""
import pytest
from fastapi.testclient import TestClient

import app.db.repositories as repos
import app.services.health_logs as health_log_service
from app.main import app
from app.services import dashboard
from app.utils.security import create_access_token, revoked_token_hashes
from app.utils.time import utc_now

PATIENT_ID = "11111111-1111-1111-1111-111111111111"


class FakeProfileRepo:
    def get_by_id(self, user_id):
        return {"id": PATIENT_ID, "role": "patient", "account_status": "active"} if user_id == PATIENT_ID else None


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


@pytest.fixture
def saved(monkeypatch):
    rows = []
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: FakeProfileRepo())
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    monkeypatch.setattr("app.api.health_logs.health_logs.verify_user_access", lambda *a, **k: None)
    monkeypatch.setattr("app.api.health_logs.health_logs.create_health_log", lambda uid, data: rows.append(dict(data)) or {"id": "h1", **data})
    # Other test modules install app-wide dependency overrides at import time; use the real guards here.
    overrides = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield rows
    app.dependency_overrides.update(overrides)
    revoked_token_hashes.clear()


def _post(body):
    token = create_access_token({"user_id": PATIENT_ID, "role": "patient"})
    client = TestClient(app, base_url="https://testserver")
    return client.post(f"/api/health-logs/{PATIENT_ID}", json=body, headers={"Authorization": f"Bearer {token}"})


@pytest.mark.parametrize("answer", [True, False, None])
def test_each_medicine_answer_is_saved_as_sent(saved, answer):
    res = _post({"medication_taken": answer, "symptoms": ["None (Feeling fine)"]})
    assert res.status_code == 200
    assert saved[0]["medication_taken"] is answer


def test_a_medicine_answer_that_is_not_yes_no_or_empty_is_refused(saved):
    res = _post({"medication_taken": "yes"})
    assert res.status_code == 422
    assert saved == []


def _today_log(medication):
    return {"logged_at": utc_now().isoformat(), "medication_taken": medication, "symptoms": []}


class Empty:
    def __getattr__(self, name):
        return lambda *a, **k: []


@pytest.mark.parametrize("medication, expected", [(True, True), (False, False), (None, False)])
def test_dashboard_counts_no_medicines_as_not_taken(monkeypatch, medication, expected):
    monkeypatch.setattr(health_log_service, "get_health_logs", lambda uid, **k: [_today_log(medication)])
    for name in ("get_meals_repo", "get_exercises_repo", "get_sleep_repo"):
        monkeypatch.setattr(dashboard, name, lambda: Empty())
    assert dashboard._get_today_activity(PATIENT_ID)["medication_taken"] is expected


# --- HL-156: the latest weight ------------------------------------------------------------------------

class WeightProfiles(FakeProfileRepo):
    def __init__(self, fail=False):
        self.updates, self.fail = [], fail

    def update(self, user_id, data):
        if self.fail:
            raise RuntimeError("db down")
        self.updates.append((user_id, data))
        return data


@pytest.mark.parametrize("fail", [False, True])
def test_a_check_in_weight_becomes_the_profile_weight(saved, monkeypatch, fail):
    """The Cardiologist: use the latest weight, not an average. A failed update never breaks the check-in."""
    profiles = WeightProfiles(fail)
    monkeypatch.setattr(repos, "get_profile_repo", lambda: profiles)
    res = _post({"weight_kg": 71.5, "medication_taken": True})
    assert res.status_code in (200, 201)
    assert saved and saved[-1]["weight_kg"] == 71.5
    assert profiles.updates == ([] if fail else [(PATIENT_ID, {"weight_kg": 71.5})])


def test_a_check_in_without_weight_leaves_the_profile_alone(saved, monkeypatch):
    profiles = WeightProfiles()
    monkeypatch.setattr(repos, "get_profile_repo", lambda: profiles)
    _post({"medication_taken": True})
    assert profiles.updates == []
