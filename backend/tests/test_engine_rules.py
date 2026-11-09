"""The engine review (2026-10-28): allergies, diets, which exercises are offered, meal sodium and sleep in the score."""
import pytest

from app.services.dashboard import _recipe_is_safe, allergy_words, exercise_suits
from app.utils.time import utc_now


def recipe(name, *ingredients, tags=()):
    return {"name": name, "ingredients": [{"name": i} for i in ingredients], "tags": list(tags)}


# --- allergies and diets ---------------------------------------------------------------------------------------

@pytest.mark.parametrize("allergy, dish", [
    ("Eggs", recipe("Tortang talong", "eggplant", "egg", "garlic")),
    ("Peanuts", recipe("Kare-kare", "oxtail", "peanut butter")),
    ("Shellfish", recipe("Sinigang na hipon", "shrimp", "tamarind")),
    ("Shellfish", recipe("Ginataang alimango", "crab", "coconut milk")),
    ("Dairy", recipe("Leche flan", "evaporated milk", "egg yolk")),
    ("Dairy", recipe("Cheese pandesal", "flour", "cheese")),
    ("Gluten", recipe("Pancit canton", "canton noodles", "soy sauce")),
    ("Soy", recipe("Tokwa't baboy", "tokwa", "pork")),
])
def test_each_allergy_catches_its_real_ingredients(allergy, dish):
    """These all passed before: the filter looked for the allergy's own name ("eggs", "shellfish")."""
    assert _recipe_is_safe(dish, "None", [allergy]) is False


def test_safe_dishes_still_pass():
    assert _recipe_is_safe(recipe("Chicken tinola", "chicken", "ginger", "malunggay"), "None", ["Eggs", "Shellfish"])
    assert _recipe_is_safe(recipe("Tinola", "chicken"), "None", ["None"])


def test_an_allergy_not_in_the_list_matches_its_own_name():
    assert "sesame" in allergy_words(["Sesame"])
    assert allergy_words(["None", ""]) == []


@pytest.mark.parametrize("diet, dish", [
    ("Vegetarian", recipe("Grilled Bangus with Citrus & Garlic", "bangus", "calamansi")),  # never says "fish"
    ("Vegetarian", recipe("Ginisang monggo", "mung beans", "dilis")),
    ("Vegan", recipe("Leche flan", "evaporated milk", "egg")),
    ("Halal", recipe("Adobong liempo", "liempo", "vinegar")),
])
def test_diets_catch_filipino_names(diet, dish):
    assert _recipe_is_safe(dish, diet, []) is False


def test_a_vegetarian_dish_passes_vegetarian():
    assert _recipe_is_safe(recipe("Ginisang monggo", "mung beans", "malunggay", "garlic"), "Vegetarian", [])


# --- which exercises are offered: the screening decides, not the score (HL-123) --------------------------------------

WALK = {"name": "20-Minute Neighborhood Walk", "hss_tier": "Stable", "type": "Light Cardio", "difficulty_level": "Intermediate"}
STRETCH = {"name": "Seated stretches", "hss_tier": "Elevated Risk", "type": "Stretching", "difficulty_level": "Beginner"}
BREATHE = {"name": "4-7-8 breathing", "hss_tier": "Critical", "type": "Breathing"}
ELIGIBLE = {"state": "eligible"}
CAUTION = {"state": "caution"}


def test_an_eligible_patient_can_get_any_exercise():
    assert all(exercise_suits(e, ELIGIBLE, False) for e in (WALK, STRETCH, BREATHE))


def test_caution_gets_beginner_exercises_and_breathing():
    assert exercise_suits(WALK, CAUTION, False) is False
    assert exercise_suits(STRETCH, CAUTION, False) is True
    assert exercise_suits(BREATHE, CAUTION, False) is True


def test_during_the_rest_after_a_severe_symptom_only_breathing():
    assert exercise_suits(STRETCH, ELIGIBLE, True) is False
    assert exercise_suits(BREATHE, ELIGIBLE, True) is True


# --- the score: meals against the day's sodium limit, and sleep ranges ------------------------------------------
