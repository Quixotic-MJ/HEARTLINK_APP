"""HL-155: the weekly meal plan and shopping list (Premium)."""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.services import meal_plan as mp

MONDAY = date(2026, 11, 16)


def recipe(rid, name, category, sodium, ingredients=None, servings=2, **extra):
    return {"id": rid, "name": name, "category": category, "sodium_mg": sodium, "servings": servings,
            "status": "published", "expert_validated": True, "ingredients": ingredients or [], **extra}


RECIPES = [
    recipe("b1", "Oatmeal with banana", "Breakfast", 90, [{"name": "Rolled oats", "unit": "cup", "amount": 1}]),
    recipe("b2", "Egg and tomato toast", "Breakfast", 300, [{"name": "Eggs", "unit": "pc", "amount": 4}]),
    recipe("l1", "Garlic tofu", "Lunch", 250, [{"name": "Tofu, firm", "unit": "g", "amount": 400},
                                                  {"name": "Garlic (minced)", "unit": "clove", "amount": 4}]),
    recipe("l2", "Chicken tinola", "Lunch", 400, [{"name": "Garlic", "unit": "clove", "amount": 2}]),
    recipe("l3", "Shrimp sinigang", "Lunch", 350, [{"name": "Shrimp", "unit": "g", "amount": 300}]),
    recipe("d1", "Steamed fish", "Dinner", 280, [{"name": "Tilapia", "unit": "g", "amount": 500}], servings=4),
    recipe("d2", "Vegetable soup", "Dinner", 200, [{"name": "Rolled oats", "unit": "cup", "amount": 1}]),
    recipe("x1", "Draft adobo", "Dinner", 100, status="draft"),                      # not approved: never planned
    recipe("x2", "Unchecked pancit", "Lunch", 100, expert_validated=False),         # not Dietitian-approved
]


def plan(**kw):
    args = dict(recipes=RECIPES, sodium_limit=1500, diet="", allergies=[], seed="p1:2026-11-16:0", start=MONDAY)
    args.update(kw)
    return mp.build_plan(**args)


def picked(p):
    return [m["recipe"]["id"] for d in p["days"] for m in d["meals"] if m["recipe"]]


def test_a_week_of_breakfast_lunch_and_dinner_from_approved_recipes():
    p = plan()
    assert [d["date"] for d in p["days"]] == [(MONDAY + timedelta(days=i)).isoformat() for i in range(7)]
    assert all([m["meal"] for m in d["meals"]] == ["Breakfast", "Lunch", "Dinner"] for d in p["days"])
    assert set(picked(p)) <= {"b1", "b2", "l1", "l2", "l3", "d1", "d2"}  # drafts and unapproved never appear
    assert p["recipes_available"] == {"Breakfast": 2, "Lunch": 3, "Dinner": 2}
    assert "not a diet prescription" in p["note"]


def test_each_day_stays_under_the_sodium_limit_with_room_for_snacks():
    p = plan(sodium_limit=1000)  # 800 mg for meals
    assert p["meal_budget_mg"] == 800
    for d in p["days"]:
        assert d["sodium_mg"] <= 800
        assert d["sodium_mg"] == sum(m["recipe"]["sodium_mg"] for m in d["meals"] if m["recipe"])


def test_a_meal_that_cant_fit_is_your_choice_with_what_is_left():
    p = plan(sodium_limit=500)  # 400 mg for meals: no full day fits
    choices = [m for d in p["days"] for m in d["meals"] if m["recipe"] is None]
    assert choices and all(m["choice_limit_mg"] >= 0 for m in choices)
    assert all(d["sodium_mg"] <= 400 for d in p["days"])


def test_no_meal_is_repeated_on_two_days_in_a_row():
    p = plan()
    for meal_index in range(3):
        ids = [d["meals"][meal_index]["recipe"]["id"] for d in p["days"] if d["meals"][meal_index]["recipe"]]
        assert all(a != b for a, b in zip(ids, ids[1:]))


