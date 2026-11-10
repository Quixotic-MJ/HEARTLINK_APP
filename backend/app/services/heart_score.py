"""The Heart score: based on the American Heart Association's Life's Essential 8 (Lloyd-Jones et al., Circulation, 2022).

Each area gets the AHA's points from 0 to 100, the score is the average of the areas with data, and HeartLink's own
blood pressure rules then set limits on it. It's a wellness indicator: not the official AHA score, not validated, and
not a diagnosis or a risk prediction. Every rule and where it comes from is in app/ml/HEART_SCORE.md.

The first score after setup comes from the machine learning model instead (starting_score.py), and this takes over at
the first log. The small functions at the top are the tables. `score_from` puts them together without touching the database, and
`recalculate_score` loads a patient's data and saves the result.
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.services.coach_note import _alive, _day, _local_now
from app.services.feature_transform import _bmi, _weekly
from app.services.hss_service import _sodium_limit, determine_tier, is_emergency_reading
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

METHOD_VERSION = "heart-score-le8-v1"
SOURCE = "heart_score"
AREAS_TOTAL = 8  # blood sugar and cholesterol need lab results, so usually 6 of these have data
LAB_VALID_DAYS = 365  # HL-138: a lab result counts for 12 months from the test date

WEEK_DAYS = 7
READING_LIMIT_DAYS = 30
SETUP_ANSWERS_DAYS = 7  # setup answers stand in for logs during the first week
MIN_MEAL_DAYS = 3  # sodium uses logged meals once this many days have them
ACTIVITY_GOAL_MINUTES = 150
EFFORT_COUNTS_IN_FULL = 5

STAGE_1_LIMIT = 79
STAGE_2_LIMIT = 59
NO_READING_LIMIT = 79
EMERGENCY_LIMIT = 49
FLOOR = 50

QUIT_WHEN = ("under_1_year", "1_to_5_years", "5_plus_years")


# ── The tables ────────────────────────────────────────────────────────────────────────────────────────────────────


def bp_points(systolic: float, diastolic: float) -> int:
    """AHA points for blood pressure. Medicine isn't deducted: see HEART_SCORE.md."""
    if systolic >= 160 or diastolic >= 100:
        return 0
    if systolic >= 140 or diastolic >= 90:
        return 25
    if systolic >= 130 or diastolic >= 80:
        return 50
    if systolic >= 120:
        return 75
    return 100


def bp_limit(systolic: float, diastolic: float) -> Optional[int]:
    """HeartLink's rule: good habits can't hide high blood pressure."""
    if systolic >= 140 or diastolic >= 90:
        return STAGE_2_LIMIT
    if systolic >= 130 or diastolic >= 80:
        return STAGE_1_LIMIT
    return None


def activity_points(minutes: float) -> int:
    """AHA points for activity minutes in a week."""
    if minutes >= ACTIVITY_GOAL_MINUTES:
        return 100
    if minutes >= 120:
        return 90
    if minutes >= 90:
        return 80
    if minutes >= 60:
        return 60
    if minutes >= 30:
        return 40
    if minutes > 0:
        return 20
    return 0


def sleep_points(hours: float) -> int:
    """AHA points for average hours of sleep."""
    if hours >= 10:
        return 40
    if hours >= 9:
        return 90
    if hours >= 7:
        return 100
    if hours >= 6:
        return 70
    if hours >= 5:
        return 40
    if hours >= 4:
        return 20
    return 0


def nicotine_points(ever_smoked: Any, smoke_now: Any, quit_when: Any) -> int:
    """AHA points for nicotine. Setup asks about cigarettes, vapes and other tobacco together, so any current use is 0.
    Someone who quit without saying when counts as under a year ago until they answer in Settings."""
    if not ever_smoked:
        return 100
    if smoke_now != "Not at all":
        return 0
    if quit_when == "5_plus_years":
        return 75
    if quit_when == "1_to_5_years":
        return 50
    return 25


def bmi_points(bmi: float) -> Optional[int]:
    """AHA points, Asian and Pacific row. The row starts at 18.5, so under that isn't scored until a reviewer decides."""
    if bmi < 18.5:
        return None
    if bmi < 23:
        return 100
    if bmi < 25:
        return 75
    if bmi < 30:
        return 50
    if bmi < 35:
        return 25
    return 0


