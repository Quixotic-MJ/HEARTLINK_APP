"""The Heart score, based on Life's Essential 8: every table boundary, limit, floor, missing area and worked example."""
from datetime import datetime, timedelta, timezone

import pytest

from app.services import heart_score as hs
from app.services.hss_service import determine_tier, is_emergency_reading

# 6 pm in Manila
NOW = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)


def at(days_ago=0):
    return (NOW - timedelta(days=days_ago)).isoformat()


def reading(sys_bp, dia_bp, days_ago=0):
    return {"systolic_bp": sys_bp, "diastolic_bp": dia_bp, "logged_at": at(days_ago)}


ANSWERS = {
    "created_at": at(60),
    "ever_smoked": False,
    "smoke_now": None,
    "fruit_veg_servings": "4-5",
    "fried_food_freq": "rarely",
    "salty_food_freq": "rarely",
}
PROFILE = {"height_cm": 170, "weight_kg": 62}  # BMI 21.5


def score(**kw):
    args = {
        "baseline": ANSWERS, "profile": PROFILE, "health_logs": [], "exercise_logs": [], "sleep_logs": [],
        "meal_logs": [], "routines": [], "sodium_limit": 1500.0, "now": NOW,
    }
    return hs.score_from(**{**args, **kw})


# ── The tables ────────────────────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sys_bp,dia_bp,points", [
    (119, 79, 100), (120, 79, 75), (129, 79, 75), (119, 80, 50), (130, 70, 50), (139, 89, 50),
    (140, 70, 25), (119, 90, 25), (159, 99, 25), (160, 70, 0), (119, 100, 0),
])
def test_blood_pressure_points(sys_bp, dia_bp, points):
    assert hs.bp_points(sys_bp, dia_bp) == points


@pytest.mark.parametrize("minutes,points", [
    (0, 0), (1, 20), (29, 20), (30, 40), (59, 40), (60, 60), (89, 60), (90, 80), (119, 80), (120, 90), (149, 90),
    (150, 100), (400, 100),
])
def test_activity_points(minutes, points):
    assert hs.activity_points(minutes) == points


@pytest.mark.parametrize("hours,points", [
    (3.9, 0), (4, 20), (4.9, 20), (5, 40), (5.9, 40), (6, 70), (6.9, 70), (7, 100), (8.9, 100), (9, 90), (9.9, 90),
    (10, 40), (12, 40),
])
def test_sleep_points(hours, points):
    assert hs.sleep_points(hours) == points


@pytest.mark.parametrize("ever,now,quit_when,points", [
    (False, None, None, 100),
    (True, "Not at all", "5_plus_years", 75),
    (True, "Not at all", "1_to_5_years", 50),
    (True, "Not at all", "under_1_year", 25),
    (True, "Not at all", None, 25),  # no date yet: the cautious answer until they say in Settings
    (True, "Some days", None, 0),
    (True, "Every day", None, 0),
])
def test_nicotine_points(ever, now, quit_when, points):
    assert hs.nicotine_points(ever, now, quit_when) == points


@pytest.mark.parametrize("bmi,points", [
    (18.5, 100), (22.9, 100), (23, 75), (24.9, 75), (25, 50), (29.9, 50), (30, 25), (34.9, 25), (35, 0),
])
def test_body_weight_points(bmi, points):
    assert hs.bmi_points(bmi) == points


def test_underweight_has_no_points_until_a_reviewer_decides():
    assert hs.bmi_points(18.4) is None
    result = score(profile={"height_cm": 170, "weight_kg": 50})
    assert "body_weight" not in result["areas"]


@pytest.mark.parametrize("fruit,fried,sodium,points", [
    ("4-5", "rarely", 2, 100), ("6+", "rarely", 2, 100),
    ("2-3", "rarely", 2, 80),
    ("2-3", "sometimes", 2, 50), ("2-3", "sometimes", 1, 50),
    ("0-1", "sometimes", 1, 25), ("0-1", "often", 1, 25),
    ("0-1", "daily", 0, 0),
])
def test_diet_points(fruit, fried, sodium, points):
    assert hs.diet_points(fruit, fried, sodium) == points


def test_diet_needs_all_three_habits():
    assert hs.diet_points(None, "rarely", 2) is None
    assert hs.diet_points("4-5", None, 2) is None
    assert hs.diet_points("4-5", "rarely", None) is None


