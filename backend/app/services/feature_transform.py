from datetime import date
from typing import Any, Dict, Optional

import pandas as pd

from app.utils.time import utc_now

# Turns setup answers into the starting score's inputs, with the same meanings the model was trained on
# (scripts/train_starting_score.py, NHANES 2017-2018). Unknown answers stay empty and the model fills them with
# the training median. Heavier habits always give larger numbers.

INPUTS = [
    "age", "male", "bmi", "current_smoker", "former_smoker", "active_min_week",
    "sitting_hours", "sleep_hours", "drinks_week", "binge_days_year",
]

SITTING_HOURS = {"<2h": 1.0, "2-4h": 3.0, "4-6h": 5.0, "6-8h": 7.0, "8+h": 9.0}
# Setup's drinking answers as times per year, the scale the training data uses.
TIMES_PER_YEAR = {"Never": 0.0, "Monthly or less": 12.0, "2-4x/month": 36.0, "2-3x/week": 130.0, "4+/week": 230.0}
DRINKS_PER_OCCASION = {"1-2": 1.5, "3-4": 3.5, "5+": 5.5}
NHANES_MAX_AGE = 80  # NHANES records everyone over 80 as 80


def _number(value: Any) -> Optional[float]:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n else None


def _age(dob: Any, on: Optional[date] = None) -> Optional[float]:
    """Age in whole years on a day (default today), capped like NHANES records it."""
    if not dob:
        return None
    try:
        born = pd.to_datetime(dob).date() if not isinstance(dob, date) else dob
    except (ValueError, TypeError):
        return None
    today = on or utc_now().date()
    years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return float(min(max(years, 0), NHANES_MAX_AGE))


def _bmi(profile: Dict[str, Any]) -> Optional[float]:
    height_cm, weight_kg = _number(profile.get("height_cm")), _number(profile.get("weight_kg"))
    if not height_cm or not weight_kg or not 100 <= height_cm <= 250 or not 25 <= weight_kg <= 300:
        return None
    return min(max(weight_kg / (height_cm / 100) ** 2, 15.0), 60.0)


def _weekly(active: Any, days: Any, minutes: Any) -> Optional[float]:
    if not active:
        return 0.0
    d, m = _number(days), _number(minutes)
    return d * m if d and m else None


def transform_to_model_features(data: Dict[str, Any], user_profile: Dict[str, Any]) -> pd.DataFrame:
    """One row of the starting score's inputs (INPUTS order) from setup answers and the profile."""
    smokes = bool(data.get("ever_smoked"))
    quit_smoking = data.get("smoke_now") == "Not at all"

    vigorous = _weekly(data.get("vigorous_activity"), data.get("vigorous_days"), data.get("vigorous_minutes"))
    moderate = _weekly(data.get("moderate_activity"), data.get("moderate_days"), data.get("moderate_minutes"))
    walking = _weekly(data.get("walk_bike_transport"), data.get("walk_bike_days"), data.get("walk_bike_minutes"))
    active = None if None in (vigorous, moderate, walking) else min(2 * vigorous + moderate + walking, 3000.0)

    drinks = bool(data.get("ever_drank"))
    drink_times = TIMES_PER_YEAR.get(data.get("drink_frequency") or "Never", 0.0) if drinks else 0.0
    per_occasion = DRINKS_PER_OCCASION.get(data.get("drinks_per_occasion"))
    if drink_times == 0:
        drinks_week = 0.0
    else:
        drinks_week = min(drink_times * per_occasion / 52, 70.0) if per_occasion else None
    binge = TIMES_PER_YEAR.get(data.get("binge_drinking_freq") or "Never", 0.0) if drink_times > 0 else 0.0

    sex = user_profile.get("sex")
    row = {
        "age": _age(user_profile.get("date_of_birth")),
        "male": 1.0 if sex == "male" else 0.0 if sex == "female" else None,
        "bmi": _bmi(user_profile),
        "current_smoker": 1.0 if smokes and not quit_smoking else 0.0,
        "former_smoker": 1.0 if smokes and quit_smoking else 0.0,
        "active_min_week": active,
        "sitting_hours": SITTING_HOURS.get(data.get("sedentary_hours")),
        "sleep_hours": _number(data.get("sleep_hours")),
        "drinks_week": drinks_week,
        "binge_days_year": binge,
    }
    return pd.DataFrame([row], columns=INPUTS, dtype=float)