def cholesterol_points(total: float, hdl: float, on_medicine: Any) -> int:
    """HL-138: AHA points for non-HDL cholesterol (total minus HDL, mg/dL), minus 20 for cholesterol medicine."""
    non_hdl = total - hdl
    if non_hdl < 130:
        points = 100
    elif non_hdl < 160:
        points = 60
    elif non_hdl < 190:
        points = 40
    elif non_hdl < 220:
        points = 20
    else:
        points = 0
    return max(0, points - 20) if on_medicine else points


def blood_sugar_points(fasting: Optional[float], hba1c: Optional[float], has_diabetes: Any) -> Optional[int]:
    """HL-138: AHA points for blood sugar. Without diabetes: fasting under 100 or HbA1c under 5.7 is 100, otherwise 60.
    With diabetes the AHA uses HbA1c only, so a fasting result alone isn't scored."""
    if has_diabetes:
        if hba1c is None:
            return None
        if hba1c < 7:
            return 40
        if hba1c < 8:
            return 30
        if hba1c < 9:
            return 20
        if hba1c < 10:
            return 10
        return 0
    if hba1c is not None:
        return 100 if hba1c < 5.7 else 60
    if fasting is not None:
        return 100 if fasting < 100 else 60
    return None


def _often_points(answer: Any) -> Optional[int]:
    return {"rarely": 2, "sometimes": 1, "often": 0, "daily": 0}.get(answer)


def sodium_habit_points(days_over: int, meal_days: int, salty_answer: Any) -> Optional[int]:
    """0 to 2 for sodium: days over the limit once there are enough logged meals, the setup answer before that."""
    if meal_days >= MIN_MEAL_DAYS:
        return 2 if days_over == 0 else 1 if days_over <= 2 else 0
    return _often_points(salty_answer)


def diet_points(fruit_veg: Any, fried: Any, sodium_habit: Optional[int]) -> Optional[int]:
    """HeartLink's adapted diet score, not the AHA's questionnaire: three habits scored 0 to 2, total mapped to AHA levels."""
    fruit = {"6+": 2, "4-5": 2, "2-3": 1, "0-1": 0}.get(fruit_veg)
    fatty = _often_points(fried)
    if fruit is None or fatty is None or sodium_habit is None:
        return None
    total = fruit + fatty + sodium_habit
    if total == 6:
        return 100
    if total == 5:
        return 80
    if total >= 3:
        return 50
    if total >= 1:
        return 25
    return 0


def effective_minutes(log: Dict[str, Any], intensity: Any) -> float:
    """Minutes that count: vigorous double, moderate in full, light half unless the effort rating is 5 or more.
    Breathing exercises (intensity "None") don't count. A log with no known intensity counts as light."""
    minutes = log.get("duration_minutes")
    if not minutes:
        minutes = (log.get("duration_seconds") or 0) / 60
    level = str(intensity or "").strip().lower()
    if level == "none":
        return 0.0
    if level in ("high", "vigorous"):
        return minutes * 2.0
    if level == "moderate":
        return float(minutes)
    effort = log.get("effort_rating")
    return float(minutes) if isinstance(effort, (int, float)) and effort >= EFFORT_COUNTS_IN_FULL else minutes / 2


def final_score(average: int, latest_emergency: bool, average_bp: Optional[Tuple[int, int]], recent_reading: bool) -> Tuple[int, Optional[str]]:
    """HeartLink's rules on top of the average: returns the score and the rule that changed it, if any."""
    if latest_emergency:
        score = max(1, min(average, EMERGENCY_LIMIT))
        return score, ("emergency_limit" if score != average else None)
    limits = []
    if average_bp is not None:
        limit = bp_limit(*average_bp)
        if limit is not None:
            limits.append((limit, "stage_2_limit" if limit == STAGE_2_LIMIT else "stage_1_limit"))
    if not recent_reading:
        limits.append((NO_READING_LIMIT, "no_recent_reading"))
    score, rule = average, None
    for limit, name in sorted(limits):
        if score > limit:
            score, rule = limit, name
    if score < FLOOR:
        return FLOOR, "floor"
    return score, rule


