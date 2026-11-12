"""HL-155: the weekly meal plan and shopping list (Premium)."""
from datetime import date, datetime, timedelta, timezone

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


def test_meals_the_care_team_hid_are_left_out():
    """HL-057: a recipe marked not suitable for this patient stays out of the plan, as it does from the suggestions."""
    assert "l1" in picked(plan())
    assert "l1" not in picked(plan(hidden={("recipe", "l1")}))

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


# --- HL-159: the patient's changes -------------------------------------------------------------------------

MON = MONDAY.isoformat()


def meal_of(p, day_index, meal):
    return next(m for m in p["days"][day_index]["meals"] if m["meal"] == meal)


def test_a_swapped_meal_stays_and_the_rest_of_the_day_fits_around_it():
    p = plan(sodium_limit=1000, changes=[{"day": MON, "meal": "Lunch", "recipe_id": "l2"}])  # 400 mg tinola; 800 for meals
    lunch = meal_of(p, 0, "Lunch")
    assert lunch["kind"] == "swap" and lunch["recipe"]["id"] == "l2"
    assert p["days"][0]["sodium_mg"] <= 800
    assert p["changes"] == 1
    assert meal_of(p, 1, "Lunch")["kind"] in ("plan", "choice")  # only Monday changed


def test_my_own_meal_counts_against_the_day_but_isnt_approved_or_on_the_list():
    own = {"day": MON, "meal": "Dinner", "own_name": "Lola's sinigang", "own_sodium_mg": 900, "own_calories": 450}
    p = plan(changes=[own])  # 1,200 mg for meals
    dinner = meal_of(p, 0, "Dinner")
    assert dinner["kind"] == "own" and dinner["recipe"] is None
    assert dinner["own"] == {"name": "Lola's sinigang", "sodium_mg": 900, "calories": 450}
    monday = p["days"][0]
    others = sum(m["recipe"]["sodium_mg"] for m in monday["meals"] if m["recipe"])
    assert monday["sodium_mg"] == others + 900 and others <= 300
    assert all("Lola" not in r for i in p["shopping_list"] for r in i["recipes"])


def test_an_own_meal_can_take_the_day_over_and_says_so_without_blocking():
    p = plan(changes=[{"day": MON, "meal": "Lunch", "own_name": "Party", "own_sodium_mg": 2000}])
    assert p["days"][0]["sodium_mg"] >= 2000
    assert all(m["recipe"] is None for m in p["days"][0]["meals"])  # nothing else fits; the others are "Your choice"


@pytest.mark.parametrize("recipe_id, kw", [("x1", {}), ("l3", {"allergies": ["shellfish"]}), ("l1", {"hidden": {("recipe", "l1")}}), ("b1", {})])
def test_a_swap_that_no_longer_suits_falls_back_with_a_note(recipe_id, kw):
    # a draft, an allergy clash, hidden by the care team, or a breakfast recipe saved as lunch
    p = plan(changes=[{"day": MON, "meal": "Lunch", "recipe_id": recipe_id}], **kw)
    lunch = meal_of(p, 0, "Lunch")
    assert lunch.get("swap_gone") is True and lunch["kind"] in ("plan", "choice")
    assert (lunch["recipe"] or {}).get("id") != recipe_id


def test_saved_recipes_come_first_at_most_twice_a_week_and_never_two_days_running():
    breakfasts = [recipe(f"b{i}", f"Breakfast {i}", "Breakfast", 100 + i) for i in range(7)]
    for n in range(5):
        p = plan(recipes=breakfasts, saved={"b4"}, seed=f"p1:2026-11-16:{n}")
        days = [meal_of(p, i, "Breakfast")["recipe"]["id"] == "b4" for i in range(7)]
        assert days[0]  # picked first on Monday
        assert sum(days) <= 3  # its two turns first, plus at most its own place in the rotation
        assert not any(a and b for a, b in zip(days, days[1:]))
        assert meal_of(p, 0, "Breakfast")["saved"] is True


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
    monkeypatch.setattr(mp, "get_content_repo", lambda: type("C", (), {
        "list_recipes": lambda s: RECIPES, "list_saved_recipes": lambda s, u: []})())
    monkeypatch.setattr(mp.review_feedback, "hidden_items", lambda uid: set())
    monkeypatch.setattr(mp, "get_meal_plan_changes_repo", lambda: CHANGES)
    monkeypatch.setattr(mp, "utc_now", lambda: datetime(2026, 11, 13, 4, 0, tzinfo=timezone.utc))  # a Friday, Manila
    CHANGES.rows.clear()
    saved = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "p1", "role": "patient"}
    yield TestClient(app), profile
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)


