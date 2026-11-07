"""The labels behind the starting score's model: the AHA's Life's Essential 8 tables and the HEI-2015 diet score."""
import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))

import hei2015  # noqa: E402
import le8_label as le8  # noqa: E402

NAN = float("nan")


@pytest.mark.parametrize("value,points", [(129.9, 100), (130, 60), (159, 60), (160, 40), (189, 40), (190, 20), (219, 20), (220, 0)])
def test_cholesterol_points(value, points):
    assert le8.non_hdl_points(value) == points


@pytest.mark.parametrize("a1c,fasting,told,points", [
    (5.6, NAN, False, 100), (5.7, NAN, False, 60), (6.4, NAN, False, 60),
    (6.5, NAN, False, 40),  # in the diabetes range without a diagnosis
    (6.9, NAN, True, 40), (7.0, NAN, True, 30), (7.9, NAN, True, 30), (8.0, NAN, True, 20), (8.9, NAN, True, 20),
    (9.0, NAN, True, 10), (9.9, NAN, True, 10), (10.0, NAN, True, 0),
    (5.2, NAN, True, 40),  # a diagnosis with a good HbA1c stays on the diabetes row
    (NAN, 99, False, 100), (NAN, 100, False, 60), (NAN, 125, False, 60),
])
def test_blood_sugar_points(a1c, fasting, told, points):
    assert le8.glucose_points(a1c, fasting, told) == points


@pytest.mark.parametrize("a1c,fasting,told", [(NAN, NAN, False), (NAN, 126, False), (NAN, 110, True)])
def test_blood_sugar_is_unknown_without_what_the_table_needs(a1c, fasting, told):
    assert np.isnan(le8.glucose_points(a1c, fasting, told))


@pytest.mark.parametrize("bmi,points", [(24.9, 100), (25, 70), (29.9, 70), (30, 30), (34.9, 30), (35, 15), (39.9, 15), (40, 0)])
def test_standard_bmi_row(bmi, points):
    assert le8.standard_bmi_points(bmi) == points


def test_asian_bmi_row_matches_the_app_and_handles_underweight():
    assert [le8.bmi_feature_points(b) for b in (18.5, 23, 25, 30, 35)] == [100, 75, 50, 25, 0]
    assert le8.bmi_feature_points(17) == 100


@pytest.mark.parametrize("quantity,unit,years", [(6, 3, 0.5), (52.18, 2, 1.0), (365.25, 1, 1.0), (3, 4, 3.0), (66666, 4, 50.0)])
def test_years_since_quitting(quantity, unit, years):
    assert le8.years_since_quit(quantity, unit) == pytest.approx(years)


@pytest.mark.parametrize("quantity,unit", [(77777, 4), (99999, 4), (NAN, 4), (3, 7), (3, 9)])
def test_refused_quit_times_are_unknown(quantity, unit):
    assert np.isnan(le8.years_since_quit(quantity, unit))


@pytest.mark.parametrize("ever,now,years,cigars,ecig,home,points", [
    (2, NAN, NAN, NAN, NAN, False, 100),
    (1, 3, 5, NAN, NAN, False, 75),
    (1, 3, 4.9, NAN, NAN, False, 50),
    (1, 3, 1, NAN, NAN, False, 50),
    (1, 3, 0.9, NAN, NAN, False, 25),
    (2, NAN, NAN, NAN, 3, False, 25),  # e-cigarette now
    (1, 3, 8, NAN, 3, False, 25),
    (1, 1, NAN, NAN, NAN, False, 0),
    (1, 2, NAN, NAN, NAN, False, 0),
    (2, NAN, NAN, 2, NAN, False, 0),  # cigars count as smoking
    (2, NAN, NAN, NAN, NAN, True, 80),  # a smoker at home
    (1, 3, 0.5, NAN, NAN, True, 5),
    (1, 1, NAN, NAN, NAN, True, 0),  # no deduction from 0
])
def test_nicotine_points(ever, now, years, cigars, ecig, home, points):
    assert le8.nicotine_points(ever, now, years, cigars, ecig, home) == points


def test_nicotine_is_unknown_without_an_answer():
    assert np.isnan(le8.nicotine_points(NAN, NAN, NAN, NAN, NAN, False))
    assert np.isnan(le8.nicotine_points(1, 3, NAN, NAN, NAN, False))


def test_treated_levels_lose_20_but_not_below_0():
    assert le8.treated(100, True) == 80 and le8.treated(100, False) == 100 and le8.treated(10, True) == 0
    assert np.isnan(le8.treated(NAN, True))


@pytest.mark.parametrize("percentile,points", [(95, 100), (94.9, 80), (75, 80), (74.9, 50), (50, 50), (49.9, 25), (25, 25), (24.9, 0), (0, 0)])
def test_diet_points_from_percentile(percentile, points):
    assert le8.diet_points_from_percentile(percentile) == points


def test_weighted_percentiles_use_survey_weights_and_share_ties():
    values = pd.Series([10.0, 20.0, 20.0, 30.0, np.nan])
    weights = pd.Series([1.0, 1.0, 1.0, 1.0, 1.0])
    assert le8.weighted_percentile(values, weights).tolist()[:4] == [0.0, 25.0, 25.0, 75.0]
    assert np.isnan(le8.weighted_percentile(values, weights).iloc[4])
    heavier = pd.Series([3.0, 1.0, 0.0, 1.0, 1.0])
    assert le8.weighted_percentile(values, heavier).iloc[3] == pytest.approx(80.0)