# ── Putting it together ───────────────────────────────────────────────────────────────────────────────────────────


def _round(value: float) -> int:
    """Rounds halves up, so 72.5 is 73 (Python's round would give 72)."""
    return int(math.floor(value + 0.5))


def _setup_minutes(baseline: Dict[str, Any]) -> Optional[float]:
    parts = [
        (_weekly(baseline.get("vigorous_activity"), baseline.get("vigorous_days"), baseline.get("vigorous_minutes")), 2),
        (_weekly(baseline.get("moderate_activity"), baseline.get("moderate_days"), baseline.get("moderate_minutes")), 1),
        (_weekly(baseline.get("walk_bike_transport"), baseline.get("walk_bike_days"), baseline.get("walk_bike_minutes")), 1),
    ]
    if any(minutes is None for minutes, _ in parts):
        return None
    return sum(minutes * weight for minutes, weight in parts)


def _reading_time(row: Dict[str, Any]) -> str:
    return str(row.get("logged_at") or "")


def score_from(
    *,
    baseline: Optional[Dict[str, Any]],
    profile: Optional[Dict[str, Any]],
    health_logs: List[Dict[str, Any]],
    exercise_logs: List[Dict[str, Any]],
    sleep_logs: List[Dict[str, Any]],
    meal_logs: List[Dict[str, Any]],
    routines: Optional[List[Dict[str, Any]]] = None,
    sodium_limit: float = 1500.0,
    lab_results: Optional[List[Dict[str, Any]]] = None,
    now: Optional[datetime] = None,
) -> Optional[Dict[str, Any]]:
    """The score from a patient's data, or None if no area has data yet."""
    today = _local_now(now).date()
    week = {today - timedelta(days=i) for i in range(WEEK_DAYS)}
    baseline = baseline or {}
    profile = profile or {}
    areas: Dict[str, Dict[str, Any]] = {}

    first_week = False
    answered = _day(baseline.get("created_at"))
    if answered:
        first_week = (today - answered).days < SETUP_ANSWERS_DAYS

    # Blood pressure: the last 7 days' average, or the latest reading from the last 30 days if there's none this week
    readings = sorted(
        (r for r in health_logs if _alive(r) and r.get("systolic_bp") and r.get("diastolic_bp")),
        key=_reading_time,
        reverse=True,
    )
    latest = readings[0] if readings else None
    latest_emergency = bool(latest) and is_emergency_reading(float(latest["systolic_bp"]), float(latest["diastolic_bp"]))
    latest_day = _day(latest.get("logged_at")) if latest else None
    recent_reading = bool(latest_day) and (today - latest_day).days < READING_LIMIT_DAYS
    this_week = [r for r in readings if _day(r.get("logged_at")) in week]
    used = this_week or ([latest] if recent_reading else [])
    average_bp: Optional[Tuple[int, int]] = None
    if used:
        average_bp = (
            _round(sum(float(r["systolic_bp"]) for r in used) / len(used)),
            _round(sum(float(r["diastolic_bp"]) for r in used) / len(used)),
        )
        areas["blood_pressure"] = {
            "points": bp_points(*average_bp),
            "systolic": average_bp[0],
            "diastolic": average_bp[1],
            "readings": len(used),
            "days": WEEK_DAYS if this_week else READING_LIMIT_DAYS,
        }

    # Activity: logged minutes this week. The setup answer stands in during the first week, until the logs pass it.
    intensity_of = {str(r.get("id")): r.get("intensity") for r in (routines or [])}
    logged = sum(
        effective_minutes(e, intensity_of.get(str(e.get("routine_id"))))
        for e in exercise_logs
        if _alive(e) and e.get("status", "completed") != "abandoned" and _day(e.get("logged_at")) in week
    )
    setup_minutes = _setup_minutes(baseline) if (first_week and baseline) else None
    from_setup = setup_minutes is not None and setup_minutes > logged
    if baseline or logged:
        areas["activity"] = {
            "points": activity_points(setup_minutes if from_setup else logged),
            "minutes": _round(logged),
            "goal": ACTIVITY_GOAL_MINUTES,
            "from": "setup" if from_setup else "logs",
        }

    # Sleep: the average of the nights logged this week; the setup answer during the first week
    nights: Dict[Any, float] = {}
    for s in sleep_logs:
        day = _day(s.get("logged_at"))
        if _alive(s) and day in week:
            nights[day] = nights.get(day, 0.0) + float(s.get("duration_hours") or 0)
    if nights:
        hours = sum(nights.values()) / len(nights)
        areas["sleep"] = {"points": sleep_points(hours), "hours": round(hours, 1), "nights": len(nights), "from": "logs"}
    elif first_week and baseline.get("sleep_hours"):
        hours = float(baseline["sleep_hours"])
        areas["sleep"] = {"points": sleep_points(hours), "hours": round(hours, 1), "nights": 0, "from": "setup"}

    # Nicotine: setup answers, kept up to date in Settings
    if baseline:
        quit_when = baseline.get("smoke_quit_when")
        areas["nicotine"] = {
            "points": nicotine_points(baseline.get("ever_smoked"), baseline.get("smoke_now"), quit_when),
            "status": "never" if not baseline.get("ever_smoked") else "current" if baseline.get("smoke_now") != "Not at all" else "quit",
            "quit_when": quit_when,
        }

    # Body weight: BMI from the profile
    bmi = _bmi(profile)
    if bmi is not None:
        points = bmi_points(bmi)
        if points is not None:
            areas["body_weight"] = {"points": points, "bmi": round(bmi, 1)}

    # Diet: the adapted score
    meal_totals: Dict[Any, float] = {}
    for m in meal_logs:
        day = _day(m.get("logged_at"))
        if _alive(m) and day in week:
            meal_totals[day] = meal_totals.get(day, 0.0) + float(m.get("sodium_mg") or 0)
    days_over = sum(1 for total in meal_totals.values() if total > sodium_limit)
    diet = diet_points(
        baseline.get("fruit_veg_servings"),
        baseline.get("fried_food_freq"),
        sodium_habit_points(days_over, len(meal_totals), baseline.get("salty_food_freq")),
    )
    if diet is not None:
        areas["diet"] = {
            "points": diet,
            "sodium_days_over": days_over,
            "meal_days": len(meal_totals),
            "sodium_from": "logs" if len(meal_totals) >= MIN_MEAL_DAYS else "setup",
        }

    # HL-138: cholesterol and blood sugar, only when the person added a lab result from the last 12 months
    for lab in lab_results or []:
        tested = _day(lab.get("test_date"))
        if not tested or (today - tested).days >= LAB_VALID_DAYS or tested > today:
            continue
        number = lambda key: float(lab[key]) if lab.get(key) is not None else None
        if lab.get("kind") == "cholesterol" and lab.get("total_cholesterol") is not None and lab.get("hdl") is not None:
            total, hdl = number("total_cholesterol"), number("hdl")
            areas["cholesterol"] = {
                "points": cholesterol_points(total, hdl, lab.get("cholesterol_medicine")),
                "non_hdl": _round(total - hdl),
                "medicine": bool(lab.get("cholesterol_medicine")),
                "test_date": tested.isoformat(),
            }
        elif lab.get("kind") == "blood_sugar":
            points = blood_sugar_points(number("fasting_glucose"), number("hba1c"), lab.get("has_diabetes"))
            if points is not None:
                areas["blood_sugar"] = {
                    "points": points,
                    "hba1c": number("hba1c"),
                    "fasting": number("fasting_glucose"),
                    "diabetes": bool(lab.get("has_diabetes")),
                    "test_date": tested.isoformat(),
                }

    if not areas:
        return None
    average = _round(sum(a["points"] for a in areas.values()) / len(areas))
    score, rule = final_score(average, latest_emergency, average_bp, recent_reading)
    return {
        "score": score,
        "tier": determine_tier(score),
        "average": average,
        "rule": rule,
        "areas": areas,
        "areas_used": len(areas),
        "areas_total": AREAS_TOTAL,
        "latest_emergency": latest_emergency,
    }


