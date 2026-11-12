"""The AI summary on Trends (app/services/progress_summary.py): facts from the patient's own logs, plain sentences, and
an AI rewording that is only shown when it adds no number, medical word or advice."""
import sys
from datetime import datetime, timedelta, timezone

import pytest

from app.services import progress_summary as ps

NOW = datetime(2026, 11, 12, 4, 0, tzinfo=timezone.utc)  # noon in Manila


def at(days_ago, hour_utc=2):
    return (NOW - timedelta(days=days_ago)).replace(hour=hour_utc).isoformat()


def facts(days=7, vitals=(), meals=(), exercises=(), sleep=(), scores=(), limit=1500, goal=30):
    return ps.period_facts(
        days=days, vitals_logs=list(vitals), meal_logs=list(meals), exercise_logs=list(exercises), sleep_logs=list(sleep),
        scores=list(scores), sodium_limit=limit, movement_goal=goal, now=NOW,
    )


def test_nothing_logged_gives_no_summary():
    f = facts()
    assert f["logged_days"] == 0 and ps.summary_lines(f) == []


def test_the_facts_compare_this_period_with_the_one_before():
    vitals = [{"systolic_bp": 130, "diastolic_bp": 80, "logged_at": at(d)} for d in range(3)]
    vitals += [{"systolic_bp": 140, "diastolic_bp": 85, "logged_at": at(d)} for d in range(8, 11)]
    meals = [{"sodium_mg": 1200, "logged_at": at(0)}, {"sodium_mg": 2000, "logged_at": at(1)}]
    walks = [{"duration_minutes": 35, "logged_at": at(d)} for d in range(2)] + [{"duration_minutes": 50, "status": "abandoned", "logged_at": at(3)}]
    sleep = [{"duration_hours": 7, "logged_at": at(1)}, {"duration_hours": 8, "logged_at": at(2)}]
    scores = [{"score": 62, "computed_at": at(6)}, {"score": 66, "computed_at": at(0, 1)}, {"score": 68, "computed_at": at(0, 3)}]
    f = facts(vitals=vitals, meals=meals, exercises=walks, sleep=sleep, scores=scores)
    assert f["bp"] == {"readings": 3, "top": 130, "bottom": 80}
    assert f["bp_before"]["top"] == 140
    assert (f["meal_days"], f["sodium_within_days"]) == (2, 1)
    assert (f["movement_days"], f["goal_days"], f["movement_minutes"]) == (2, 2, 70)  # the abandoned workout doesn't count
    assert (f["sleep_nights"], f["sleep_avg_hours"]) == (2, 7.5)
    assert (f["score_start"], f["score_end"]) == (62, 68)  # the last score of each day
    assert f["logged_days"] == 3

    lines = ps.summary_lines(f)
    assert lines[0] == "You logged something on 3 of the last 7 days."
    assert "Your habits score went from 62 to 68." in lines
    assert "Your blood pressure averaged 130/80 over 3 readings, 10 lower on top than the 7 days before." in lines
    assert "Sodium stayed within your 1,500 mg limit on 1 of the 2 days you logged meals." in lines
    assert "You slept 7.5 hours a night on average over 2 nights." in lines


def test_deleted_logs_dont_count():
    f = facts(vitals=[{"systolic_bp": 130, "diastolic_bp": 80, "logged_at": at(0), "deleted_at": at(0)}])
    assert f["bp"] is None and f["logged_days"] == 0


FACTS = "You logged something on 3 of the last 7 days. Your habits score went from 62 to 68."


@pytest.mark.parametrize(
    "text, ok",
    [
        ("Ana, you logged on 3 of the last 7 days, and your habits score rose from 62 to 68.", True),
        ("You logged on 4 of the last 7 days.", False),  # a changed number
        ("Your score went up, so your hypertension treatment is working.", False),  # a medical word
        ("You logged on 3 days. You should try to walk more.", False),  # advice
        ("Great week! Keep up the logging.", False),  # advice, even when friendly
        ("You logged on 3 of the last 7 days, which lowers your risk.", False),  # the Heart risk isn't its topic
        ("<think>Let me count</think>You logged on 3 of the last 7 days.", True),
        ("You logged on 3 of the last 7 days and", False),  # cut off
    ],
)
def test_the_ai_summary_is_checked(text, ok):
    result = ps.checked_summary(text, FACTS)
    assert (result is not None) == ok


class FakeGroq:
    calls = 0
    reply = ""

    class Groq:
        def __init__(self, api_key, timeout):
            self.chat = self
            self.completions = self

        def create(self, **kwargs):
            FakeGroq.calls += 1
            message = type("M", (), {"content": FakeGroq.reply})
            return type("R", (), {"choices": [type("C", (), {"message": message})]})


@pytest.fixture
def ai(monkeypatch):
    FakeGroq.calls = 0
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setitem(sys.modules, "groq", FakeGroq)
    monkeypatch.setattr(ps, "_ai_summaries", {})
    monkeypatch.setattr(ps, "_ai_summary_calls", {})
    return FakeGroq


def logged():
    return facts(scores=[{"score": 62, "computed_at": at(6)}, {"score": 68, "computed_at": at(0)}],
                 vitals=[{"systolic_bp": 130, "diastolic_bp": 80, "logged_at": at(d)} for d in range(3)])


def test_a_safe_ai_summary_is_shown_and_reused_for_the_day(ai):
    ai.reply = "Ana, you logged on 3 of the last 7 days and your habits score went from 62 to 68."
    first = ps.summarize(logged(), "Ana", "u1", now=NOW)
    again = ps.summarize(logged(), "Ana", "u1", now=NOW)
    assert first["ai_written"] and first["text"] == ai.reply == again["text"]
    assert first["lines"] and ai.calls == 1


def test_an_unsafe_ai_summary_falls_back_to_the_plain_lines(ai):
    ai.reply = "Your blood pressure is 120/75 now, so you should keep walking."
    result = ps.summarize(logged(), "Ana", "u1", now=NOW)
    assert result["ai_written"] is False and result["text"] == " ".join(result["lines"])


def test_without_an_ai_key_the_plain_lines_show(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    result = ps.summarize(logged(), "Ana", "u1", now=NOW)
    assert result["ai_written"] is False and result["text"].startswith("You logged something on 3 of the last 7 days.")


def test_after_the_daily_cap_the_plain_lines_show(ai, monkeypatch):
    monkeypatch.setattr(ps, "AI_SUMMARY_DAILY_CAP", 1)
    ai.reply = "Ana, you logged on 3 of the last 7 days."
    ps.summarize(logged(), "Ana", "u1", now=NOW)
    other = ps.summarize(facts(days=14, scores=[{"score": 60, "computed_at": at(1)}],
                               vitals=[{"systolic_bp": 120, "diastolic_bp": 80, "logged_at": at(1)}]), "Ana", "u1", now=NOW)
    assert ai.calls == 1 and other["ai_written"] is False


def test_the_endpoint_only_takes_7_14_or_30_days():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.utils.security import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "role": "patient"}
    try:
        res = TestClient(app).get("/api/analytics/u1/summary?days=90")
        assert res.status_code == 400
    finally:
        app.dependency_overrides.pop(get_current_user, None)
