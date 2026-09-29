from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.db.repositories import get_hss_repo, get_baseline_repo, get_health_logs_repo

def get_analytics(user_id: str, days: int = 30) -> Dict[str, Any]:
    hss_repo = get_hss_repo()
    limit = max(14, days * 4) if days else None
    history = hss_repo.list_hss_history(user_id, limit=limit)
    
    def parse_dt(x):
        if x is None:
            return datetime.min
        dt = x
        if isinstance(x, dict):
            dt = x.get("computed_at") or x.get("created_at") or x.get("timestamp") or x.get("logged_at")
        if isinstance(dt, datetime):
            if dt.tzinfo is not None:
                return dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        if isinstance(dt, str):
            try:
                s = dt.strip()
                if s.endswith("Z"):
                    s = s[:-1] + "+00:00"
                parsed = datetime.fromisoformat(s)
                if parsed.tzinfo is not None:
                    return parsed.astimezone(timezone.utc).replace(tzinfo=None)
                return parsed
            except Exception:
                return datetime.min
        return datetime.min

    cutoff = (datetime.utcnow() - timedelta(days=days)) if days else datetime.min
    history = [h for h in history if parse_dt(h) >= cutoff]
    history = sorted(history, key=parse_dt)
    
    # Normalize computed_at to string for frontend
    for h in history:
        if isinstance(h.get("computed_at"), datetime):
            h["computed_at"] = h["computed_at"].isoformat()

    # Retrieve and filter real daily vitals (TKT-CLN-04)
    from app.services.health_logs import get_health_logs
    raw_vitals_all = get_health_logs(user_id)
    raw_vitals = raw_vitals_all[:limit] if limit else raw_vitals_all
    
    def filter_logs(logs):
        filtered = []
        for v in logs:
            dt_v = parse_dt(v)
            if dt_v >= cutoff:
                v_copy = dict(v)
                if isinstance(v_copy.get("logged_at"), datetime):
                    v_copy["logged_at"] = v_copy["logged_at"].isoformat()
                if isinstance(v_copy.get("created_at"), datetime):
                    v_copy["created_at"] = v_copy["created_at"].isoformat()
                filtered.append(v_copy)
        return sorted(filtered, key=parse_dt)
        
    vitals = filter_logs(raw_vitals)
    
    # Retrieve additional logs for trends breakdown
    from app.db.repositories import get_sleep_repo, get_exercises_repo, get_meals_repo
    
    raw_sleep = get_sleep_repo().list_user_logs(user_id)
    raw_sleep = [s for s in raw_sleep if not s.get("deleted_at") and not s.get("is_deleted")]
    sleep_logs = filter_logs(raw_sleep)
    
    raw_exercises = get_exercises_repo().list_user_logs(user_id)
    raw_exercises = [e for e in raw_exercises if not e.get("deleted_at") and e.get("status") != "abandoned"]
    exercise_logs = filter_logs(raw_exercises)
    
    raw_meals = get_meals_repo().list_user_meals(user_id)
    raw_meals = [m for m in raw_meals if not m.get("deleted_at")]
    meal_logs = filter_logs(raw_meals)
    
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