def _lab_results(get_repo, user_id: str) -> List[Dict[str, Any]]:
    """HL-138: optional lab results. If they can't be read, the score simply leaves those areas out."""
    try:
        return get_repo().list(user_id)
    except Exception as e:
        logger.warning("Lab results unavailable for the Heart score (%s)", type(e).__name__)
        return []


def score_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Loads a patient's data and works out the score, without saving it."""
    from app.db.repositories import (
        get_baseline_repo, get_content_repo, get_exercises_repo, get_lab_results_repo, get_meals_repo, get_profile_repo,
        get_sleep_repo,
    )
    from app.services.health_logs import get_health_logs

    exercise_logs = get_exercises_repo().list_user_logs(user_id)
    # The log doesn't store the exercise's intensity, so it comes from the library
    routines = get_content_repo().list_routines() if any(e.get("routine_id") for e in exercise_logs) else []
    return score_from(
        baseline=get_baseline_repo().get_baseline(user_id),
        profile=get_profile_repo().get_by_id(user_id),
        health_logs=get_health_logs(user_id),
        exercise_logs=exercise_logs,
        sleep_logs=get_sleep_repo().list_user_logs(user_id),
        meal_logs=get_meals_repo().list_user_meals(user_id),
        routines=routines,
        sodium_limit=_sodium_limit(user_id),
        lab_results=_lab_results(get_lab_results_repo, user_id),
    )