@pytest.mark.parametrize("over,days,salty,points", [
    (0, 3, "daily", 2), (1, 3, "rarely", 1), (2, 5, "rarely", 1), (3, 5, "rarely", 0),
    (0, 2, "rarely", 2), (2, 2, "sometimes", 1), (2, 2, "daily", 0),  # under 3 days of meals: the setup answer
])
def test_sodium_uses_meals_once_three_days_are_logged(over, days, salty, points):
    assert hs.sodium_habit_points(over, days, salty) == points


@pytest.mark.parametrize("log,intensity,minutes", [
    ({"duration_minutes": 30}, "High", 60),
    ({"duration_minutes": 30}, "vigorous", 60),
    ({"duration_minutes": 30}, "Moderate", 30),
    ({"duration_minutes": 30}, "Low", 15),
    ({"duration_minutes": 30, "effort_rating": 4}, "Low", 15),
    ({"duration_minutes": 30, "effort_rating": 5}, "Low", 30),
    ({"duration_minutes": 30}, None, 15),  # a quick log with no known intensity counts as light
    ({"duration_minutes": 30, "effort_rating": 7}, None, 30),
    ({"duration_minutes": 30, "effort_rating": 9}, "None", 0),  # breathing exercises aren't activity
    ({"duration_seconds": 1800}, "Moderate", 30),
])
def test_which_minutes_count(log, intensity, minutes):
    assert hs.effective_minutes(log, intensity) == minutes


# ── Worked examples in the review pack ────────────────────────────────────────────────────────────────────────────


def areas(**points):
    return points


def test_example_134_over_86_is_73_room_to_improve():
    result = score(
        baseline={**ANSWERS, "fruit_veg_servings": "2-3", "fried_food_freq": "sometimes", "salty_food_freq": "sometimes"},
        profile={"height_cm": 170, "weight_kg": 69.4},  # BMI 24
        health_logs=[reading(134, 86)],
        exercise_logs=[{"duration_minutes": 120, "effort_rating": 5, "logged_at": at(1)}],
        sleep_logs=[{"duration_hours": 6.5, "logged_at": at()}],
    )
    assert [result["areas"][k]["points"] for k in ("blood_pressure", "activity", "sleep", "nicotine", "body_weight", "diet")] == [50, 90, 70, 100, 75, 50]
    assert (result["average"], result["score"], result["tier"], result["rule"]) == (73, 73, "Moderate", None)


def test_example_150_over_95_with_great_habits_is_limited_to_59():
    result = score(
        health_logs=[reading(150, 95)],
        exercise_logs=[{"duration_minutes": 200, "effort_rating": 6, "logged_at": at(1)}],
        sleep_logs=[{"duration_hours": 7.5, "logged_at": at()}],
    )
    assert result["average"] == 88
    assert (result["score"], result["tier"], result["rule"]) == (59, "Elevated Risk", "stage_2_limit")


def test_example_normal_pressure_with_poor_habits_stops_at_the_floor():
    result = score(
        baseline={**ANSWERS, "ever_smoked": True, "smoke_now": "Every day", "fruit_veg_servings": "2-3", "fried_food_freq": "often", "salty_food_freq": "daily"},
        profile={"height_cm": 170, "weight_kg": 89.6},  # BMI 31
        health_logs=[reading(118, 76)],
        sleep_logs=[{"duration_hours": 5.5, "logged_at": at()}],
    )
    assert [result["areas"][k]["points"] for k in ("blood_pressure", "activity", "sleep", "nicotine", "body_weight", "diet")] == [100, 0, 40, 0, 25, 25]
    assert (result["average"], result["score"], result["tier"], result["rule"]) == (32, 50, "Elevated Risk", "floor")


def test_example_emergency_reading_is_49_or_lower_whatever_the_habits():
    result = score(health_logs=[reading(185, 95)])
    assert result["score"] <= 49 and result["tier"] == "Critical" and result["rule"] == "emergency_limit"


# ── The blood pressure rules ──────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sys_bp,dia_bp,limit", [
    (129, 79, None), (130, 70, 79), (119, 80, 79), (139, 89, 79), (140, 70, 59), (119, 90, 59), (175, 110, 59),
])
def test_blood_pressure_limits(sys_bp, dia_bp, limit):
    assert hs.bp_limit(sys_bp, dia_bp) == limit


