"""HL-016 / HL-017: daily food limits from guidelines, with saved limits winning (backend/HEALTH_TARGETS.md)."""
from datetime import datetime, timezone

import pytest

from app.services import nutrition_targets as nt
from app.services.nutrition_targets import bmi_category, compute_targets


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    monkeypatch.setattr(nt, "utc_now", lambda: datetime(2026, 10, 22, tzinfo=timezone.utc))


def profile(age=45, sex="female", height_cm=160, weight_kg=60):
    return {"date_of_birth": f"{2026 - age}-01-01", "sex": sex, "height_cm": height_cm, "weight_kg": weight_kg}


def answers(**over):
    base = dict(
        vigorous_activity=False, vigorous_days=None, vigorous_minutes=None,
        moderate_activity=True, moderate_days=3, moderate_minutes=30,
        walk_bike_transport=True, walk_bike_days=5, walk_bike_minutes=20, sedentary_hours="4-6h",
    )
    return {**base, **over}


IDLE = answers(moderate_activity=False, walk_bike_transport=False)


def test_bmi_uses_the_asia_pacific_cut_offs():
    assert [bmi_category(b) for b in (18.4, 18.5, 22.9, 23.0, 24.9, 25.0)] == [
        "Underweight", "Normal", "Normal", "Overweight", "Overweight", "Obese",
    ]
    t = compute_targets(profile(height_cm=165, weight_kg=45), answers(), None)
    assert (t["bmi"], t["bmi_category"]) == (16.5, "Underweight")


def test_woman_with_moderate_activity():
    # 160 cm, 60 kg, 45 years: resting 1,214 kcal x 1.55 (190 active min a week) = 1,882. BMI 23.4 is under 25.
    t = compute_targets(profile(), answers(), None)
    assert (t["bmi"], t["bmi_category"]) == (23.4, "Overweight")
    assert t["calories"]["value"] == 1880
    assert t["calories"]["source"] == nt.SOURCE_MIFFLIN
    assert t["sat_fat_g"]["value"] == 13  # 1,880 x 6% / 9 = 12.5
    assert t["cholesterol_mg"]["value"] == 200
    assert t["sodium_mg"]["value"] == 1500
    assert t["missing"] == []


def test_man_with_obesity_gets_500_kcal_less():
    # 170 cm, 90 kg, 55 years, no exercise: 1,692.5 x 1.2 = 2,031, minus 500 = 1,531.
    t = compute_targets(profile(age=55, sex="male", height_cm=170, weight_kg=90), IDLE, None)
    assert (t["bmi"], t["bmi_category"]) == (31.1, "Obese")
    assert t["calories"]["value"] == 1530
    assert "minus 500" in t["calories"]["why"]
    assert t["sat_fat_g"]["value"] == 10


def test_very_active_man_and_vigorous_minutes_count_twice():
    # 3 x 60 vigorous minutes = 360 a week -> 1.725. 180 cm, 75 kg, 30 years: 1,730 x 1.725 = 2,984.
    active = answers(vigorous_activity=True, vigorous_days=3, vigorous_minutes=60, moderate_activity=False, walk_bike_transport=False)
    assert nt.weekly_active_minutes(active) == 360
    t = compute_targets(profile(age=30, sex="male", height_cm=180, weight_kg=75), active, None)
    assert t["calories"]["value"] == 2980
    assert t["sat_fat_g"]["value"] == 20


def test_calories_never_go_below_the_floor():
    # 150 cm, 70 kg, 70 years, no exercise: 1,126.5 x 1.2 - 500 = 852, raised to 1,200 for women.
    t = compute_targets(profile(age=70, height_cm=150, weight_kg=70), IDLE, None)
    assert t["calories"]["value"] == 1200
    assert "Never set below 1,200" in t["calories"]["why"]
    man = compute_targets(profile(age=70, sex="male", height_cm=150, weight_kg=70), IDLE, None)
    assert man["calories"]["value"] == 1500


