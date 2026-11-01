"""Today's note with real numbers: the fact stays the title, the line under it says why, one step fits the time of
day, one weekly pattern, and the AI may only reword (checked)."""
import sys
from datetime import datetime, timedelta, timezone

from app.services import coach_note, dashboard
from app.services.dashboard import _generate_insight

# 6 pm in Manila
NOW = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)


def at(days_ago=0, hour_utc=2):
    return (NOW - timedelta(days=days_ago)).replace(hour=hour_utc).isoformat()


def facts(meals=(), exercises=(), vitals=(), sleep=0.0, limit=2000, goal=30, now=NOW):
    return coach_note.day_facts(
        meal_logs=list(meals), exercise_logs=list(exercises), vitals_logs=list(vitals),
        sleep_hours=sleep, sodium_limit=limit, movement_goal=goal, now=now,
    )


def scores(*values, factors=None):
    rows = [{"score": v, "computed_at": f"2026-10-{30 - i:02d}T01:00:00Z"} for i, v in enumerate(values)]
    if factors:
        rows[0]["contributing_factors"] = factors
    return rows


def test_a_meal_note_names_the_meal_and_whats_left(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    f = facts(meals=[{"meal_name": "Chicken adobo", "sodium_mg": 420, "logged_at": at()},
                     {"meal_name": "Pandesal", "sodium_mg": 820, "logged_at": at(hour_utc=0)}],
              vitals=[{"systolic_bp": 120, "diastolic_bp": 78, "logged_at": at()}])
    note = _generate_insight(scores(84, 82, factors={"source": "lifestyle_composite", "trigger": "meal_log"}), None, facts=f)
    assert note["title"] == "Up 2 from Chicken adobo."
    assert note["body"] == "It had 420 mg sodium. You have 760 mg of your 2,000 mg sodium limit left today."
    assert note["action"] is None


def test_little_sodium_left_offers_low_sodium_ideas(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    f = facts(meals=[{"meal_name": "Instant noodles", "sodium_mg": 1700, "logged_at": at()}],
              vitals=[{"systolic_bp": 120, "diastolic_bp": 78, "logged_at": at()}])
    note = _generate_insight(scores(78, 82, factors={"source": "lifestyle_composite", "trigger": "meal_log"}), None, facts=f)
    assert note["title"] == "Down 4 from Instant noodles."
    assert "300 mg of your 2,000 mg" in note["body"] and note["action"] == "low_sodium_ideas"


def test_an_evening_with_little_movement_suggests_a_walk(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    f = facts(meals=[{"meal_name": "Rice", "sodium_mg": 10, "logged_at": at()}],
              exercises=[{"duration_minutes": 10, "logged_at": at()}],
              vitals=[{"systolic_bp": 120, "diastolic_bp": 78, "logged_at": at()}], sleep=7)
    note = _generate_insight(scores(82, 82), None, facts=f)
    assert note["body"] == "You've moved 10 of 30 minutes today." and note["action"] == "start_walk"


def test_no_reading_today_asks_for_one_first(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    note = _generate_insight(scores(82, 82), None, facts=facts())
    assert note["action"] == "log_vitals" and "blood pressure" in note["body"]


def test_a_critical_score_keeps_its_own_words(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    note = _generate_insight(scores(40, 40), None, facts=facts())
    assert note["title"] == "Your score is in the critical range." and note["action"] == "log_vitals"


def test_an_emergency_note_is_never_changed(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    today = datetime.now(timezone.utc).isoformat()
    log = {"systolic_bp": 185, "diastolic_bp": 95, "logged_at": today}
    note = _generate_insight(scores(30, 82), log, facts=facts())
    assert note["action"] == "see_what_to_do" and note["pattern"] is None


def test_weekly_patterns():
    vit = [{"systolic_bp": s, "diastolic_bp": 80, "logged_at": at(d)} for d, s in [(0, 128), (1, 130), (2, 129), (8, 140), (9, 138), (10, 139)]]
    assert coach_note.weekly_pattern(facts(vitals=vit)) == "Your top number averaged 129 this week, 10 lower than last week."
    salty = [{"meal_name": "x", "sodium_mg": 2500, "logged_at": at(d)} for d in range(4)]
    assert coach_note.weekly_pattern(facts(meals=salty)) == "Sodium went over your limit on 4 of the 4 days you logged meals this week."
    walks = [{"duration_minutes": 35, "logged_at": at(d)} for d in range(5)]
    assert coach_note.weekly_pattern(facts(exercises=walks)) == "You reached your movement goal on 5 of the last 7 days."
    assert coach_note.weekly_pattern(facts()) is None


def test_the_ai_line_is_checked():
    note = "Up 2 from Chicken adobo. It had 420 mg sodium."
    ok = coach_note.checked_ai_line("Nice work, Ana! Your adobo had 420 mg sodium.", note)
    assert ok == "Nice work, Ana! Your adobo had 420 mg sodium."
    assert coach_note.checked_ai_line("Great! That's 500 mg less than yesterday.", note) is None  # new number
    assert coach_note.checked_ai_line("This may help treat your hypertension.", note) is None  # medical claim
    assert coach_note.checked_ai_line("<think>Let me see</think>Well done today.", note) == "Well done today."
    assert coach_note.checked_ai_line("<think>Let me think about the user's", note) is None  # only reasoning
    assert coach_note.checked_ai_line("Keep going, you are doing", note) is None  # cut off


class FakeGroq:
    reply = ""

    class Groq:
        def __init__(self, api_key, timeout):
            self.chat = self
            self.completions = self

        def create(self, **kwargs):
            message = type("M", (), {"content": FakeGroq.reply})
            return type("R", (), {"choices": [type("C", (), {"message": message})]})


def test_the_ai_keeps_the_title_and_a_rejected_line_falls_back(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setitem(sys.modules, "groq", FakeGroq)
    monkeypatch.setattr(dashboard, "_ai_insight_lines", {})
    monkeypatch.setattr(dashboard, "_ai_insight_calls", {})
    f = facts(meals=[{"meal_name": "Chicken adobo", "sodium_mg": 420, "logged_at": at()}],
              vitals=[{"systolic_bp": 120, "diastolic_bp": 78, "logged_at": at()}])
    hist = scores(84, 82, factors={"source": "lifestyle_composite", "trigger": "meal_log"})

    FakeGroq.reply = "Nice choice, Ana! Your adobo had 420 mg sodium, so 1,200 mg is left."
    note = _generate_insight(hist, None, "Ana", "u1", f)
    assert note["title"] == "Up 2 from Chicken adobo." and note["ai_written"] is False  # 1,200 isn't in the facts

    monkeypatch.setattr(dashboard, "_ai_insight_lines", {})
    FakeGroq.reply = "Nice choice, Ana! Your adobo had 420 mg sodium and 1,580 mg is still left today."
    note = _generate_insight(hist, None, "Ana", "u2", f)
    assert note["title"] == "Up 2 from Chicken adobo." and note["ai_written"] is True
    assert note["body"].startswith("Nice choice, Ana!")


# --- Each log shows its own points (the case from 2026-11-01) ------------------------------------------------

def rec(score, minutes_ago=0, days_ago=0, **factors):
    when = datetime.now(timezone.utc) - timedelta(days=days_ago, minutes=minutes_ago)
    return {"score": score, "computed_at": when.isoformat(), "contributing_factors": factors}


def comp(score, adj, trigger, **kw):
    return rec(score, source="lifestyle_composite", trigger=trigger, total_lifestyle_adjustment=adj, **kw)


YESTERDAY = [
    comp(79, 2, "meal_log", days_ago=1),
    comp(77, 0, "health_log", days_ago=1, minutes_ago=30),
    rec(77, days_ago=1, minutes_ago=31, trigger="health_log", reading_kind="other", previous_base=89),
]
READING_TODAY = [
    comp(74, 0, "health_log", minutes_ago=2),
    rec(74, minutes_ago=3, trigger="health_log", reading_kind="other", systolic=120, diastolic=80, previous_base=77),
]


def test_the_first_reading_of_the_day_shows_its_own_points_and_the_midnight_reset(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    history = READING_TODAY + YESTERDAY  # 79 yesterday -> 74 now: -3 from the reading, -2 habits reset
    note = _generate_insight(history, None)
    assert note["title"] == "Down 3 after your 120/80 reading."
    assert note["side_note"] == "Yesterday's +2 habit points reset at midnight, as they do every day."
    assert dashboard._score_parts(history) == {"readings": 74, "habits": 0, "habits_today": True}


def test_a_good_meal_after_it_says_up_2_whatever_yesterday_was(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    history = [comp(76, 2, "meal_log", minutes_ago=1)] + READING_TODAY + YESTERDAY
    note = _generate_insight(history, None)
    assert note["title"] == "Up 2 from your meal." and note["side_note"] is None
    assert dashboard._score_parts(history) == {"readings": 74, "habits": 2, "habits_today": True}


def test_medicine_points_from_a_check_in_are_told_apart_from_the_reading(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    today = [comp(76, 2, "health_log", minutes_ago=2)] + READING_TODAY[1:]
    note = _generate_insight(today + YESTERDAY, None)
    assert note["title"] == "Down 3 after your 120/80 reading."
    assert note["side_note"].startswith("Your check-in also added 2 habit points.")


def test_before_any_log_today_the_score_still_shows_yesterdays_habits():
    parts = dashboard._score_parts(YESTERDAY)
    assert parts == {"readings": 77, "habits": 2, "habits_today": False}