def test_final_score_rules():
    assert hs.final_score(95, False, (135, 85), True) == (79, "stage_1_limit")
    assert hs.final_score(70, False, (135, 85), True) == (70, None)
    assert hs.final_score(95, False, (150, 95), True) == (59, "stage_2_limit")
    assert hs.final_score(95, False, None, False) == (79, "no_recent_reading")
    assert hs.final_score(30, False, (118, 76), True) == (50, "floor")
    assert hs.final_score(95, True, (118, 76), True) == (49, "emergency_limit")
    assert hs.final_score(30, True, (118, 76), True) == (30, None)  # the floor never lifts an emergency


@pytest.mark.parametrize("bad", [(180, 100), (150, 120), (89, 70), (110, 59)])
def test_every_kind_of_emergency_reading_stays_under_50(bad):
    result = score(health_logs=[reading(*bad)])
    assert result["score"] <= 49 and result["tier"] == "Critical"


def test_emergency_thresholds_are_unchanged():
    assert is_emergency_reading(180, 100) and is_emergency_reading(150, 120)
    assert is_emergency_reading(89, 70) and is_emergency_reading(110, 59)
    assert not is_emergency_reading(179, 119) and not is_emergency_reading(90, 60)


def test_an_emergency_holds_until_a_later_normal_reading():
    assert score(health_logs=[reading(185, 95, days_ago=20)])["score"] <= 49  # however long ago
    later = score(health_logs=[reading(120, 78), reading(185, 95, days_ago=1)])
    assert later["score"] >= 50 and later["rule"] != "emergency_limit"


def test_blood_pressure_uses_the_weeks_average():
    result = score(health_logs=[reading(120, 80), reading(140, 90, days_ago=6), reading(200, 130, days_ago=7)])
    area = result["areas"]["blood_pressure"]
    assert (area["systolic"], area["diastolic"], area["readings"]) == (130, 85, 2)  # the 8th day's reading is out


def test_with_no_reading_this_week_the_latest_still_counts_so_stopping_cant_hide_it():
    result = score(health_logs=[reading(150, 95, days_ago=20)])
    assert result["areas"]["blood_pressure"]["points"] == 25 and result["score"] == 59


def test_no_reading_in_30_days_means_no_area_and_a_limit_of_79():
    active = [{"duration_minutes": 200, "effort_rating": 6, "logged_at": at(1)}]
    for logs in ([], [reading(118, 76, days_ago=30)]):
        result = score(health_logs=logs, exercise_logs=active)
        assert "blood_pressure" not in result["areas"]
        assert (result["score"], result["rule"]) == (79, "no_recent_reading")
    assert score(health_logs=[reading(118, 76, days_ago=29)], exercise_logs=active)["rule"] != "no_recent_reading"


def test_deleted_readings_and_symptom_only_logs_are_ignored():
    logs = [
        {**reading(185, 95), "deleted_at": at()},
        {"symptoms": ["Headache"], "logged_at": at()},
        reading(118, 76, days_ago=1),
    ]
    result = score(health_logs=logs)
    assert result["areas"]["blood_pressure"]["systolic"] == 118 and result["rule"] != "emergency_limit"


# ── Missing areas, and setup answers during the first week ────────────────────────────────────────────────────────


def test_the_average_uses_only_the_areas_with_data():
    result = score(baseline=None, profile={}, health_logs=[reading(118, 76)])
    assert result["areas_used"] == 1 and result["areas_total"] == 8 and result["average"] == 100


def test_no_data_at_all_gives_no_score():
    assert score(baseline=None, profile={}) is None


NEW_ANSWERS = {
    **ANSWERS, "created_at": at(2), "sleep_hours": 7.5, "vigorous_activity": True, "vigorous_days": 2, "vigorous_minutes": 15,
    "moderate_activity": True, "moderate_days": 3, "moderate_minutes": 30, "walk_bike_transport": False,
}


def test_a_new_account_starts_from_setup_answers():
    result = score(baseline=NEW_ANSWERS)
    assert result["areas"]["activity"] == {"points": 100, "minutes": 0, "goal": 150, "from": "setup"}  # 60 + 90 minutes
    assert result["areas"]["sleep"]["from"] == "setup" and result["areas"]["sleep"]["points"] == 100
    assert result["score"] == 79  # no reading yet


def test_a_short_first_walk_never_lowers_a_new_accounts_activity_points():
    walk = {"duration_minutes": 10, "effort_rating": 6, "logged_at": at()}
    area = score(baseline=NEW_ANSWERS, exercise_logs=[walk])["areas"]["activity"]
    assert area["points"] == 100 and area["minutes"] == 10


