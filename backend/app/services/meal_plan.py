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

HL-159: the patient can change single meals. A change is stored (meal_plan_changes) and laid over the worked-out plan: a
swap to another approved recipe that suits them (checked again on every read; if it no longer suits, the plan's own pick
comes back with a note), or "My own meal", their own estimate, which counts against the day's sodium but is shown as an
estimate, never as approved, and isn't on the shopping list. Changed meals stay put; the rest of the day is picked around
them. Saved (bookmarked) recipes are picked first, each at most twice a week and never on two days in a row.

It's a plan to help, not a diet prescription; recipes are approved by a Dietitian, and nothing here is medical advice.
"""
import random
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status

from app.db.repositories import get_baseline_repo, get_content_repo, get_meal_plan_changes_repo, get_profile_repo
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
SAVED_PER_WEEK = 2  # how often one saved recipe is picked first in a week
WEEKS_AHEAD = 4  # how far ahead a meal can be changed
OWN_NAME_MAX = 80
OWN_SODIUM_MAX = 10_000
OWN_CALORIES_MAX = 5_000


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
              yesterday: Dict[str, Optional[str]], budget: float, fixed: Optional[Dict[str, Dict[str, Any]]] = None,
              saved: Optional[set] = None, saved_uses: Optional[Dict[str, int]] = None) -> Dict[str, Optional[Dict[str, Any]]]:
    """The recipes for one day. `fixed` holds the meals the patient changed (meal -> {"kind": "swap", "recipe": ...} or
    {"kind": "own", "sodium_mg": ...}): they stay put and count against the budget, and only the other meals are picked
    or lightened. `saved` recipes go first while they've been used less than SAVED_PER_WEEK times (`saved_uses`)."""
    fixed = fixed or {}
    saved = saved or set()
    saved_uses = saved_uses if saved_uses is not None else {}
    picks: Dict[str, Optional[Dict[str, Any]]] = {}
    used: set = {f["recipe"]["id"] for f in fixed.values() if f["kind"] == "swap"}
    fixed_sodium = sum(_sodium(f["recipe"]) if f["kind"] == "swap" else float(f.get("sodium_mg") or 0) for f in fixed.values())

    def candidates(meal: str) -> List[Dict[str, Any]]:
        pool = pools[meal]
        if not pool:
            return []
        n = len(pool)
        rotated = [pool[order[meal][(day + k) % n]] for k in range(n)]
        fresh = [r for r in rotated if r["id"] not in used and r["id"] != yesterday.get(meal)]
        options = fresh or [r for r in rotated if r["id"] not in used] or rotated
        # Saved recipes first (stable, so the shuffle still decides among them), until each has had its turns this week
        return sorted(options, key=lambda r: not (str(r["id"]) in saved and saved_uses.get(str(r["id"]), 0) < SAVED_PER_WEEK))

    free = [meal for meal in MEALS if meal not in fixed]
    for meal in MEALS:
        if meal in fixed:
            picks[meal] = fixed[meal]["recipe"] if fixed[meal]["kind"] == "swap" else None
            continue
        options = candidates(meal)
        picks[meal] = options[0] if options else None
        if picks[meal]:
            used.add(picks[meal]["id"])

    # Over the day's budget: swap the saltiest free meal for a lower-sodium choice, or leave it as "Your choice"
    for _ in range(len(free)):
        total = fixed_sodium + sum(_sodium(picks[m]) for m in free if picks[m])
        if total <= budget:
            break
        open_meals = [m for m in free if picks[m]]
        if not open_meals:
            break
        meal = max(open_meals, key=lambda m: _sodium(picks[m]))
        others = total - _sodium(picks[meal])
        lighter = [r for r in pools[meal] if r["id"] not in used and others + _sodium(r) <= budget]
        used.discard(picks[meal]["id"])
        picks[meal] = min(lighter, key=_sodium) if lighter else None
        if picks[meal]:
            used.add(picks[meal]["id"])

    for meal in free:
        if picks[meal] and str(picks[meal]["id"]) in saved:
            saved_uses[str(picks[meal]["id"])] = saved_uses.get(str(picks[meal]["id"]), 0) + 1
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
               start: date, hidden: Optional[set] = None, changes: Optional[List[Dict[str, Any]]] = None,
               saved: Optional[set] = None) -> Dict[str, Any]:
    """`changes` are the patient's rows from meal_plan_changes for this week; `saved` their saved recipe ids."""
    pools = suitable_recipes(recipes, diet, allergies, hidden)
    rng = random.Random(seed)
    order = {meal: rng.sample(range(len(pools[meal])), len(pools[meal])) for meal in MEALS}
    budget = sodium_limit * (1 - SNACK_SHARE)
    fixed, gone = _fixed_meals(changes or [], pools)
    saved = {str(i) for i in (saved or set())}
    saved_uses: Dict[str, int] = {}

    days, planned, yesterday = [], [], {meal: None for meal in MEALS}
    for i in range(DAYS):
        iso = (start + timedelta(days=i)).isoformat()
        today_fixed = fixed.get(iso, {})
        picks = _pick_day(pools, order, i, yesterday, budget, today_fixed, saved, saved_uses)
        own_total = sum(float(f.get("sodium_mg") or 0) for f in today_fixed.values() if f["kind"] == "own")
        total = sum(_sodium(r) for r in picks.values() if r) + own_total
        meals = []
        for meal in MEALS:
            r = picks[meal]
            f = today_fixed.get(meal)
            if f and f["kind"] == "own":
                meals.append({"meal": meal, "recipe": None, "kind": "own",
                              "own": {"name": f["name"], "sodium_mg": round(float(f["sodium_mg"])), "calories": f.get("calories")}})
                continue
            if r:
                planned.append(r)
                entry = {"meal": meal, "recipe": _brief(r), "kind": "swap" if f else "plan", "saved": str(r["id"]) in saved}
            else:
                # "Your choice": what's left of the day's budget for this meal
                entry = {"meal": meal, "recipe": None, "kind": "choice", "choice_limit_mg": max(0, round(budget - total))}
            if (iso, meal) in gone:
                entry["swap_gone"] = True
            meals.append(entry)
        days.append({"date": iso, "meals": meals, "sodium_mg": round(total)})
        yesterday = {meal: (picks[meal]["id"] if picks[meal] else None) for meal in MEALS}

    return {
        "week_start": start.isoformat(),
        "sodium_limit_mg": round(sodium_limit),
        "meal_budget_mg": round(budget),
        "recipes_available": {meal: len(pools[meal]) for meal in MEALS},
        "days": days,
        "changes": sum(1 for d in days for m in d["meals"] if m["kind"] in ("swap", "own")),
        "shopping_list": shopping_list(planned),
        "note": NOTE,
    }


