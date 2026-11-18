"""2026-11-18: the meal a patient chose when logging food is saved, so the Food Diary keeps a late breakfast under Breakfast."""
import pytest

from app.services import meals as meal_service
from app.services.meals import meal_time_of


@pytest.mark.parametrize("value, saved", [
    ("Breakfast", "Breakfast"), ("lunch", "Lunch"), (" Dinner ", "Dinner"), ("Snack", "Snack"),
    ("Brunch", None), ("", None), (None, None), (7, None),
])
def test_only_the_four_meals_are_kept(value, saved):
    assert meal_time_of(value) == saved


def test_saving_a_meal_keeps_the_chosen_meal(monkeypatch):
    saved = {}

    class Content:
        def get_recipe(self, rid):
            return None

    class Meals:
        def create_meal(self, user_id, data):
            saved.update(data)
            return data

    monkeypatch.setattr(meal_service, "get_content_repo", lambda: Content())
    monkeypatch.setattr(meal_service, "get_meals_repo", lambda: Meals())
    meal_service.create_meal_log("p1", {"meal_name": "Champorado", "calories": 300, "time_of_meal": "Breakfast"})
    assert saved["time_of_meal"] == "Breakfast"
    meal_service.create_meal_log("p1", {"meal_name": "Champorado", "calories": 300, "time_of_meal": "Midnight feast"})
    assert saved["time_of_meal"] is None


def test_the_database_insert_keeps_the_column(monkeypatch):
    """The repository only sends the columns it knows; time_of_meal must be one of them."""
    from app.db.repositories import meals as repo_module

    sent = {}

    class Table:
        def insert(self, payload):
            sent.update(payload)
            return self

        def execute(self):
            return type("R", (), {"data": [sent]})()

    class Client:
        def table(self, name):
            return Table()

    repo = repo_module.SupabaseMealsRepository(Client())
    monkeypatch.setattr(repo, "_resolve_user_uuid", lambda uid: "00000000-0000-0000-0000-000000000001")
    repo.create_meal("p1", {"meal_name": "Tinola", "calories": 250, "sodium_mg": 600, "time_of_meal": "Lunch"})
    assert sent["time_of_meal"] == "Lunch"