def _factors(result: Dict[str, Any], trigger: str, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {
        "source": SOURCE,
        "method": METHOD_VERSION,
        "trigger": trigger,
        "areas": result["areas"],
        "areas_used": result["areas_used"],
        "areas_total": result["areas_total"],
        "average": result["average"],
        "rule": result["rule"],
        **(extra or {}),
    }


def _save(user_id: str, result: Dict[str, Any], factors: Dict[str, Any]) -> Dict[str, Any]:
    from app.db.repositories import get_hss_repo

    return get_hss_repo().create_hss_record(user_id, {
        "score": result["score"],
        "tier": result["tier"],
        "source": "telemetry",
        "model_version": METHOD_VERSION,
        "contributing_factors": factors,
        "computed_at": utc_now().isoformat(),
    })


def recalculate_score(user_id: str, trigger: str, *, extra: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """Works out the score and saves it. `extra` adds to what's stored, such as the reading that triggered it."""
    result = score_for_user(user_id)
    if result is None:
        return None
    return _save(user_id, result, _factors(result, trigger, extra))


def try_recalculate(user_id: str, trigger: str, **kwargs: Any) -> None:
    """For use after a log is saved: a scoring failure must never lose the patient's log."""
    try:
        recalculate_score(user_id, trigger, **kwargs)
    except Exception as e:
        logger.warning("Couldn't recalculate the Heart score for %s after %s: %s", user_id, trigger, e)


def reading_extra(systolic: float, diastolic: float, heart_rate: Any) -> Dict[str, Any]:
    """What's stored with a reading's score, so Trends and notes can name the reading."""
    healthy = systolic < 120 and diastolic < 80
    kind = "emergency" if is_emergency_reading(systolic, diastolic) else "healthy" if healthy else "other"
    return {"systolic": systolic, "diastolic": diastolic, "heart_rate": heart_rate, "reading_kind": kind}


def refresh_if_outdated(user_id: str, history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keeps the score honest as days pass with nothing logged, since old logs drop out of the last 7 days. It also
    moves accounts from the old method to this one. Saves only when something changed, at most once on a day it's
    checked, and returns the history with any new record first."""
    if not history:
        return history
    latest = history[0]
    # The starting score from setup stays until the first log
    if latest.get("source") == "baseline":
        return history
    factors = latest.get("contributing_factors") or {}
    outdated_method = factors.get("method") != METHOD_VERSION
    today = _local_now().date()
    if not outdated_method and _day(latest.get("computed_at")) == today:
        return history
    key = (user_id, today)
    if not outdated_method and key in _checked_today:
        return history
    try:
        result = score_for_user(user_id)
        if len(_checked_today) > 5000:
            _checked_today.clear()
        _checked_today.add(key)
        if result is None:
            return history
        if not outdated_method and result["score"] == latest.get("score") and result["areas"] == factors.get("areas"):
            return history
        trigger = "method_update" if outdated_method else "daily_update"
        return [_save(user_id, result, _factors(result, trigger))] + history
    except Exception as e:
        logger.warning("Couldn't refresh the Heart score for %s: %s", user_id, e)
        return history


_checked_today: set = set()
