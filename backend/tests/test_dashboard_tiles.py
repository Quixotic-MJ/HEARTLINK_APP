"""The redesigned dashboard's medicine tile and "since yesterday" line."""
from datetime import timedelta

import pytest

import app.services.health_logs as health_log_service
from app.services import dashboard
from app.utils.time import utc_now

PATIENT_ID = "11111111-1111-1111-1111-111111111111"


class Empty:
    def __getattr__(self, name):
        return lambda *a, **k: []


def _log(medication, days_ago=0):
    return {"logged_at": (utc_now() - timedelta(days=days_ago)).isoformat(), "medication_taken": medication, "symptoms": []}


def _status(monkeypatch, logs):
    monkeypatch.setattr(health_log_service, "get_health_logs", lambda uid, **k: logs)
    for name in ("get_meals_repo", "get_exercises_repo", "get_sleep_repo"):
        monkeypatch.setattr(dashboard, name, lambda: Empty())
    return dashboard._get_today_activity(PATIENT_ID)["medication_status"]


@pytest.mark.parametrize("medication, expected", [(True, "taken"), (False, "not_yet"), (None, "none")])
def test_medicine_status_follows_todays_answer(monkeypatch, medication, expected):
    assert _status(monkeypatch, [_log(medication)]) == expected


def test_no_medicines_answered_on_an_earlier_day_still_counts_today(monkeypatch):
    assert _status(monkeypatch, [_log(None, days_ago=2), _log(False, days_ago=5)]) == "none"


def test_taking_medicine_again_after_saying_none(monkeypatch):
    assert _status(monkeypatch, [_log(None, days_ago=3), _log(True)]) == "taken"


def test_nothing_logged_yet(monkeypatch):
    assert _status(monkeypatch, []) == "not_yet"


def _score(days_ago, hours_ago=0):
    return {"score": 80, "computed_at": (utc_now() - timedelta(days=days_ago, hours=hours_ago)).isoformat()}


def test_trend_since():
    assert dashboard._trend_since([_score(0)]) is None
    assert dashboard._trend_since([_score(0), _score(1)]) == "yesterday"
    assert dashboard._trend_since([_score(0), _score(4)]) == "earlier"
    assert dashboard._trend_since([_score(0), _score(0, hours_ago=0)]) == "today"
