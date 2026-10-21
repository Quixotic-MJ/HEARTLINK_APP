"""HL-028: cholesterol on meal logs, for the daily cholesterol tracker."""
from app.services import meals as meal_service
from app.services.meals import meal_cholesterol

SALMON = {"id": "r1", "calories": 450, "cholesterol_mg": 60}


def test_a_value_sent_by_the_app_is_kept():
    assert meal_cholesterol({"cholesterol_mg": 35.26, "calories": 200}, SALMON) == 35.3


def test_a_recipe_meal_gets_the_recipes_value_scaled_by_how_much_was_eaten():
    assert meal_cholesterol({"calories": 450}, SALMON) == 60          # one serving
    assert meal_cholesterol({"calories": 900}, SALMON) == 120         # two servings
    assert meal_cholesterol({"calories": 225}, SALMON) == 30          # half


def test_no_value_and_no_recipe_means_zero():
    assert meal_cholesterol({"calories": 300}, None) == 0
    assert meal_cholesterol({"calories": 300, "cholesterol_mg": "bad"}, None) == 0


def test_saving_a_meal_looks_up_its_recipe(monkeypatch):
    saved = {}

    class Content:
        def get_recipe(self, rid):
            return SALMON if rid == "r1" else None

    class Meals:
        def create_meal(self, user_id, data):
            saved.update(data)
            return data

    monkeypatch.setattr(meal_service, "get_content_repo", lambda: Content())
    monkeypatch.setattr(meal_service, "get_meals_repo", lambda: Meals())
    meal_service.create_meal_log("p1", {"recipe_id": "r1", "meal_name": "Salmon Bowl", "calories": 450})
    assert saved["cholesterol_mg"] == 60
