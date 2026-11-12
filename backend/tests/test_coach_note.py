"""Today's note with real numbers: the fact stays the title, the line under it says why, one step fits the time of
day, the AI may only reword (checked), and the week's patterns are for Trends."""
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
    assert note["title"] == "Your score is in the lowest range." and note["action"] == "log_vitals"


def test_an_emergency_note_is_never_changed(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    today = datetime.now(timezone.utc).isoformat()
    log = {"systolic_bp": 185, "diastolic_bp": 95, "logged_at": today}
    note = _generate_insight(scores(30, 82), log, facts=facts())
    assert note["action"] == "see_what_to_do" and "pattern" not in note


def line(kind, f):
    return next((x["text"] for x in coach_note.weekly_insights(f) if x["kind"] == kind), None)


def test_weekly_insights_for_blood_pressure():
    def readings(*rows):
        return facts(vitals=[{"systolic_bp": s, "diastolic_bp": 80, "logged_at": at(d)} for d, s in rows])

    this_week = [(0, 128), (1, 130), (2, 129)]
    assert line("pressure", readings(*this_week)) == "Your top number averaged 129 this week."
    assert line("pressure", readings(*this_week, (8, 140), (9, 138), (10, 139))) == "Your top number averaged 129 this week, 10 lower than last week."
    assert line("pressure", readings(*this_week, (8, 120), (9, 118), (10, 119))) == "Your top number averaged 129 this week, 10 higher than last week."
    assert line("pressure", readings(*this_week, (8, 130), (9, 128), (10, 129))) == "Your top number averaged 129 this week, about the same as last week."
    assert line("pressure", readings((0, 128), (1, 130))) is None  # 2 readings aren't enough


def test_weekly_insights_for_sodium_and_movement():
    def meals(mg, count):
        return facts(meals=[{"meal_name": "x", "sodium_mg": mg, "logged_at": at(d)} for d in range(count)])

    assert line("sodium", meals(2500, 4)) == "Sodium went over your limit on 4 of the 4 days you logged meals this week."
    assert line("sodium", meals(500, 3)) == "Sodium stayed within your limit on all 3 days you logged meals this week."
    assert line("sodium", meals(2500, 2)) is None  # 2 days aren't enough
    walks = [{"duration_minutes": 35, "logged_at": at(d)} for d in range(5)]
    assert line("movement", facts(exercises=walks)) == "You reached your movement goal on 5 of the last 7 days."
    assert coach_note.weekly_insights(facts()) == []


def test_todays_note_stays_about_today(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    vit = [{"systolic_bp": 128, "diastolic_bp": 78, "logged_at": at(d)} for d in range(3)]
    walks = [{"duration_minutes": 35, "logged_at": at(d)} for d in range(5)]
    note = _generate_insight(scores(82, 82), None, facts=facts(vitals=vit, exercises=walks, sleep=7))
    assert "pattern" not in note
    assert "this week" not in note["body"] and "last 7 days" not in note["body"]


def test_the_ai_line_is_checked():
    note = "Up 2 from Chicken adobo. It had 420 mg sodium."
    ok = coach_note.checked_ai_line("Nice work, Ana! Your adobo had 420 mg sodium.", note)
    assert ok == "Nice work, Ana! Your adobo had 420 mg sodium."
    assert coach_note.checked_ai_line("Great! That's 500 mg less than yesterday.", note) is None  # new number
    assert coach_note.checked_ai_line("This may help treat your hypertension.", note) is None  # medical claim
    assert coach_note.checked_ai_line("<think>Let me see</think>Well done today.", note) == "Well done today."
    assert coach_note.checked_ai_line("<think>Let me think about the user's", note) is None  # only reasoning
    assert coach_note.checked_ai_line("Keep going, you are doing", note) is None  # cut off


def test_trends_gets_the_weekly_insights_for_short_and_long_periods(monkeypatch):
    """Errors here are hidden from the patient (Trends still loads), so both paths are run for real."""
    from types import SimpleNamespace

    import app.db.repositories as repositories
    from app.services import analytics, health_logs

    now = datetime.now(timezone.utc)
    logged = lambda days: (now - timedelta(days=days)).isoformat()  # noqa: E731
    vitals = [{"systolic_bp": 128, "diastolic_bp": 78, "logged_at": logged(d)} for d in range(3)]
    walks = [{"duration_minutes": 35, "logged_at": logged(d)} for d in range(2)]
    meals = [{"meal_name": "x", "sodium_mg": 500, "logged_at": logged(d)} for d in range(3)]
    targets = {"sodium_mg": {"value": 1500}}
    expected = ["pressure", "sodium", "movement"]

    # 30 days: the logs Trends already loaded are enough
    long_period = analytics._weekly_insights("pat", 30, vitals, walks, meals, {"active_minutes_goal": 30}, targets)
    assert [x["kind"] for x in long_period] == expected

    # 7 days: loads two weeks itself, and uses those instead of the short list it was given
    monkeypatch.setattr(health_logs, "get_health_logs", lambda user_id, cutoff=None: vitals)
    monkeypatch.setattr(repositories, "get_exercises_repo", lambda: SimpleNamespace(list_user_logs=lambda user_id, cutoff=None: walks))
    monkeypatch.setattr(repositories, "get_meals_repo", lambda: SimpleNamespace(list_user_meals=lambda user_id, cutoff=None: meals))
    short_period = analytics._weekly_insights("pat", 7, [], [], [], None, targets)
    assert [x["kind"] for x in short_period] == expected


def test_weekly_report_status_counts_days_with_a_log():
    logs = {
        "meals": [{"logged_at": at(0)}, {"logged_at": at(0, hour_utc=5)}],  # the same day counts once
        "exercises": [{"logged_at": at(1)}, {"logged_at": at(2), "status": "abandoned"}],
        "vitals": [{"logged_at": at(3)}, {"logged_at": at(4), "deleted_at": "2026-10-30"}],
        "sleep": [{"logged_at": at(5)}, {"logged_at": at(6), "is_deleted": True}, {"logged_at": at(7)}],
    }
    status = coach_note.weekly_report_status(logs, at(10), now=NOW)
    assert status == {"logged_days": 4, "account_age_days": 10}  # today, 1, 3 and 5 days ago; 7 days ago is too old


def test_weekly_report_status_without_a_signup_date_is_not_old_enough():
    assert coach_note.weekly_report_status({}, None, now=NOW) == {"logged_days": 0, "account_age_days": 0}
