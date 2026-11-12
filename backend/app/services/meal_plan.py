"""
HL-155: the weekly meal plan and shopping list (Premium).

Seven days of breakfast, lunch and dinner from the Dietitian-approved recipes (the same ones patients can see), leaving out
any that clash with the patient's allergies or diet (dashboard.recipe_warnings, used for suggestions too). Each day stays
under the patient's daily sodium limit (nutrition_targets.compute_targets), keeping 20% for snacks and drinks. The same
recipe isn't used twice in a day, or on two days in a row when there's another choice. A meal with no suitable recipe
yet is "Your choice", with how much sodium is left for it.

The plan is worked out, not stored: the same patient, week and shuffle number always give the same plan, so it stays put
all week, and "Make a new plan" just asks for the next shuffle number. The shopping list adds up every ingredient for one
person (one serving per meal); the phone multiplies it for more people.

It's a plan to help, not a diet prescription; recipes are approved by a Dietitian, and nothing here is medical advice.
"""
import random
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status

from app.db.repositories import get_baseline_repo, get_content_repo, get_profile_repo
from app.services.dashboard import recipe_warnings
from app.services.health_report import TZ
from app.services.nutrition_targets import compute_targets
from app.services import review_feedback
from app.services.recipes import is_visible_to_patients
from app.utils.time import to_local_date, utc_now

MEALS = ("Breakfast", "Lunch", "Dinner")
DAYS = 7
SNACK_SHARE = 0.2  # of the daily sodium limit, kept for snacks and drinks
MAX_SHUFFLE = 10_000
NOTE = "Recipes approved by a Dietitian, chosen to fit your sodium limit and allergies. It's a plan to help, not a diet prescription."


def week_start(day: date) -> date:
    """The Monday of that week."""
    return day - timedelta(days=day.weekday())


def _sodium(recipe: Dict[str, Any]) -> float:
    try:
        return float(recipe.get("sodium_mg") or 0)
    except (TypeError, ValueError):
        return 0.0


def _servings(recipe: Dict[str, Any]) -> float:
    try:
        return max(1.0, float(recipe.get("servings") or 1))
    except (TypeError, ValueError):
        return 1.0


def suitable_recipes(recipes: List[Dict[str, Any]], diet: str, allergies: List[str],
                     hidden: Optional[set] = None) -> Dict[str, List[Dict[str, Any]]]:
    """Approved recipes that suit this patient, by meal (Breakfast / Lunch / Dinner), in a stable order. `hidden` is
    what the care team marked not suitable for this patient (HL-057), left out as in the suggestions."""
    pools: Dict[str, List[Dict[str, Any]]] = {meal: [] for meal in MEALS}
    hidden = hidden or set()
    for r in recipes:
        if (is_visible_to_patients(r) and r.get("category") in pools and not recipe_warnings(r, diet, allergies)
                and ("recipe", str(r.get("id"))) not in hidden):
            pools[r["category"]].append(r)
    for meal in MEALS:
        pools[meal].sort(key=lambda r: (str(r.get("name") or ""), str(r.get("id"))))
    return pools


def _pick_day(pools: Dict[str, List[Dict[str, Any]]], order: Dict[str, List[int]], day: int,
              yesterday: Dict[str, Optional[str]], budget: float) -> Dict[str, Optional[Dict[str, Any]]]:
    picks: Dict[str, Optional[Dict[str, Any]]] = {}
    used: set = set()

    def candidates(meal: str) -> List[Dict[str, Any]]:
        pool = pools[meal]
        if not pool:
            return []
        n = len(pool)
        rotated = [pool[order[meal][(day + k) % n]] for k in range(n)]
        fresh = [r for r in rotated if r["id"] not in used and r["id"] != yesterday.get(meal)]
        return fresh or [r for r in rotated if r["id"] not in used] or rotated

    for meal in MEALS:
        options = candidates(meal)
        picks[meal] = options[0] if options else None
        if picks[meal]:
            used.add(picks[meal]["id"])

    # Over the day's budget: swap the saltiest meal for a lower-sodium choice, or leave it as "Your choice"
    for _ in range(len(MEALS)):
        total = sum(_sodium(r) for r in picks.values() if r)
        if total <= budget:
            break
        meal = max((m for m in MEALS if picks[m]), key=lambda m: _sodium(picks[m]))
        others = total - _sodium(picks[meal])
        lighter = [r for r in pools[meal] if r["id"] not in used and others + _sodium(r) <= budget]
        used.discard(picks[meal]["id"])
        picks[meal] = min(lighter, key=_sodium) if lighter else None
        if picks[meal]:
            used.add(picks[meal]["id"])
    return picks