def test_allergies_and_diet_are_respected():
    p = plan(allergies=["shellfish"])
    assert "l3" not in picked(p)  # shrimp
    vegetarian = plan(diet="Vegetarian")
    assert not {"l2", "d1", "l3"} & set(picked(vegetarian))  # chicken, fish, shrimp


def test_no_recipes_yet_means_every_meal_is_your_choice():
    p = plan(recipes=[])
    assert all(m["recipe"] is None and m["choice_limit_mg"] == 1200 for d in p["days"] for m in d["meals"])
    assert p["shopping_list"] == []


def test_the_same_week_and_shuffle_give_the_same_plan_and_a_new_shuffle_can_differ():
    assert plan()["days"] == plan()["days"]
    others = [plan(seed=f"p1:2026-11-16:{n}")["days"] for n in range(1, 6)]
    assert any(o != plan()["days"] for o in others)


def test_the_shopping_list_adds_up_one_serving_per_meal():
    p = plan(recipes=[RECIPES[0], RECIPES[2], RECIPES[6]])  # oatmeal, garlic tofu, vegetable soup: one each per day
    items = {(i["name"], i["unit"]): i for i in p["shopping_list"]}
    # Oats: oatmeal (1 cup / 2 servings) and the soup (1 cup / 2 servings), every day: 7 x (0.5 + 0.5)
    assert items[("Rolled oats", "cup")]["amount"] == 7.0
    assert set(items[("Rolled oats", "cup")]["recipes"]) == {"Oatmeal with banana", "Vegetable soup"}
    # "Tofu, firm" and "Garlic (minced)" are listed by their plain names
    assert items[("Tofu", "g")]["amount"] == 1400.0 and ("Garlic", "clove") in items


def test_plans_start_on_monday():
    assert mp.week_start(date(2026, 11, 19)) == MONDAY  # a Thursday


# --- the API -------------------------------------------------------------------------------------------

@pytest.fixture
def api(monkeypatch):
    from app.main import app
    from app.utils.security import get_current_user

    profile = {"id": "p1", "role": "patient", "plan": "free", "sex": "female", "date_of_birth": "1975-01-01"}
    monkeypatch.setattr("app.services.premium.get_profile_repo", lambda: type("P", (), {"get_by_id": lambda s, u: profile})())
    monkeypatch.setattr(mp, "get_profile_repo", lambda: type("P", (), {"get_by_id": lambda s, u: profile})())
    monkeypatch.setattr(mp, "get_baseline_repo", lambda: type("B", (), {
        "get_baseline": lambda s, u: {"allergies": ["shellfish"]}, "get_thresholds": lambda s, u: None})())
    monkeypatch.setattr(mp, "get_content_repo", lambda: type("C", (), {"list_recipes": lambda s: RECIPES})())
    saved = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "p1", "role": "patient"}
    yield TestClient(app), profile
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)


def test_the_meal_plan_is_premium(api):
    client, profile = api
    assert client.get("/api/meal-plan").status_code == 403
    profile.update({"plan": "premium", "premium_until": "2099-01-01T00:00:00+00:00"})
    res = client.get("/api/meal-plan?week=2026-11-19&shuffle=2")
    assert res.status_code == 200
    body = res.json()
    assert body["week_start"] == "2026-11-16" and body["shuffle"] == 2 and body["sodium_limit_mg"] == 1500
    assert "l3" not in [m["recipe"]["id"] for d in body["days"] for m in d["meals"] if m["recipe"]]


@pytest.mark.parametrize("query", ["week=next-week", "shuffle=-1", "shuffle=10001"])
def test_bad_requests_are_refused(api, query):
    client, profile = api
    profile.update({"plan": "premium", "premium_until": "2099-01-01T00:00:00+00:00"})
    assert client.get(f"/api/meal-plan?{query}").status_code == 400
