from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.db.repositories import get_hss_repo, get_baseline_repo, get_health_logs_repo
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN

def get_analytics(user_id: str, days: int = 30) -> Dict[str, Any]:
    cutoff = (utc_now() - timedelta(days=days)) if days else UTC_MIN
    cutoff_str = cutoff.isoformat() + "Z" if days else None
    
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
    
    return {
        "history": history,
        "vitals": vitals,
        "sleep_logs": sleep_logs,
        "exercise_logs": exercise_logs,
        "meal_logs": meal_logs,
        "thresholds": thresholds
    }

def update_thresholds(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    baseline_repo = get_baseline_repo()
    return baseline_repo.update_thresholds(user_id, data)

