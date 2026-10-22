from datetime import date
from typing import Any, Dict, Optional

from app.utils.time import utc_now
from app.db.repositories import get_profile_repo, get_baseline_repo

# HL-016 / HL-017: daily food limits from published heart-health guidelines, worked out from the patient's
# profile and setup answers every time they are read, so they follow weight changes with no stored copy.
# Every number and its source is listed in backend/HEALTH_TARGETS.md. Pending review by the cardiologist and
# dietitian. A value set in user_thresholds (by the patient or an expert) always wins.

SODIUM_LIMIT_MG = 1500  # AHA ideal limit for most adults, especially with high blood pressure
SODIUM_CEILING_MG = 2000  # WHO: under 2,000 mg a day for all adults
CHOLESTEROL_LIMIT_MG = 200  # NCEP ATP III Therapeutic Lifestyle Changes (TLC) diet
SAT_FAT_SHARE = 0.06  # AHA: 5-6% of calories for people who need to lower LDL cholesterol
KCAL_PER_G_FAT = 9
DEFAULT_CALORIES = 2000  # used when height, weight, age or sex is missing
WEIGHT_LOSS_KCAL = 500  # about 0.5 kg a week, for a BMI of 25 or more
CALORIE_FLOOR = {"female": 1200, "male": 1500}

# WHO Asia-Pacific BMI cut-offs (lower than the global ones), as used for the Philippines.
BMI_CATEGORIES = [(18.5, "Underweight"), (23.0, "Normal"), (25.0, "Overweight"), (float("inf"), "Obese")]

# Weekly active minutes (vigorous counted twice, as WHO does) -> Mifflin-St Jeor activity factor.
ACTIVITY_LEVELS = [
    (60, 1.2, "little or no exercise"),
    (150, 1.375, "light exercise"),
    (300, 1.55, "moderate exercise"),
    (float("inf"), 1.725, "very active"),
]

SOURCE_AHA_SODIUM = "American Heart Association"
SOURCE_AHA_SAT_FAT = "American Heart Association"
SOURCE_TLC = "NCEP Therapeutic Lifestyle Changes diet"
SOURCE_MIFFLIN = "Mifflin-St Jeor equation"
SOURCE_PERSONAL = "Set for you"
SOURCE_DEFAULT = "Standard adult value"


def _number(value: Any) -> Optional[float]:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n else None


def _age(dob: Any) -> Optional[int]:
    if not dob:
        return None
    try:
        born = dob if isinstance(dob, date) else date.fromisoformat(str(dob)[:10])
    except ValueError:
        return None
    today = utc_now().date()
    years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return years if 0 < years < 120 else None


def bmi_of(height_cm: Any, weight_kg: Any) -> Optional[float]:
    h, w = _number(height_cm), _number(weight_kg)
    if not h or not w or not 100 <= h <= 250 or not 25 <= w <= 300:
        return None
    return round(w / (h / 100) ** 2, 1)


def bmi_category(bmi: Optional[float]) -> Optional[str]:
    if bmi is None:
        return None
    return next(label for upper, label in BMI_CATEGORIES if bmi < upper)


def weekly_active_minutes(answers: Optional[Dict[str, Any]]) -> Optional[float]:
    """Setup answers -> active minutes a week, vigorous counted twice. None when there are no answers."""
    if not answers:
        return None

    def weekly(active: str, kind: str) -> float:
        if not answers.get(active):
            return 0.0
        return (_number(answers.get(f"{kind}_days")) or 0) * (_number(answers.get(f"{kind}_minutes")) or 0)

    return (2 * weekly("vigorous_activity", "vigorous") + weekly("moderate_activity", "moderate")
            + weekly("walk_bike_transport", "walk_bike"))


def activity_level(minutes: Optional[float]) -> tuple:
    """(factor, description). No answers counts as little or no exercise, the lowest and safest factor."""
    for upper, factor, label in ACTIVITY_LEVELS:
        if (minutes or 0) < upper:
            return factor, label
    return ACTIVITY_LEVELS[-1][1], ACTIVITY_LEVELS[-1][2]


def _set_value(thresholds: Optional[Dict[str, Any]], key: str) -> Optional[float]:
    n = _number((thresholds or {}).get(key))
    return n if n and n > 0 else None


