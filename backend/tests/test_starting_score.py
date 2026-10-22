"""The starting score (baseline HSS): setup answers -> NHANES-meaning inputs -> score."""
from app.services.feature_transform import INPUTS, transform_to_model_features
from app.services.hss_service import compute_initial_hss, load_hss_model


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
    assert len(model["weights"]) == len(INPUTS)


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


def test_missing_height_is_left_for_the_model_median():
    row = inputs(answers(), profile(height_cm=0))
    assert row.bmi != row.bmi  # NaN
    assert 1 <= score(prof=profile(height_cm=0)) <= 100


def test_scores_follow_known_risk_factors():
    assert score(prof=profile(age=30)) >= 80
    assert score(prof=profile(age=65)) >= 50
    healthy = score(prof=profile(age=55))
    assert score(answers(ever_smoked=True, smoke_now="Every day"), profile(age=55)) < healthy
    assert score(answers(moderate_activity=False, walk_bike_transport=False, sedentary_hours="8+h"), profile(age=55, weight_kg=95)) < healthy
    assert score(prof=profile(age=70)) < score(prof=profile(age=40))


def test_heavy_drinking_never_looks_much_healthier():
    none = score(prof=profile(age=45))
    heavy = score(answers(ever_drank=True, drink_frequency="4+/week", drinks_per_occasion="5+", binge_drinking_freq="4+/week"), profile(age=45))
    assert heavy <= none + 1
