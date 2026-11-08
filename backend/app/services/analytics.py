import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.db.repositories import get_hss_repo, get_baseline_repo, get_health_logs_repo
from app.services import coach_note
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN

logger = logging.getLogger(__name__)

WEEKLY_DAYS = 15  # this week and last, with a spare day so the oldest local day is complete


def _weekly_insights(user_id: str, days: int, vitals: list, exercises: list, meals: list, thresholds: Optional[dict], targets: dict) -> list:
    """The week's patterns for Trends. Uses the logs already loaded when they reach back far enough."""
    try:
        if days and days < WEEKLY_DAYS:
            from app.db.repositories import get_exercises_repo, get_meals_repo
            from app.services.health_logs import get_health_logs

            cutoff = (utc_now() - timedelta(days=WEEKLY_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
            vitals = get_health_logs(user_id, cutoff=cutoff)
            exercises = get_exercises_repo().list_user_logs(user_id, cutoff=cutoff)
            meals = get_meals_repo().list_user_meals(user_id, cutoff=cutoff)
        facts = coach_note.day_facts(
            meal_logs=meals,
            exercise_logs=exercises,
            vitals_logs=vitals,
            sleep_hours=0,
            sodium_limit=targets["sodium_mg"]["value"],
            movement_goal=(thresholds or {}).get("active_minutes_goal") or 30,
        )
        return coach_note.weekly_insights(facts)
    except Exception as e:  # Trends still works without them
        logger.warning(f"Weekly insights failed: {e}")
        return []

def get_analytics(user_id: str, days: int = 30) -> Dict[str, Any]:
    cutoff = (utc_now() - timedelta(days=days)) if days else UTC_MIN
    # Plain UTC with a Z. (isoformat() of an aware time already ends "+00:00"; adding "Z" made an invalid
    # timestamp, the database refused every query, and Trends showed nothing.)
    cutoff_str = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ") if days else None
    
    hss_repo = get_hss_repo()
    limit = max(14, days * 4) if days else None
    history = hss_repo.list_hss_history(user_id, limit=limit, cutoff=cutoff_str)
    
    def parse_dt(x):
        if x is None:
            return UTC_MIN
        dt = x
        if isinstance(x, dict):
            dt = x.get("computed_at") or x.get("created_at") or x.get("timestamp") or x.get("logged_at")
        parsed = parse_utc(dt)
        return parsed if parsed else UTC_MIN

    # History was already filtered by cutoff in the DB
    history = sorted(history, key=parse_dt)
    
    # Normalize computed_at to string for frontend
    for h in history:
        if isinstance(h.get("computed_at"), datetime):
            h["computed_at"] = h["computed_at"].isoformat()

    # Retrieve and filter real daily vitals (TKT-CLN-04)
    from app.services.health_logs import get_health_logs
    raw_vitals_all = get_health_logs(user_id, cutoff=cutoff_str)
    vitals = raw_vitals_all[:limit] if limit else raw_vitals_all
    
    # Retrieve additional logs for trends breakdown
    from app.db.repositories import get_sleep_repo, get_exercises_repo, get_meals_repo
    
    raw_sleep = get_sleep_repo().list_user_logs(user_id, cutoff=cutoff_str)
    sleep_logs = [s for s in raw_sleep if not s.get("deleted_at") and not s.get("is_deleted")]
    
    raw_exercises = get_exercises_repo().list_user_logs(user_id, cutoff=cutoff_str)
    exercise_logs = [e for e in raw_exercises if not e.get("deleted_at") and e.get("status") != "abandoned"]
    
    raw_meals = get_meals_repo().list_user_meals(user_id, cutoff=cutoff_str)
    meal_logs = [m for m in raw_meals if not m.get("deleted_at")]

    
    baseline_repo = get_baseline_repo()
    thresholds = baseline_repo.get_thresholds(user_id)

    from app.services.nutrition_targets import targets_for_user

    targets = targets_for_user(user_id, thresholds)

    return {
        "history": history,
        "vitals": vitals,
        "sleep_logs": sleep_logs,
        "exercise_logs": exercise_logs,
        "meal_logs": meal_logs,
        "thresholds": thresholds,
        # HL-016 / HL-017: daily food limits with their source, for Health Targets & Limits.
        "targets": targets,
        "weekly_insights": _weekly_insights(user_id, days, raw_vitals_all, exercise_logs, meal_logs, thresholds, targets),
    }

def update_thresholds(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    baseline_repo = get_baseline_repo()
    return baseline_repo.update_thresholds(user_id, data)