def _fixed_meals(changes: List[Dict[str, Any]], pools: Dict[str, List[Dict[str, Any]]]) -> Tuple[Dict[str, Dict[str, Dict[str, Any]]], set]:
    """The patient's changes by day and meal. A swap counts only while its recipe still suits them (it's in that meal's
    pool: approved, no allergy or diet clash, not hidden by the care team); otherwise it's listed in `gone`."""
    by_id = {meal: {str(r["id"]): r for r in pools[meal]} for meal in MEALS}
    fixed: Dict[str, Dict[str, Dict[str, Any]]] = {}
    gone: set = set()
    for row in changes:
        day, meal = str(row.get("day") or "")[:10], row.get("meal")
        if meal not in MEALS or not day:
            continue
        if row.get("recipe_id"):
            recipe = by_id[meal].get(str(row["recipe_id"]))
            if recipe:
                fixed.setdefault(day, {})[meal] = {"kind": "swap", "recipe": recipe}
            else:
                gone.add((day, meal))
        elif row.get("own_name"):
            fixed.setdefault(day, {})[meal] = {"kind": "own", "name": row["own_name"],
                                                "sodium_mg": row.get("own_sodium_mg") or 0, "calories": row.get("own_calories")}
    return fixed, gone


def _week_of(week: Optional[str]) -> date:
    try:
        day = date.fromisoformat(week) if week else to_local_date(utc_now(), TZ)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The week must be a date like 2026-11-16.")
    return week_start(day)


def _check_shuffle(shuffle: int) -> None:
    if not 0 <= shuffle <= MAX_SHUFFLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a plan number from 0 to 10000.")


def _patient(user_id: str) -> Dict[str, Any]:
    """Everything the plan needs about the patient."""
    profile = get_profile_repo().get_by_id(user_id) or {}
    pid = profile.get("id") or user_id
    baseline = get_baseline_repo()
    answers = baseline.get_baseline(pid) or {}
    thresholds = baseline.get_thresholds(pid)
    return {
        "id": pid,
        "sodium_limit": float(compute_targets(profile, answers, thresholds)["sodium_mg"]["value"]),
        "diet": answers.get("dietary_practice") or "",
        "allergies": answers.get("allergies") or [],
        "hidden": review_feedback.hidden_items(pid),
    }


def _build(patient: Dict[str, Any], start: date, shuffle: int) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    recipes = get_content_repo().list_recipes()
    end = start + timedelta(days=DAYS - 1)
    changes = get_meal_plan_changes_repo().list(patient["id"], start.isoformat(), end.isoformat())
    saved = {str(r.get("id")) for r in get_content_repo().list_saved_recipes(patient["id"]) if r.get("id")}
    plan = build_plan(
        recipes,
        patient["sodium_limit"],
        patient["diet"],
        patient["allergies"],
        seed=f"{patient['id']}:{start.isoformat()}:{shuffle}",
        start=start,
        hidden=patient["hidden"],
        changes=changes,
        saved=saved,
    )
    return {**plan, "shuffle": shuffle}, recipes