def _clean_name(name: str) -> str:
    """"Quinoa, rinsed" -> "Quinoa"; "Garlic (minced)" -> "Garlic"."""
    text = re.sub(r"\([^)]*\)", "", str(name or "")).split(",")[0].strip()
    return text[:1].upper() + text[1:] if text else ""


def shopping_list(planned: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Every ingredient for one person (one serving per planned meal), added up when the unit matches."""
    items: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for recipe in planned:
        per_serving = 1.0 / _servings(recipe)
        for ing in recipe.get("ingredients") or []:
            if not isinstance(ing, dict):
                continue
            name = _clean_name(ing.get("name"))
            if not name:
                continue
            unit = str(ing.get("unit") or "").strip()
            key = (name.lower(), unit.lower())
            item = items.setdefault(key, {"name": name, "unit": unit, "amount": 0.0, "recipes": []})
            try:
                item["amount"] += float(ing.get("amount") or 0) * per_serving
            except (TypeError, ValueError):
                pass
            if recipe.get("name") and recipe["name"] not in item["recipes"]:
                item["recipes"].append(recipe["name"])
    out = sorted(items.values(), key=lambda i: i["name"].lower())
    for item in out:
        item["amount"] = round(item["amount"], 2)
    return out


def _brief(recipe: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": str(recipe["id"]), "name": recipe.get("name"), "image_url": recipe.get("image_url") or None,
            "sodium_mg": round(_sodium(recipe)), "calories": recipe.get("calories")}


def build_plan(recipes: List[Dict[str, Any]], sodium_limit: float, diet: str, allergies: List[str], seed: str,
               start: date, hidden: Optional[set] = None) -> Dict[str, Any]:
    pools = suitable_recipes(recipes, diet, allergies, hidden)
    rng = random.Random(seed)
    order = {meal: rng.sample(range(len(pools[meal])), len(pools[meal])) for meal in MEALS}
    budget = sodium_limit * (1 - SNACK_SHARE)

    days, planned, yesterday = [], [], {meal: None for meal in MEALS}
    for i in range(DAYS):
        picks = _pick_day(pools, order, i, yesterday, budget)
        total = sum(_sodium(r) for r in picks.values() if r)
        meals = []
        for meal in MEALS:
            r = picks[meal]
            if r:
                planned.append(r)
                meals.append({"meal": meal, "recipe": _brief(r)})
            else:
                # "Your choice": what's left of the day's budget for this meal
                meals.append({"meal": meal, "recipe": None, "choice_limit_mg": max(0, round(budget - total))})
        days.append({"date": (start + timedelta(days=i)).isoformat(), "meals": meals, "sodium_mg": round(total)})
        yesterday = {meal: (picks[meal]["id"] if picks[meal] else None) for meal in MEALS}

    return {
        "week_start": start.isoformat(),
        "sodium_limit_mg": round(sodium_limit),
        "meal_budget_mg": round(budget),
        "recipes_available": {meal: len(pools[meal]) for meal in MEALS},
        "days": days,
        "shopping_list": shopping_list(planned),
        "note": NOTE,
    }


def plan_for(user_id: str, week: Optional[str] = None, shuffle: int = 0) -> Dict[str, Any]:
    """The plan for the patient's week (Monday start, Manila time). `week` is any date in that week."""
    if not 0 <= shuffle <= MAX_SHUFFLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a plan number from 0 to 10000.")
    try:
        day = date.fromisoformat(week) if week else to_local_date(utc_now(), TZ)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The week must be a date like 2026-11-16.")
    start = week_start(day)

    profile = get_profile_repo().get_by_id(user_id) or {}
    baseline = get_baseline_repo()
    answers = baseline.get_baseline(profile.get("id") or user_id) or {}
    thresholds = baseline.get_thresholds(profile.get("id") or user_id)
    sodium_limit = compute_targets(profile, answers, thresholds)["sodium_mg"]["value"]
    plan = build_plan(
        get_content_repo().list_recipes(),
        float(sodium_limit),
        answers.get("dietary_practice") or "",
        answers.get("allergies") or [],
        seed=f"{profile.get('id') or user_id}:{start.isoformat()}:{shuffle}",
        start=start,
        hidden=review_feedback.hidden_items(profile.get("id") or user_id),
    )
    return {**plan, "shuffle": shuffle}
