"""Today's note on the new score: what the latest log really did, in real numbers."""
from datetime import datetime, timedelta, timezone

from app.services.dashboard import _generate_insight, _note_for_latest_event
from app.services.heart_score import METHOD_VERSION
from app.services.review_rules import FAINTED_SYMPTOM


def rec(score, minutes_ago=0, **factors):
    when = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return {"score": score, "computed_at": when.isoformat(), "contributing_factors": {"method": METHOD_VERSION, **factors}}


def reading_rec(score, sys_bp, dia_bp, kind):
    return rec(score, trigger="health_log", systolic=sys_bp, diastolic=dia_bp, reading_kind=kind)


def activity(minutes):
    return {"activity": {"points": 40, "minutes": minutes, "goal": 150}}


def note(history, log=None):
    return _note_for_latest_event(history, log)


def today_log(**fields):
    return {"logged_at": datetime.now(timezone.utc).isoformat(), **fields}


def test_an_emergency_reading_gets_the_emergency_note():
    title, body, icon, action = note([reading_rec(49, 185, 95, "emergency"), rec(75, 5)], today_log(systolic_bp=185, diastolic_bp=95))
    assert title == "Your reading 185/95 is at an emergency level."
    assert body == "If you feel unwell, call 911 now. HeartLink can't diagnose; please get checked in person."
    assert (icon, action) == ("alert-triangle", "see_what_to_do")


def test_an_emergency_symptom_gets_the_emergency_note_though_the_score_doesnt_move():
    log = today_log(symptoms=[FAINTED_SYMPTOM])
    title, _, _, action = note([rec(82, trigger="meal_log"), rec(82, 5)], log)
    assert title == "You logged symptoms at an emergency level." and action == "see_what_to_do"


def test_an_old_emergency_reading_no_longer_shows_the_emergency_note():
    old = {"systolic_bp": 185, "diastolic_bp": 95, "logged_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()}
    assert note([rec(60, trigger="meal_log"), rec(60, 5)], old)[3] != "see_what_to_do"


def test_the_ai_never_rewrites_an_emergency_note(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    result = _generate_insight([reading_rec(49, 185, 95, "emergency"), rec(75, 5)], today_log(systolic_bp=185, diastolic_bp=95), "Ana", "u1")
    assert result["action"] == "see_what_to_do" and result["ai_written"] is False


def test_a_healthy_reading_says_so():
    assert note([reading_rec(80, 118, 76, "healthy"), rec(78, 5)])[:2] == ("Your 118/76 reading is in the healthy range.", "Your score went up 2.")
    assert note([reading_rec(78, 118, 76, "healthy"), rec(78, 5)])[1] == "Your score stays at 78."
    assert note([reading_rec(76, 118, 76, "healthy"), rec(78, 5)])[1] == "Your score is now 76."


def test_a_high_reading_says_how_much_it_moved_and_asks_for_another_later():
    title, body, _, action = note([reading_rec(70, 135, 85, "other"), rec(73, 5)])
    assert title == "Down 3 after your 135/85 reading." and "only a little" in body and action == "log_later"
    assert note([reading_rec(73, 135, 85, "other"), rec(73, 5)])[0] == "Your 135/85 reading is above the healthy range."


def test_a_workout_shows_the_real_change():
    assert note([rec(75, trigger="exercise_log", areas=activity(120)), rec(73, 5)])[0] == "Up 2 from your workout: 120 of 150 minutes this week."


def test_a_workout_that_changes_nothing_says_so():
    title, body, _, action = note([rec(73, trigger="exercise_log", areas=activity(90)), rec(73, 5)])
    assert title == "No change yet: 90 of 150 minutes this week." and "whole week" in body and action is None


def test_past_the_goal_it_says_so():
    assert note([rec(73, trigger="exercise_log", areas=activity(160)), rec(73, 5)])[0] == "No change yet: 160 minutes this week, past the 150-minute goal."


def test_sleep_shows_the_average():
    areas = {"sleep": {"points": 70, "hours": 6.5}}
    assert note([rec(75, trigger="sleep_log", areas=areas), rec(73, 5)])[0] == "Up 2 from your sleep: 6.5 hours of sleep on average."
    assert note([rec(73, trigger="sleep_log", areas=areas), rec(73, 5)])[0] == "No change yet: 6.5 hours of sleep on average."


def test_a_meal_shows_sodium_days_once_there_are_enough():
    logged = {"diet": {"points": 50, "meal_days": 4, "sodium_days_over": 2}}
    assert note([rec(73, trigger="meal_log", areas=logged), rec(73, 5)])[0] == "No change yet: sodium over your limit on 2 of the last 7 days."
    early = {"diet": {"points": 50, "meal_days": 1, "sodium_days_over": 0}}
    assert note([rec(73, trigger="meal_log", areas=early), rec(73, 5)])[0] == "No change yet: 1 of 3 days of meals logged this week."


def test_a_salty_meal_points_to_meals():
    logged = {"diet": {"points": 50, "meal_days": 4, "sodium_days_over": 3}}
    title, _, _, action = note([rec(70, trigger="meal_log", areas=logged), rec(73, 5)])
    assert title.startswith("Down 3 after your meal:") and action == "review_meals"


def test_removing_a_log_says_what_it_did():
    title, body, _, _ = note([rec(70, trigger="exercise_delete", areas=activity(30)), rec(73, 5)])
    assert title == "Down 3 after removing your workout: 30 of 150 minutes this week."
    assert "last 7 days" in body


def test_no_recent_reading_asks_for_one():
    title, _, _, action = note([rec(79, trigger="daily_update", rule="no_recent_reading"), rec(85, 5)])
    assert "no recent blood pressure reading" in title and action == "log_vitals"


def test_moving_to_the_new_method_explains_itself(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    result = _generate_insight([rec(70, trigger="method_update"), {"score": 82, "computed_at": "2026-10-01T00:00:00Z"}], None)
    assert result["title"] == "Your Heart score was updated." and "Life's Essential 8" in result["body"]


def test_older_records_without_the_new_details_still_give_a_note():
    old = [{"score": 70, "computed_at": "2026-10-02T00:00:00Z"}, {"score": 73, "computed_at": "2026-10-01T00:00:00Z"}]
    assert note(old)[0] == "Your score went down 3."


STARTING = {"score": 92, "source": "baseline", "computed_at": "2026-10-01T00:00:00Z", "contributing_factors": {}}


def test_the_first_log_explains_the_move_from_the_starting_estimate(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    result = _generate_insight([rec(73, trigger="exercise_log", areas=activity(30)), STARTING], None)
    assert result["title"] == "Your score now comes from your logs." and "estimate" in result["body"]


def test_an_emergency_as_the_first_log_still_gets_the_emergency_note():
    title, _, _, action = note([reading_rec(49, 185, 95, "emergency"), STARTING], today_log(systolic_bp=185, diastolic_bp=95))
    assert title == "Your reading 185/95 is at an emergency level." and action == "see_what_to_do"


def test_after_the_first_log_notes_are_normal_again():
    assert note([rec(75, trigger="exercise_log", areas=activity(120)), rec(73, 5), STARTING])[0].startswith("Up 2 from your workout")
