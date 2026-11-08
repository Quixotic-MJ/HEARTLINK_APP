"""The starting score: setup answers -> the AHA's points -> the model's estimate -> HeartLink's rules."""
from app.services.feature_transform import INPUTS, transform_to_model_features
from app.services.starting_score import FEATURES, compute_initial_hss, load_hss_model


def profile(age=45, sex="female", height_cm=160, weight_kg=60):
    return {"date_of_birth": f"{2026 - age}-01-01", "sex": sex, "height_cm": height_cm, "weight_kg": weight_kg}


def answers(**over):
    base = dict(
        vigorous_activity=False, moderate_activity=True, moderate_days=3, moderate_minutes=30,
        walk_bike_transport=True, walk_bike_days=5, walk_bike_minutes=20, sedentary_hours="4-6h", sleep_hours=7.5,
        ever_smoked=False, smoke_now=None, ever_drank=False, drink_frequency=None, drinks_per_occasion=None,
        binge_drinking_freq=None, diet_level="average", fried_food_freq="sometimes", salty_food_freq="sometimes",
        fruit_veg_servings="2-3",
    )
    return {**base, **over}


def inputs(data, prof=None):
    return transform_to_model_features(data, prof or profile()).iloc[0]


def score(data=None, prof=None):
    return compute_initial_hss(data or answers(), prof or profile())[0]


def test_the_model_file_matches_the_app_inputs():
    model = load_hss_model()
    assert model["inputs"] == INPUTS
    assert model["features"] == FEATURES and len(model["weights"]) == len(FEATURES)
    assert model["version"].startswith("starting-score-le8")


def test_heavier_drinking_gives_larger_numbers():
    light = inputs(answers(ever_drank=True, drink_frequency="Monthly or less", drinks_per_occasion="1-2", binge_drinking_freq="Never"))
    heavy = inputs(answers(ever_drank=True, drink_frequency="4+/week", drinks_per_occasion="5+", binge_drinking_freq="4+/week"))
    assert heavy.drinks_week > light.drinks_week > 0
    assert heavy.binge_days_year > light.binge_days_year == 0
    assert inputs(answers()).drinks_week == 0


def test_bmi_activity_and_smoking_are_read_the_way_nhanes_records_them():
    row = inputs(answers(vigorous_activity=True, vigorous_days=2, vigorous_minutes=30, ever_smoked=True, smoke_now="Not at all"))
    assert round(row.bmi, 1) == 23.4
    assert row.active_min_week == 2 * 60 + 90 + 100
    assert (row.former_smoker, row.current_smoker) == (1, 0)
    still = inputs(answers(ever_smoked=True, smoke_now="Some days"))
    assert (still.former_smoker, still.current_smoker) == (0, 1)
    idle = inputs(answers(moderate_activity=False, walk_bike_transport=False))
    assert idle.active_min_week == 0


def test_missing_height_uses_the_training_median():
    row = inputs(answers(), profile(height_cm=0))
    assert row.bmi != row.bmi  # NaN
    assert 50 <= score(prof=profile(height_cm=0)) <= 79


def raw(data=None, prof=None):
    return compute_initial_hss(data or answers(), prof or profile())[2]


def test_scores_stay_in_range_and_follow_the_rules():
    for age in (20, 45, 80):
        result = compute_initial_hss(answers(), profile(age=age))
        assert 50 <= result[0] <= 79  # no reading yet: limit of 79; answers alone can't pause workouts


def test_the_estimate_is_capped_at_79_with_no_reading():
    great = answers(vigorous_activity=True, vigorous_days=5, vigorous_minutes=30)
    score_, tier, estimate_, rule = compute_initial_hss(great, profile(age=25, height_cm=170, weight_kg=60))
    assert estimate_ > 79 and score_ == 79 and tier == "Moderate" and rule == "no_recent_reading"


def test_poor_answers_stop_at_the_floor_but_keep_the_real_estimate():
    poor = answers(moderate_activity=False, walk_bike_transport=False, ever_smoked=True, smoke_now="Every day", sleep_hours=3.0)
    score_, tier, estimate_, rule = compute_initial_hss(poor, profile(age=80, sex="male", height_cm=160, weight_kg=120))
    assert estimate_ < 50 and score_ == 50 and tier == "Elevated Risk" and rule == "floor"


def test_worse_habits_never_give_a_better_estimate():
    base = raw()
    assert raw(answers(ever_smoked=True, smoke_now="Every day")) < base
    assert raw(answers(moderate_activity=False, walk_bike_transport=False)) < base
    assert raw(answers(sleep_hours=4.5)) < base
    assert raw(prof=profile(weight_kg=95)) < base
    assert raw(prof=profile(age=70)) < raw(prof=profile(age=30))


def test_quitting_longer_ago_gives_a_better_estimate():
    quit_ = lambda when: raw(answers(ever_smoked=True, smoke_now="Not at all", smoke_quit_when=when))
    assert quit_("under_1_year") < quit_("1_to_5_years") < quit_("5_plus_years") < raw()
    assert quit_(None) == quit_("under_1_year")  # no date yet: the cautious answer


def test_alcohol_and_sitting_dont_change_the_estimate():
    heavy = answers(ever_drank=True, drink_frequency="4+/week", drinks_per_occasion="5+", binge_drinking_freq="4+/week", sedentary_hours="8+h")
    assert raw(heavy) == raw()