def test_activity_levels():
    assert [nt.activity_level(m)[0] for m in (None, 0, 59, 60, 149, 150, 299, 300)] == [
        1.2, 1.2, 1.2, 1.375, 1.375, 1.55, 1.55, 1.725,
    ]


def test_no_setup_answers_counts_as_little_exercise():
    with_none = compute_targets(profile(), None, None)
    idle = compute_targets(profile(), IDLE, None)
    assert with_none["calories"]["value"] == idle["calories"]["value"] == 1460  # 1,214 x 1.2


def test_limits_follow_weight_changes():
    before = compute_targets(profile(weight_kg=80), answers(), None)
    after = compute_targets(profile(weight_kg=62), answers(), None)
    assert before["bmi"] > after["bmi"]
    assert before["calories"]["value"] != after["calories"]["value"]


def test_saved_limits_always_win():
    saved = {"sodium_limit_mg": 2300, "cholesterol_limit_mg": 300, "daily_calories": 1800}
    t = compute_targets(profile(), answers(), saved)
    assert t["sodium_mg"] == {"value": 2300, "source": nt.SOURCE_PERSONAL, "why": t["sodium_mg"]["why"]}
    assert t["cholesterol_mg"]["value"] == 300 and t["cholesterol_mg"]["source"] == nt.SOURCE_PERSONAL
    assert t["calories"]["value"] == 1800 and t["calories"]["source"] == nt.SOURCE_PERSONAL
    assert t["sat_fat_g"]["value"] == 12  # follows the saved calories: 1,800 x 6% / 9


def test_saved_values_equal_to_the_guideline_keep_the_guideline_source():
    # Setup saves 1,500 mg sodium and the cholesterol column defaults to 200 for every patient.
    t = compute_targets(profile(), answers(), {"sodium_limit_mg": 1500, "cholesterol_limit_mg": 200})
    assert t["sodium_mg"]["source"] == nt.SOURCE_AHA_SODIUM
    assert t["cholesterol_mg"]["source"] == nt.SOURCE_TLC


def test_missing_height_falls_back_and_says_so():
    t = compute_targets(profile(height_cm=None), answers(), None)
    assert t["bmi"] is None and t["bmi_category"] is None
    assert t["calories"]["value"] == 2000
    assert t["calories"]["source"] == nt.SOURCE_DEFAULT
    assert "height" in t["calories"]["why"]
    assert t["missing"] == ["height"]
    assert t["sat_fat_g"]["value"] == 13
    assert (t["cholesterol_mg"]["value"], t["sodium_mg"]["value"]) == (200, 1500)


def test_unrealistic_height_and_missing_sex():
    t = compute_targets(profile(height_cm=20), answers(), None)
    assert t["bmi"] is None and t["missing"][:2] == ["height", "weight"]
    no_sex = compute_targets({**profile(), "sex": None}, answers(), None)
    assert no_sex["bmi"] == 23.4  # still shown
    assert no_sex["calories"]["value"] == 2000 and no_sex["missing"] == ["sex"]


def test_empty_profile_does_not_crash():
    t = compute_targets(None, None, None)
    assert t["calories"]["value"] == 2000
    assert t["missing"] == ["height", "weight", "date of birth", "sex"]


def test_targets_for_user_reads_profile_answers_and_saved_limits(monkeypatch):
    class Profiles:
        def get_by_id(self, user_id):
            return profile()

    class Baselines:
        def get_baseline(self, user_id):
            return answers()

        def get_thresholds(self, user_id):
            return {"sodium_limit_mg": 1800}

    monkeypatch.setattr(nt, "get_profile_repo", lambda: Profiles())
    monkeypatch.setattr(nt, "get_baseline_repo", lambda: Baselines())
    t = nt.targets_for_user("patient-1")
    assert t["calories"]["value"] == 1880
    assert t["sodium_mg"]["value"] == 1800