def test_logs_replace_setup_answers_after_the_first_week():
    answers = {**NEW_ANSWERS, "created_at": at(7)}
    result = score(baseline=answers)
    assert result["areas"]["activity"]["points"] == 0 and result["areas"]["activity"]["from"] == "logs"
    assert "sleep" not in result["areas"]


def test_logged_sleep_replaces_the_setup_answer_straight_away():
    result = score(baseline=NEW_ANSWERS, sleep_logs=[{"duration_hours": 5.5, "logged_at": at()}])
    assert result["areas"]["sleep"] == {"points": 40, "hours": 5.5, "nights": 1, "from": "logs"}


def test_sleep_on_the_same_day_adds_up_and_old_or_deleted_nights_drop_out():
    logs = [
        {"duration_hours": 6, "logged_at": at()}, {"duration_hours": 1.5, "logged_at": at()},
        {"duration_hours": 6.5, "logged_at": at(1)},
        {"duration_hours": 2, "logged_at": at(7)},
        {"duration_hours": 2, "logged_at": at(2), "is_deleted": True},
    ]
    area = score(sleep_logs=logs)["areas"]["sleep"]
    assert (area["hours"], area["nights"]) == (7.0, 2)


def test_activity_counts_only_this_weeks_finished_workouts():
    logs = [
        {"duration_minutes": 40, "effort_rating": 5, "logged_at": at(6)},
        {"duration_minutes": 40, "effort_rating": 5, "logged_at": at(7)},
        {"duration_minutes": 40, "effort_rating": 5, "logged_at": at(), "status": "abandoned"},
        {"duration_minutes": 40, "effort_rating": 5, "logged_at": at(), "deleted_at": at()},
    ]
    assert score(exercise_logs=logs)["areas"]["activity"]["minutes"] == 40


def test_activity_gets_intensity_from_the_exercise_library():
    logs = [{"duration_minutes": 20, "routine_id": "r1", "logged_at": at()}, {"duration_minutes": 20, "routine_id": "r2", "logged_at": at()}]
    routines = [{"id": "r1", "intensity": "High"}, {"id": "r2", "intensity": "None"}]
    assert score(exercise_logs=logs, routines=routines)["areas"]["activity"]["minutes"] == 40


def test_diet_switches_to_logged_sodium_at_three_days():
    salty = [{"sodium_mg": 2000, "logged_at": at(i)} for i in range(3)]
    area = score(meal_logs=salty)["areas"]["diet"]
    assert (area["sodium_days_over"], area["meal_days"], area["sodium_from"]) == (3, 3, "logs")
    assert area["points"] == 50  # 2 + 2 + 0
    two_days = score(meal_logs=salty[:2])["areas"]["diet"]
    assert two_days["sodium_from"] == "setup" and two_days["points"] == 100


def test_sodium_adds_up_over_the_day_against_the_patients_limit():
    meals = [{"sodium_mg": 700, "logged_at": at(i)} for i in (0, 0, 0, 1, 2)]
    assert score(meal_logs=meals, sodium_limit=2000.0)["areas"]["diet"]["sodium_days_over"] == 1
    assert score(meal_logs=meals, sodium_limit=2100.0)["areas"]["diet"]["sodium_days_over"] == 0


def test_medicine_and_symptoms_dont_change_the_score():
    plain = score(health_logs=[reading(118, 76)])
    other = score(health_logs=[{**reading(118, 76), "medication_taken": False, "symptoms": ["Chest Discomfort / Tightness"]}])
    assert plain["score"] == other["score"]


def test_halves_round_up():
    assert hs._round(72.5) == 73 and hs._round(87.5) == 88 and hs._round(72.4) == 72


def test_the_level_names_and_bands_are_unchanged():
    assert [determine_tier(s) for s in (80, 79, 60, 59, 50, 49)] == [
        "Stable", "Moderate", "Moderate", "Elevated Risk", "Elevated Risk", "Critical",
    ]


# ── Saving ────────────────────────────────────────────────────────────────────────────────────────────────────────


class Repo:
    def __init__(self):
        self.saved = []

    def create_hss_record(self, uid, data):
        self.saved.append(data)
        return data