def plan_for(user_id: str, week: Optional[str] = None, shuffle: int = 0) -> Dict[str, Any]:
    """The plan for the patient's week (Monday start, Manila time). `week` is any date in that week."""
    _check_shuffle(shuffle)
    plan, _ = _build(_patient(user_id), _week_of(week), shuffle)
    return plan


def _slot(day: str, meal: str) -> date:
    """A day and meal the patient may change: this week or up to WEEKS_AHEAD weeks ahead."""
    if meal not in MEALS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The meal must be Breakfast, Lunch or Dinner.")
    try:
        d = date.fromisoformat(day)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The day must be a date like 2026-11-16.")
    this_week = week_start(to_local_date(utc_now(), TZ))
    if not this_week <= d < this_week + timedelta(weeks=WEEKS_AHEAD + 1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can change this week's meals or the next few weeks'.")
    return d


def options_for(user_id: str, day: str, meal: str, shuffle: int = 0) -> Dict[str, Any]:
    """The approved recipes the patient can swap in for this meal: they suit them and keep the day within its sodium
    budget once the other two meals are counted, lowest sodium first."""
    _check_shuffle(shuffle)
    d = _slot(day, meal)
    patient = _patient(user_id)
    plan, recipes = _build(patient, week_start(d), shuffle)
    today = next(x for x in plan["days"] if x["date"] == d.isoformat())
    current = next(m for m in today["meals"] if m["meal"] == meal)

    def sodium_of(m: Dict[str, Any]) -> float:
        if m.get("own"):
            return float(m["own"]["sodium_mg"])
        return float(m["recipe"]["sodium_mg"]) if m.get("recipe") else 0.0

    others = sum(sodium_of(m) for m in today["meals"] if m["meal"] != meal)
    room = plan["meal_budget_mg"] - others
    pool = suitable_recipes(recipes, patient["diet"], patient["allergies"], patient["hidden"])[meal]
    saved = {str(r.get("id")) for r in get_content_repo().list_saved_recipes(patient["id"]) if r.get("id")}
    current_id = str(current["recipe"]["id"]) if current.get("recipe") else None
    fits = sorted((r for r in pool if _sodium(r) <= room and str(r["id"]) != current_id), key=lambda r: (_sodium(r), str(r.get("name") or "")))
    return {
        "date": d.isoformat(),
        "meal": meal,
        "room_mg": max(0, round(room)),
        "current": current,
        "options": [{**_brief(r), "saved": str(r["id"]) in saved} for r in fits],
    }


def change_meal(user_id: str, day: str, meal: str, recipe_id: Optional[str] = None,
                own: Optional[Dict[str, Any]] = None) -> None:
    """Swap one meal to an approved recipe that suits the patient, or make it "My own meal" (their estimate)."""
    d = _slot(day, meal)
    patient = _patient(user_id)
    if bool(recipe_id) == bool(own):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a recipe or describe your own meal.")
    if recipe_id:
        pool = suitable_recipes(get_content_repo().list_recipes(), patient["diet"], patient["allergies"], patient["hidden"])[meal]
        if str(recipe_id) not in {str(r["id"]) for r in pool}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That recipe isn't available for this meal.")
        row: Dict[str, Any] = {"recipe_id": str(recipe_id)}
    else:
        name = str((own or {}).get("name") or "").strip()
        try:
            sodium = int(round(float((own or {}).get("sodium_mg"))))
            calories_raw = (own or {}).get("calories")
            calories = None if calories_raw in (None, "") else int(round(float(calories_raw)))
        except (TypeError, ValueError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sodium and calories must be numbers.")
        if not 1 <= len(name) <= OWN_NAME_MAX:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Give the meal a name of up to {OWN_NAME_MAX} characters.")
        if not 0 <= sodium <= OWN_SODIUM_MAX or (calories is not None and not 0 <= calories <= OWN_CALORIES_MAX):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Those numbers look too high. Check them and try again.")
        row = {"own_name": name, "own_sodium_mg": sodium, "own_calories": calories}
    get_meal_plan_changes_repo().save(patient["id"], d.isoformat(), meal, row)


def put_back(user_id: str, day: str, meal: str) -> None:
    """The plan's own pick again for this meal."""
    d = _slot(day, meal)
    get_meal_plan_changes_repo().delete_one(_patient(user_id)["id"], d.isoformat(), meal)


def undo_week(user_id: str, week: Optional[str] = None) -> None:
    """Every change in that week."""
    start = _week_of(week)
    pid = (get_profile_repo().get_by_id(user_id) or {}).get("id") or user_id
    get_meal_plan_changes_repo().delete_range(pid, start.isoformat(), (start + timedelta(days=DAYS - 1)).isoformat())
