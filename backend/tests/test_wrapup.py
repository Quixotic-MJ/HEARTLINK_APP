"""HL-079: the 7-day wrap-up behind the app's Visit summary and Doctor consultation summary."""
import pytest
from fastapi.testclient import TestClient

from app.services import dashboard
from app.services.dashboard import get_7_day_wrap_up_data

# Asia/Manila is UTC+8: 23:40 UTC on Oct 20 is 07:40 AM on Oct 21 for the patient.
TODAY = "2026-10-27"
HEALTH = [
    {"logged_at": "2026-10-20T23:40:00+00:00", "systolic_bp": 130, "diastolic_bp": 85, "heart_rate_bpm": 72,
     "medication_taken": True, "symptoms": ["Chest discomfort"], "severity_map": {"Chest discomfort": 3}, "context": "resting"},
    # Saved with nothing filled in for symptoms (null instead of a list)
    {"logged_at": "2026-10-26T01:00:00+00:00", "systolic_bp": 120, "diastolic_bp": 80, "heart_rate_bpm": None,
     "symptoms": None, "severity_map": None, "context": None},
    # Older than 7 days: left out
    {"logged_at": "2026-10-10T01:00:00+00:00", "systolic_bp": 160, "diastolic_bp": 100},
]
MEALS = [
    {"logged_at": "2026-10-25T04:00:00+00:00", "meal_name": "Adobo", "sodium_mg": 900, "calories": 500,
     "saturated_fat_g": 6, "fiber_g": 2},
    {"logged_at": "2026-10-26T04:00:00+00:00", "meal_name": "Old meal", "sodium_mg": 999, "deleted_at": "2026-10-26T05:00:00+00:00"},
]
EXERCISE = [
    {"logged_at": "2026-10-24T10:00:00+00:00", "routine_name": "Walking", "duration_minutes": 20, "status": "completed"},
    {"logged_at": "2026-10-16T10:00:00+00:00", "routine_name": "Walking", "duration_minutes": 10, "status": "completed"},
]
SLEEP = [{"logged_at": "2026-10-26T22:00:00+00:00", "duration_hours": 7.5, "quality": "good"}]
HSS = [
    {"computed_at": "2026-10-15T00:00:00+00:00", "score": 70},
    {"computed_at": "2026-10-24T00:00:00+00:00", "score": 80},
]


class Rows:
    def __init__(self, **lists):
        self.lists = lists

    def __getattr__(self, name):
        return lambda *a, **k: self.lists.get(name, [])


@pytest.fixture
def data(monkeypatch):
    monkeypatch.setattr(dashboard, "get_profile_repo", lambda: Rows(get_by_id={"id": "pat"}))
    monkeypatch.setattr(dashboard, "get_meals_repo", lambda: Rows(list_user_meals=MEALS))
    monkeypatch.setattr(dashboard, "get_exercises_repo", lambda: Rows(list_user_logs=EXERCISE))
    monkeypatch.setattr(dashboard, "get_sleep_repo", lambda: Rows(list_user_logs=SLEEP))
    monkeypatch.setattr(dashboard, "get_hss_repo", lambda: Rows(list_hss_history=HSS))
    monkeypatch.setattr(dashboard, "get_content_repo", lambda: Rows(list_routines=[]))
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid: HEALTH)


def test_the_wrap_up_builds_for_the_last_seven_days(data):
    w = get_7_day_wrap_up_data("pat", TODAY)
    assert w["date_range"] == {"start": "Oct 21", "end": "Oct 27", "display": "Oct 21 – Oct 27"}
    assert [d["date"] for d in w["daily_records"]] == [f"Oct {d}" for d in range(21, 28)]
    assert w["vitals"]["avg_systolic"] == 125 and w["vitals"]["days_logged"] == 2
    assert w["nutrition"]["meals_recorded"] == 1 and w["nutrition"]["sodium_mg"] == 900
    assert w["movement"]["total_minutes"] == 20 and w["movement"]["trend_minutes"] == 10
    assert w["sleep"]["avg_hours"] == 7.5
    assert w["stability"]["records"][-1] == {"date": "Oct 27", "score": 80}
    assert w["overview"]["symptom_count"] == 1


def test_times_are_the_patients_local_time(data):
    w = get_7_day_wrap_up_data("pat", TODAY)
    first_day = w["daily_records"][0]
    assert first_day["date"] == "Oct 21"
    assert first_day["vitals"][0]["time"] == "07:40 AM"
    assert first_day["symptoms"][0] == {"date": "Oct 21", "time": "07:40 AM", "name": "Chest discomfort", "severity": 3, "context": "resting"}


def test_a_check_in_without_symptoms_does_not_break_it(data):
    w = get_7_day_wrap_up_data("pat", TODAY)
    oct26 = next(d for d in w["daily_records"] if d["date"] == "Oct 26")
    assert oct26["vitals"][0]["systolic"] == 120 and oct26["symptoms"] == []


def test_a_bad_date_falls_back_to_today(data):
    assert get_7_day_wrap_up_data("pat", "not-a-date")["date_range"]["display"]


def test_the_endpoint_answers(data):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes
    import app.utils.security as security

    revoked_token_hashes.clear()
    original = security.get_profile_repo
    security.get_profile_repo = lambda: Rows(get_by_id={"id": "pat", "role": "patient", "account_status": "active"})
    try:
        token = create_access_token({"user_id": "pat", "role": "patient"})
        res = TestClient(app).get(f"/api/dashboard/wrapup?local_date={TODAY}", headers={"Authorization": f"Bearer {token}"})
    finally:
        security.get_profile_repo = original
    assert res.status_code == 200
    assert res.json()["date_range"]["end"] == "Oct 27"
