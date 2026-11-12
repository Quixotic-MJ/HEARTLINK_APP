"""Meal picks follow the sodium left today: meals that fit come first (strict daily limits, HL-156)."""
from app.services.dashboard import order_recipe_picks


def _r(rid, sodium, validated=True):
    return {"id": rid, "sodium_mg": sodium, "expert_validated": validated}


def ids(recipes):
    return [r["id"] for r in recipes]


def test_meals_that_fit_whats_left_come_first():
    recipes = [_r("salty", 900), _r("light", 300), _r("medium", 550)]
    assert ids(order_recipe_picks(recipes, 600)) == ["light", "medium", "salty"]


def test_dietitian_validated_meals_lead_among_those_that_fit():
    recipes = [_r("plain", 100, validated=False), _r("checked", 400), _r("over", 700)]
    assert ids(order_recipe_picks(recipes, 500)) == ["checked", "plain", "over"]


def test_over_the_limit_already_lowest_sodium_first():
    recipes = [_r("a", 450), _r("b", 90, validated=False), _r("c", 200)]
    assert ids(order_recipe_picks(recipes, -100)) == ["b", "c", "a"]


def test_a_missing_sodium_value_counts_as_zero():
    assert ids(order_recipe_picks([_r("x", None), _r("y", 50)], 0)) == ["x", "y"]
