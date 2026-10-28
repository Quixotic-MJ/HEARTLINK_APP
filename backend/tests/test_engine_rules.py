"""The engine review (2026-10-28): allergies, diets, which exercises are offered, meal sodium and sleep in the score."""
import pytest

from app.services import hss_service
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


# --- which exercises are offered ------------------------------------------------------------------------------

WALK = {"name": "20-Minute Neighborhood Walk", "hss_tier": "Stable", "type": "Light Cardio"}
STRETCH = {"name": "Seated stretches", "hss_tier": "Elevated Risk", "type": "Stretching"}
BREATHE = {"name": "4-7-8 breathing", "hss_tier": "Critical", "type": "Breathing"}


def test_a_stable_patient_can_get_any_exercise():
    assert all(exercise_suits(e, "Stable", False) for e in (WALK, STRETCH, BREATHE))


@pytest.mark.parametrize("tier", ["Moderate", "Elevated Risk", "Critical"])
def test_a_less_healthy_patient_never_gets_a_more_active_exercise(tier):
    """Before, everyone was also offered the Stable band's exercises, the most active ones."""
    assert exercise_suits(WALK, tier, False) is False
    assert exercise_suits(BREATHE, tier, False) is True


def test_during_the_rest_after_a_severe_symptom_only_breathing():
    assert exercise_suits(STRETCH, "Stable", True) is False
    assert exercise_suits(BREATHE, "Stable", True) is True


# --- the score: meals against the day's sodium limit, and sleep ranges ------------------------------------------

class Repo:
    def __init__(self):
        self.saved = []

    def list_hss_history(self, uid, *a, **k):
        return [{"score": 80, "computed_at": utc_now().isoformat(), "contributing_factors": {"trigger": "health_log"}}]

    def create_hss_record(self, uid, data):
        self.saved.append(data)
        return data


class Rows:
    def __init__(self, rows=()):
        self.rows = list(rows)

    def __getattr__(self, _):
        return lambda *a, **k: self.rows


def lifestyle(monkeypatch, meals=(), sleep_hours=None):
    import app.db.repositories as repos
    now = utc_now().isoformat()
    repo = Repo()
    monkeypatch.setattr(repos, "get_hss_repo", lambda: repo)
    monkeypatch.setattr(repos, "get_meals_repo", lambda: Rows([{"logged_at": now, **m} for m in meals]))
    monkeypatch.setattr(repos, "get_exercises_repo", lambda: Rows())
    sleep = [{"logged_at": now, "duration_hours": sleep_hours}] if sleep_hours is not None else []
    monkeypatch.setattr(repos, "get_sleep_repo", lambda: Rows(sleep))
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: [])
    monkeypatch.setattr(hss_service, "_sodium_limit", lambda uid: 1500.0)
    hss_service.compute_lifestyle_composite_hss("u1", trigger="meal_log")
    return repo.saved[-1]["contributing_factors"]


def test_five_700mg_meals_now_cost_points(monkeypatch):
    """3,500 mg in a day against a 1,500 mg limit: before, each meal was under 800 mg, so it cost nothing."""
    factors = lifestyle(monkeypatch, meals=[{"sodium_mg": 700, "saturated_fat_g": 2}] * 5)
    assert factors["sodium_total_mg"] == 3500 and factors["sodium_limit_mg"] == 1500
    assert factors["meal_points"] == -5


def test_a_day_just_over_the_limit_and_one_under_it(monkeypatch):
    assert lifestyle(monkeypatch, meals=[{"sodium_mg": 900, "saturated_fat_g": 2}] * 2)["meal_points"] == -3
    assert lifestyle(monkeypatch, meals=[{"sodium_mg": 400, "saturated_fat_g": 2}] * 2)["meal_points"] == 2


def test_no_meals_no_meal_points(monkeypatch):
    assert lifestyle(monkeypatch)["meal_points"] == 0


@pytest.mark.parametrize("hours, points", [(8, 3), (6.5, 1), (9.5, 1), (5.5, 0), (4.5, -2), (12, -2)])
def test_sleep_scores_by_range(monkeypatch, hours, points):
    """6.5 and 9.5 hours used to score 0: only exactly 6 or 10 counted."""
    assert lifestyle(monkeypatch, sleep_hours=hours)["sleep_points"] == points
