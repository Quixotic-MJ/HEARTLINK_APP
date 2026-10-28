"""How a reading moves the heart score, and what Today's note says about it.

Found in testing: setup gave 99, a perfect 118/76 reading "dropped" it to 90 (a reading replaced the score and the
best band is 90), and the note said "dropped by 7 … review today's meals" even after a meal raised it and after 185/95.
"""
from datetime import timedelta

import pytest

from app.services.dashboard import _generate_insight
from app.services.hss_service import (
    compute_vitals_hss, is_emergency_reading, latest_base_score, reading_kind, smoothed_base,
)
from app.utils.time import utc_now


def band(sys_bp, dia_bp, hr=72):
    return compute_vitals_hss(sys_bp, dia_bp, hr)[0]


def move(base, sys_bp, dia_bp, hr=72):
    b = band(sys_bp, dia_bp, hr)
    return smoothed_base(base, b, reading_kind(sys_bp, dia_bp, b))


# --- the score ------------------------------------------------------------------------------------------------

def test_a_healthy_reading_never_lowers_the_score():
    assert move(99, 118, 76) == 99
    assert move(70, 118, 76) == 77  # below the healthy band it climbs a third of the way


def test_other_readings_move_the_score_a_third_of_the_way():
    first = move(99, 134, 86)
    assert first == 89  # band 68: 99 - 31/3
    second = move(first, 134, 86)
    third = move(second, 134, 86)
    assert (second, third) == (82, 77)  # steady high readings still bring it down within days


@pytest.mark.parametrize("sys_bp, dia_bp, expected", [(185, 95, 20), (150, 122, 25), (85, 58, 35), (110, 55, 35)])
def test_an_emergency_reading_drops_the_score_straight_away(sys_bp, dia_bp, expected):
    assert move(99, sys_bp, dia_bp) == expected


def test_an_emergency_reading_never_raises_a_lower_score():
    assert move(15, 185, 95) == 15


def test_emergency_thresholds_are_unchanged():
    assert is_emergency_reading(180, 100) and is_emergency_reading(150, 120)
    assert is_emergency_reading(89, 70) and is_emergency_reading(110, 59)
    assert not is_emergency_reading(179, 119) and not is_emergency_reading(90, 60)


def test_the_base_is_the_newest_score_that_isnt_a_lifestyle_total():
    history = [
        {"score": 92, "contributing_factors": {"source": "lifestyle_composite"}},
        {"score": 90, "contributing_factors": {"trigger": "health_log"}},
        {"score": 99, "contributing_factors": {}},
    ]
    assert latest_base_score(history) == 90
    assert latest_base_score([]) is None
    assert smoothed_base(None, 68, "other") == 68


def test_after_an_emergency_good_habits_cant_lift_the_score_out_of_critical(monkeypatch):
    from app.services import hss_service
    import app.db.repositories as repos

    class Repo:
        saved = []

        def list_hss_history(self, uid, *a, **k):
            return [{"score": 35, "computed_at": utc_now().isoformat(),
                     "contributing_factors": {"trigger": "health_log", "reading_kind": "emergency"}}]

        def create_hss_record(self, uid, data):
            Repo.saved.append(data)
            return data

    class Rows:
        def __init__(self, rows=()):
            self.rows = list(rows)

        def __getattr__(self, _):
            return lambda *a, **k: self.rows

    now = utc_now().isoformat()
    monkeypatch.setattr(repos, "get_hss_repo", lambda: Repo())
    monkeypatch.setattr(repos, "get_meals_repo", lambda: Rows([{"logged_at": now, "sodium_mg": 50, "fiber_g": 8}] * 5))
    monkeypatch.setattr(repos, "get_exercises_repo", lambda: Rows([{"logged_at": now, "duration_minutes": 60}]))
    monkeypatch.setattr(repos, "get_sleep_repo", lambda: Rows([{"logged_at": now, "duration_hours": 8}]))
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: [])
    score, *_ = hss_service.compute_lifestyle_composite_hss("u1", trigger="meal_log")
    assert score == 35


# --- Today's note -----------------------------------------------------------------------------------------------

def rec(score, minutes_ago, **factors):
    return {"score": score, "computed_at": (utc_now() - timedelta(minutes=minutes_ago)).isoformat(),
            "contributing_factors": factors}


@pytest.fixture(autouse=True)
def no_ai(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)


def reading_event(score_after, base, sys_bp, dia_bp, kind, before):
    """A reading saves its base, then the day's total on top of it: newest first."""
    return [
        rec(score_after, 1, source="lifestyle_composite", trigger="health_log"),
        rec(base, 2, trigger="health_log", systolic=sys_bp, diastolic=dia_bp, reading_kind=kind),
        rec(before, 60),
    ]


def test_an_emergency_reading_gets_the_emergency_note_not_meals():
    log = {"systolic_bp": 185, "diastolic_bp": 95, "logged_at": utc_now().isoformat()}
    note = _generate_insight(reading_event(20, 20, 185, 95, "emergency", 99), log)
    assert note["title"] == "Your reading 185/95 is at an emergency level."
    assert note["action"] == "see_what_to_do" and "call 911" in note["body"]


def test_an_emergency_symptom_gets_the_emergency_note():
    log = {"symptoms": ["Shortness of Breath"], "context": "resting", "logged_at": utc_now().isoformat()}
    note = _generate_insight([rec(80, 1), rec(80, 60)], log)
    assert note["action"] == "see_what_to_do" and "symptoms" in note["title"]


def test_an_old_emergency_reading_no_longer_shows_the_emergency_note():
    log = {"systolic_bp": 185, "diastolic_bp": 95, "logged_at": (utc_now() - timedelta(days=2)).isoformat()}
    note = _generate_insight(reading_event(60, 60, 140, 90, "other", 60), log)
    assert note["action"] != "see_what_to_do"


def test_a_healthy_reading_says_so():
    note = _generate_insight(reading_event(99, 99, 118, 76, "healthy", 99), None)
    assert note["title"] == "Your 118/76 reading is in the healthy range."
    assert note["body"] == "Your score stays at 99." and note["action"] is None


def test_a_high_reading_says_how_much_it_moved_and_asks_for_another_later():
    note = _generate_insight(reading_event(89, 89, 134, 86, "other", 99), None)
    assert note["title"] == "Down 10 after your 134/86 reading." and note["action"] == "log_later"


def test_a_healthy_meal_says_up():
    history = [rec(92, 1, source="lifestyle_composite", trigger="meal_log"), rec(90, 30)]
    note = _generate_insight(history, None)
    assert note["title"] == "Up 2 from your meal." and note["action"] is None


def test_a_salty_meal_points_to_meals():
    history = [rec(87, 1, source="lifestyle_composite", trigger="meal_log"), rec(90, 30)]
    note = _generate_insight(history, None)
    assert note["title"] == "Down 3 after your meal." and note["action"] == "review_meals"


def test_the_ai_never_rewrites_an_emergency_note(monkeypatch):
    import sys

    class Boom:
        class Groq:
            def __init__(self, *a, **k):
                raise AssertionError("the AI must not be asked")

    monkeypatch.setenv("GROQ_API_KEY", "key")
    monkeypatch.setitem(sys.modules, "groq", Boom)
    log = {"systolic_bp": 185, "diastolic_bp": 95, "logged_at": utc_now().isoformat()}
    note = _generate_insight(reading_event(20, 20, 185, 95, "emergency", 99), log, "Ana", "u1")
    assert note["ai_written"] is False and note["action"] == "see_what_to_do"
