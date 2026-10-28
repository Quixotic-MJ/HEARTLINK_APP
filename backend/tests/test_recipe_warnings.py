"""Explore, meal search, saved recipes and a recipe's page warn a patient about their allergies and diet."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.dashboard import _recipe_is_safe, recipe_warnings
from app.utils.security import create_access_token, revoked_token_hashes

PATIENT_ID = "11111111-1111-1111-1111-111111111111"
PROFILES = {
    PATIENT_ID: {"id": PATIENT_ID, "role": "patient", "account_status": "active"},
    "admin-1": {"id": "admin-1", "role": "admin", "account_status": "active"},
}
VISIBLE = {"status": "published", "expert_validated": True}
SINIGANG = {"id": "r1", "name": "Sinigang na Hipon", "ingredients": [{"name": "Shrimp"}, {"name": "Tamarind"}], **VISIBLE}
ADOBO = {"id": "r2", "name": "Adobong Baboy", "ingredients": [{"name": "Pork belly"}], "tags": ["pork"], **VISIBLE}
TINOLA = {"id": "r3", "name": "Chicken Tinola", "ingredients": [{"name": "Chicken"}, {"name": "Ginger"}], **VISIBLE}


def test_a_warning_names_the_ingredient_and_the_allergy():
    assert recipe_warnings(SINIGANG, "", ["Shellfish"]) == ["Contains shrimp (you're allergic to shellfish)"]
    assert recipe_warnings({"name": "Leche Flan", "ingredients": [{"name": "Egg yolks"}]}, "", ["Eggs"]) == [
        "Contains egg (you're allergic to eggs)"
    ]


def test_a_warning_names_the_diet_it_breaks():
    assert recipe_warnings(ADOBO, "Halal", ["None"]) == ["Contains pork (not Halal)"]
    assert recipe_warnings({"name": "Grilled Bangus"}, "Vegetarian", []) == ["Contains bangus (not Vegetarian)"]


def test_an_allergy_and_a_diet_both_show():
    assert recipe_warnings(SINIGANG, "Vegetarian", ["Shellfish"]) == [
        "Contains shrimp (you're allergic to shellfish)",
        "Contains shrimp (not Vegetarian)",
    ]


def test_a_recipe_that_suits_has_no_warnings_and_the_dashboard_check_agrees():
    assert recipe_warnings(TINOLA, "Halal", ["Shellfish", "None"]) == []
    assert _recipe_is_safe(TINOLA, "Halal", ["Shellfish"])
    assert not _recipe_is_safe(SINIGANG, "", ["Shellfish"])
    assert recipe_warnings(SINIGANG, "", []) == []


class FakeProfileRepo:
    def get_by_id(self, user_id):
        return PROFILES.get(user_id)


class FakeBaselineRepo:
    def get_baseline(self, user_id):
        return {"dietary_practice": "Halal", "allergies": ["Shellfish"]} if user_id == PATIENT_ID else None


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


@pytest.fixture(autouse=True)
def fakes(monkeypatch):
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: FakeProfileRepo())
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    monkeypatch.setattr("app.services.food_warnings.get_baseline_repo", lambda: FakeBaselineRepo())
    recipes = [SINIGANG, ADOBO, TINOLA]
    monkeypatch.setattr("app.api.recipes_api.recipes_api.get_recipes", lambda: recipes)
    monkeypatch.setattr("app.api.recipes_api.recipes_api.get_recipe", lambda rid: next((r for r in recipes if r["id"] == rid), None))
    monkeypatch.setattr("app.api.recipes_api.recipes_api.get_saved_recipes", lambda uid: [SINIGANG])
    monkeypatch.setattr("app.api.meals.meals.search_meals", lambda q: recipes)
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


def _get(path, user_id=None):
    headers = {}
    if user_id:
        headers["Authorization"] = f"Bearer {create_access_token({'user_id': user_id, 'role': PROFILES[user_id]['role']})}"
    return TestClient(app, base_url="https://testserver").get(path, headers=headers)


@pytest.mark.parametrize("path", ["/api/recipes/", "/api/meals/search?q="])
def test_a_patient_sees_every_recipe_with_its_warnings(path):
    res = _get(path, PATIENT_ID)
    assert res.status_code == 200
    warnings = {r["id"]: r["warnings"] for r in res.json()}
    assert warnings == {
        "r1": ["Contains shrimp (you're allergic to shellfish)"],
        "r2": ["Contains pork (not Halal)"],
        "r3": [],
    }


def test_a_recipe_page_and_saved_recipes_carry_the_warnings_too():
    assert _get("/api/recipes/r2", PATIENT_ID).json()["warnings"] == ["Contains pork (not Halal)"]
    saved = _get(f"/api/recipes/saved/{PATIENT_ID}", PATIENT_ID).json()
    assert saved[0]["warnings"] == ["Contains shrimp (you're allergic to shellfish)"]


@pytest.mark.parametrize("user_id", [None, "admin-1"])
def test_no_warnings_without_a_signed_in_patient(user_id):
    for path in ("/api/recipes/", "/api/meals/search?q=", "/api/recipes/r1"):
        res = _get(path, user_id)
        assert res.status_code == 200
        body = res.json()
        for r in body if isinstance(body, list) else [body]:
            assert "warnings" not in r