def test_nhanes_zeros_load_as_real_zeros():
    fixed = le8.fix_zeros(pd.DataFrame({"days": [5.397605346934028e-79, 3.0, np.nan], "code": ["a", "b", "c"]}))
    assert fixed["days"].iloc[0] == 0 and fixed["days"].iloc[1] == 3 and np.isnan(fixed["days"].iloc[2])


def test_weekly_minutes_and_refused_codes():
    flag, days, minutes = pd.Series([1, 2, 1, 7]), pd.Series([3, np.nan, 99, np.nan]), pd.Series([30, np.nan, 30, np.nan])
    result = le8.weekly_minutes(flag, days, minutes)
    assert result[0] == 90 and result[1] == 0 and np.isnan(result[2]) and np.isnan(result[3])


# ── HEI-2015 ──────────────────────────────────────────────────────────────────────────────────────────────────────

def person(**over):
    base = dict(
        kcal=2000.0, total_fruits=0.0, whole_fruits=0.0, total_vegetables=0.0, greens_and_beans=0.0, whole_grains=0.0,
        dairy=0.0, total_protein=0.0, seafood_plant_protein=0.0, refined_grains=0.0, added_sugars_tsp=0.0, sodium_mg=0.0,
        saturated_fat_g=0.0, mono_fat_g=0.0, poly_fat_g=0.0,
    )
    return pd.DataFrame([{**base, **over}])


BEST = dict(
    total_fruits=1.6, whole_fruits=0.8, total_vegetables=2.2, greens_and_beans=0.4, whole_grains=3.0, dairy=2.6,
    total_protein=5.0, seafood_plant_protein=1.6, refined_grains=3.6, added_sugars_tsp=8.125, sodium_mg=2200.0,
    saturated_fat_g=17.8, mono_fat_g=30.0, poly_fat_g=14.5,
)


def test_meeting_every_standard_scores_100():
    assert hei2015.score(person(**BEST))["total"].iloc[0] == pytest.approx(100, abs=0.1)


def test_each_part_is_scored_in_proportion_and_capped():
    half = hei2015.score(person(total_fruits=0.8, dairy=1.3))
    assert half["total_fruits"].iloc[0] == pytest.approx(2.5) and half["dairy"].iloc[0] == pytest.approx(5.0)
    assert hei2015.score(person(total_fruits=99))["total_fruits"].iloc[0] == 5


@pytest.mark.parametrize("field,amount,part,points", [
    ("refined_grains", 3.6, "refined_grains", 10), ("refined_grains", 8.6, "refined_grains", 0),
    ("refined_grains", 6.1, "refined_grains", 5),
    ("sodium_mg", 2200.0, "sodium", 10), ("sodium_mg", 4000.0, "sodium", 0), ("sodium_mg", 3100.0, "sodium", 5),
    ("added_sugars_tsp", 8.125, "added_sugars", 10), ("added_sugars_tsp", 32.5, "added_sugars", 0),
    ("saturated_fat_g", 17.78, "saturated_fat", 10), ("saturated_fat_g", 35.56, "saturated_fat", 0),
])
def test_foods_to_limit_lose_points_as_they_rise(field, amount, part, points):
    assert hei2015.score(person(**{field: amount}))[part].iloc[0] == pytest.approx(points, abs=0.05)


@pytest.mark.parametrize("mono,poly,sat,points", [
    (25.0, 0.0, 10.0, 10), (12.0, 0.0, 10.0, 0), (18.5, 0.0, 10.0, 5), (5.0, 0.0, 0.0, 10), (0.0, 0.0, 0.0, 0),
])
def test_fatty_acid_ratio(mono, poly, sat, points):
    assert hei2015.score(person(mono_fat_g=mono, poly_fat_g=poly, saturated_fat_g=sat))["fatty_acids"].iloc[0] == pytest.approx(points)


def test_no_energy_means_no_score():
    assert np.isnan(hei2015.score(person(kcal=0.0))["total"].iloc[0])


def test_foods_become_food_groups_by_weight_and_legumes_count_in_four_parts():
    zeros = {c: 0.0 for c in hei2015.FPED_COLUMNS}
    fped = pd.DataFrame([{"food_code": 1, **zeros, "F_TOTAL": 0.5, "F_OTHER": 0.5}, {"food_code": 2, **zeros, "V_LEGUMES": 0.4, "PF_LEGUMES": 1.6}])
    foods = pd.DataFrame({"SEQN": [7, 7], "food_code": [1, 2], "grams": [200.0, 50.0]})
    row = hei2015.totals_from_foods(foods, fped).loc[7]
    assert row["total_fruits"] == 1.0 and row["whole_fruits"] == 1.0
    assert row["total_vegetables"] == pytest.approx(0.2) and row["greens_and_beans"] == pytest.approx(0.2)
    assert row["total_protein"] == pytest.approx(0.8) and row["seafood_plant_protein"] == pytest.approx(0.8)