class FakeChanges:
    """meal_plan_changes in memory."""

    def __init__(self):
        self.rows = {}

    def list(self, user_id, start, end):
        return [dict(r, day=d, meal=m) for (u, d, m), r in self.rows.items() if u == user_id and start <= d <= end]

    def save(self, user_id, day, meal, row):
        self.rows[(user_id, day, meal)] = row

    def delete_one(self, user_id, day, meal):
        self.rows.pop((user_id, day, meal), None)

    def delete_range(self, user_id, start, end):
        for key in [k for k in self.rows if k[0] == user_id and start <= k[1] <= end]:
            del self.rows[key]


CHANGES = FakeChanges()
PREMIUM = {"plan": "premium", "premium_until": "2099-01-01T00:00:00+00:00"}


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


def test_changing_meals_is_premium_too(api):
    client, _ = api
    assert client.get("/api/meal-plan/options?date=2026-11-17&meal=Lunch").status_code == 403
    assert client.put("/api/meal-plan/changes", json={"date": "2026-11-17", "meal": "Lunch", "recipe_id": "l1"}).status_code == 403
    assert client.delete("/api/meal-plan/changes?week=2026-11-17").status_code == 403


def test_options_suit_the_patient_fit_the_day_and_are_lowest_first(api):
    client, profile = api
    profile.update(PREMIUM)
    body = client.get("/api/meal-plan/options?date=2026-11-17&meal=Lunch").json()
    ids = [o["sodium_mg"] for o in body["options"]]
    assert ids == sorted(ids)
    assert "l3" not in [o["id"] for o in body["options"]]  # shrimp: the patient is allergic to shellfish
    assert all(o["sodium_mg"] <= body["room_mg"] for o in body["options"])
    assert body["current"]["recipe"]["id"] not in [o["id"] for o in body["options"]]


def test_a_swap_and_an_own_meal_show_in_the_plan_and_can_be_put_back(api):
    client, profile = api
    profile.update(PREMIUM)
    assert client.put("/api/meal-plan/changes", json={"date": "2026-11-17", "meal": "Lunch", "recipe_id": "l2"}).status_code == 204
    assert client.put("/api/meal-plan/changes", json={"date": "2026-11-17", "meal": "Dinner", "own": {"name": " Pancit ", "sodium_mg": 610.4, "calories": 420}}).status_code == 204
    tue = client.get("/api/meal-plan?week=2026-11-17").json()["days"][1]
    lunch, dinner = tue["meals"][1], tue["meals"][2]
    assert lunch["kind"] == "swap" and lunch["recipe"]["id"] == "l2"
    assert dinner["kind"] == "own" and dinner["own"] == {"name": "Pancit", "sodium_mg": 610, "calories": 420}

    assert client.delete("/api/meal-plan/changes?date=2026-11-17&meal=Lunch").status_code == 204
    assert client.get("/api/meal-plan?week=2026-11-17").json()["days"][1]["meals"][1]["kind"] != "swap"
    assert client.delete("/api/meal-plan/changes?week=2026-11-17").status_code == 204
    assert client.get("/api/meal-plan?week=2026-11-17").json()["changes"] == 0


@pytest.mark.parametrize("body", [
    {"date": "2026-11-17", "meal": "Lunch", "recipe_id": "l3"},  # shrimp, and the patient is allergic to shellfish
    {"date": "2026-11-17", "meal": "Lunch", "recipe_id": "b1"},  # a breakfast recipe
    {"date": "2026-11-17", "meal": "Lunch", "recipe_id": "x1"},  # a draft
    {"date": "2026-11-17", "meal": "Snack", "recipe_id": "l1"},
    {"date": "2026-11-02", "meal": "Lunch", "recipe_id": "l1"},  # last week
    {"date": "2027-01-04", "meal": "Lunch", "recipe_id": "l1"},  # too far ahead
    {"date": "tuesday", "meal": "Lunch", "recipe_id": "l1"},
    {"date": "2026-11-17", "meal": "Lunch"},  # neither
    {"date": "2026-11-17", "meal": "Lunch", "recipe_id": "l1", "own": {"name": "x", "sodium_mg": 1}},  # both
    {"date": "2026-11-17", "meal": "Lunch", "own": {"name": "  ", "sodium_mg": 100}},
    {"date": "2026-11-17", "meal": "Lunch", "own": {"name": "Feast", "sodium_mg": 20000}},
    {"date": "2026-11-17", "meal": "Lunch", "own": {"name": "Feast", "sodium_mg": 300, "calories": -5}},
])
def test_bad_changes_are_refused(api, body):
    client, profile = api
    profile.update(PREMIUM)
    assert client.put("/api/meal-plan/changes", json=body).status_code == 400
    assert CHANGES.rows == {}
