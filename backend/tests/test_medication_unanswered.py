"""Migration 033: "I don't take any medicines" is saved as null and scores like "not taken"."""
import pytest
from fastapi.testclient import TestClient

import app.db.repositories as repos
import app.services.health_logs as health_log_service
from app.main import app
from app.services import dashboard
from app.services.hss_service import compute_lifestyle_composite_hss
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


@pytest.mark.parametrize("medication, points", [(True, 2), (False, 0), (None, 0)])
def test_score_gives_no_medication_points_for_no_medicines(monkeypatch, medication, points):
    recorded = {}

    class Hss:
        def list_hss_history(self, uid):
            return []

        def create_hss_record(self, uid, data):
            recorded.update(data)
            return data

    monkeypatch.setattr(health_log_service, "get_health_logs", lambda uid, **k: [_today_log(medication)])
    monkeypatch.setattr(repos, "get_hss_repo", lambda: Hss())
    for name in ("get_baseline_repo", "get_meals_repo", "get_exercises_repo", "get_sleep_repo"):
        monkeypatch.setattr(repos, name, lambda: Empty())
    compute_lifestyle_composite_hss(PATIENT_ID)
    assert recorded["contributing_factors"]["medication_points"] == points