def compute_targets(
    profile: Optional[Dict[str, Any]],
    answers: Optional[Dict[str, Any]],
    thresholds: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Daily calories, saturated fat, cholesterol and sodium, each with its source and a short reason."""
    profile = profile or {}
    sex = profile.get("sex") if profile.get("sex") in CALORIE_FLOOR else None
    age = _age(profile.get("date_of_birth"))
    height, weight = _number(profile.get("height_cm")), _number(profile.get("weight_kg"))
    bmi = bmi_of(height, weight)
    category = bmi_category(bmi)

    # ── Calories ──
    missing = [name for name, v in (("height", height), ("weight", weight), ("date of birth", age), ("sex", sex)) if not v]
    if bmi is None and height and weight:  # saved, but outside a realistic range
        missing = ["height", "weight"] + missing
    set_calories = _set_value(thresholds, "daily_calories")
    if set_calories:
        calories = {"value": round(set_calories), "source": SOURCE_PERSONAL,
                    "why": "Set for you by you or your care team."}
    elif missing:
        calories = {"value": DEFAULT_CALORIES, "source": SOURCE_DEFAULT,
                    "why": f"A standard adult amount. Add your {_join(missing)} in your profile for a personal number."}
    else:
        factor, level = activity_level(weekly_active_minutes(answers))
        resting = 10 * weight + 6.25 * height - 5 * age + (5 if sex == "male" else -161)
        target = resting * factor
        why = f"What your body uses in a day at your height, weight and age, with {level}"
        if bmi >= 25:
            target -= WEIGHT_LOSS_KCAL
            why += f", minus {WEIGHT_LOSS_KCAL} for a slow, steady weight loss"
        floor = CALORIE_FLOOR[sex]
        if target < floor:
            target = floor
            why += f". Never set below {floor:,}"
        calories = {"value": int(round(target / 10) * 10), "source": SOURCE_MIFFLIN, "why": why + "."}

    # ── Saturated fat: 6% of the calorie target ──
    sat_fat = {
        "value": round(calories["value"] * SAT_FAT_SHARE / KCAL_PER_G_FAT),
        "source": SOURCE_AHA_SAT_FAT,
        "why": f"About 6% of your {calories['value']:,} daily calories, the amount advised for keeping cholesterol down.",
    }

    # ── Cholesterol ──
    set_chol = _set_value(thresholds, "cholesterol_limit_mg")
    if set_chol and set_chol != CHOLESTEROL_LIMIT_MG:
        cholesterol = {"value": round(set_chol), "source": SOURCE_PERSONAL, "why": "Set for you by you or your care team."}
    else:
        cholesterol = {"value": CHOLESTEROL_LIMIT_MG, "source": SOURCE_TLC,
                       "why": "The heart-healthy eating plan for lowering cholesterol keeps food cholesterol under 200 mg a day."}

    # ── Sodium ──
    set_sodium = _set_value(thresholds, "sodium_limit_mg")
    if set_sodium and set_sodium != SODIUM_LIMIT_MG:
        sodium = {"value": round(set_sodium), "source": SOURCE_PERSONAL, "why": "Set for you by you or your care team."}
    else:
        sodium = {"value": SODIUM_LIMIT_MG, "source": SOURCE_AHA_SODIUM,
                  "why": f"The ideal limit for blood pressure. The World Health Organization's upper limit is {SODIUM_CEILING_MG:,} mg."}

    return {
        "bmi": bmi,
        "bmi_category": category,
        "calories": calories,
        "sat_fat_g": sat_fat,
        "cholesterol_mg": cholesterol,
        "sodium_mg": sodium,
        "missing": missing,
        "pending_expert_review": True,
    }


def targets_for_user(user_id: str, thresholds: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """compute_targets with the patient's profile, setup answers and (unless given) saved limits."""
    baseline_repo = get_baseline_repo()
    profile = get_profile_repo().get_by_id(user_id)
    answers = baseline_repo.get_baseline(user_id)
    if thresholds is None:
        thresholds = baseline_repo.get_thresholds(user_id)
    return compute_targets(profile, answers, thresholds)


def _join(items: list) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]
