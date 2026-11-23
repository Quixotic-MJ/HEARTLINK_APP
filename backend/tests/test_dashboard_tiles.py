"""The redesigned dashboard's check-in tile and "since yesterday" line."""
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


def test_the_dashboard_no_longer_sends_a_medicine_answer(monkeypatch):
    """HL-167 (panel revision): the check-in's medicine question was removed, so the tile shows the reading only."""
    monkeypatch.setattr(health_log_service, "get_health_logs", lambda uid, **k: [_log(True)])
    for name in ("get_meals_repo", "get_exercises_repo", "get_sleep_repo"):
        monkeypatch.setattr(dashboard, name, lambda: Empty())
    today = dashboard._get_today_activity(PATIENT_ID)
    assert "medication_taken" not in today and "medication_status" not in today


def _score(days_ago, hours_ago=0):
    return {"score": 80, "computed_at": (utc_now() - timedelta(days=days_ago, hours=hours_ago)).isoformat()}


def test_trend_since():
    assert dashboard._trend_since([_score(0)]) is None
    assert dashboard._trend_since([_score(0), _score(1)]) == "yesterday"
    assert dashboard._trend_since([_score(0), _score(4)]) == "earlier"
    assert dashboard._trend_since([_score(0), _score(0, hours_ago=0)]) == "today"