class Rows:
    def __init__(self, rows=(), one=None):
        self.rows, self.one = list(rows), one

    def __getattr__(self, name):
        return lambda *a, **k: self.one if name in ("get_by_id", "get_baseline") else self.rows


@pytest.fixture
def repos(monkeypatch):
    import app.db.repositories as r
    repo = Repo()
    monkeypatch.setattr(r, "get_hss_repo", lambda: repo)
    monkeypatch.setattr(r, "get_baseline_repo", lambda: Rows(one=ANSWERS))
    monkeypatch.setattr(r, "get_profile_repo", lambda: Rows(one=PROFILE))
    for name in ("get_meals_repo", "get_exercises_repo", "get_sleep_repo", "get_content_repo", "get_lab_results_repo"):
        monkeypatch.setattr(r, name, lambda: Rows())
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: [])
    monkeypatch.setattr(hs, "_sodium_limit", lambda uid: 1500.0)
    monkeypatch.setattr(hs, "_checked_today", set())
    return repo


def test_each_areas_points_are_saved_with_the_score(repos):
    hs.recalculate_score("u1", "sleep_log")
    record = repos.saved[-1]
    assert record["score"] == 75 and record["tier"] == "Moderate" and record["model_version"] == hs.METHOD_VERSION
    factors = record["contributing_factors"]
    assert factors["trigger"] == "sleep_log" and factors["source"] == "heart_score" and factors["average"] == 75
    assert factors["areas"]["nicotine"]["points"] == 100


def test_a_scoring_failure_never_loses_the_log(monkeypatch):
    def broken(uid):
        raise RuntimeError("database down")
    monkeypatch.setattr(hs, "score_for_user", broken)
    hs.try_recalculate("u1", "sleep_log")  # doesn't raise


def test_a_reading_records_what_kind_it_was():
    assert hs.reading_extra(118, 76, 70)["reading_kind"] == "healthy"
    assert hs.reading_extra(120, 76, None)["reading_kind"] == "other"
    assert hs.reading_extra(185, 95, None)["reading_kind"] == "emergency"
    assert hs.reading_extra(85, 55, None)["reading_kind"] == "emergency"


def test_old_method_records_are_moved_to_the_new_method(repos):
    old = [{"score": 82, "computed_at": at(), "contributing_factors": {"source": "lifestyle_composite"}}]
    history = hs.refresh_if_outdated("u1", old)
    assert len(history) == 2 and history[0]["contributing_factors"]["trigger"] == "method_update"


def test_the_models_starting_score_stays_until_the_first_log(repos):
    starting = [{"score": 92, "source": "baseline", "computed_at": at(10), "contributing_factors": {}}]
    assert hs.refresh_if_outdated("u1", starting) == starting and not repos.saved


def test_nothing_is_saved_when_todays_score_is_current(repos):
    today = datetime.now(timezone.utc).isoformat()
    current = [{"score": 79, "computed_at": today, "contributing_factors": {"method": hs.METHOD_VERSION}}]
    assert hs.refresh_if_outdated("u1", current) == current and not repos.saved


def test_a_new_day_saves_only_if_something_changed_and_checks_once(repos, monkeypatch):
    result = hs.score_for_user("u1")
    same = [{"score": result["score"], "computed_at": at(3), "contributing_factors": {"method": hs.METHOD_VERSION, "areas": result["areas"]}}]
    assert hs.refresh_if_outdated("u1", same) == same and not repos.saved

    calls = []
    monkeypatch.setattr(hs, "score_for_user", lambda uid: calls.append(uid) or result)
    hs.refresh_if_outdated("u1", same)
    assert not calls  # already checked today

    changed = [{"score": 90, "computed_at": at(3), "contributing_factors": {"method": hs.METHOD_VERSION, "areas": {}}}]
    history = hs.refresh_if_outdated("u2", changed)
    assert history[0]["contributing_factors"]["trigger"] == "daily_update" and len(history) == 2


def test_a_refresh_failure_leaves_the_history_alone(monkeypatch):
    def broken(uid):
        raise RuntimeError("database down")
    monkeypatch.setattr(hs, "score_for_user", broken)
    monkeypatch.setattr(hs, "_checked_today", set())
    old = [{"score": 82, "computed_at": at(3), "contributing_factors": {}}]
    assert hs.refresh_if_outdated("u1", old) == old


def test_no_history_means_nothing_to_refresh():
    assert hs.refresh_if_outdated("u1", []) == []
