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
    health_logs_repo = get_health_logs_repo()
    raw_vitals = health_logs_repo.list_user_logs(user_id, limit=limit)
    vitals = []
    for v in raw_vitals:
        dt_v = parse_dt(v)
        if dt_v >= cutoff:
            v_copy = dict(v)
            if isinstance(v_copy.get("logged_at"), datetime):
                v_copy["logged_at"] = v_copy["logged_at"].isoformat()
            if isinstance(v_copy.get("created_at"), datetime):
                v_copy["created_at"] = v_copy["created_at"].isoformat()
            vitals.append(v_copy)
    vitals = sorted(vitals, key=parse_dt)
    
    baseline_repo = get_baseline_repo()
    thresholds = baseline_repo.get_thresholds(user_id)
    
    return {
        "history": history,
        "vitals": vitals,
        "thresholds": thresholds
    }

def update_thresholds(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    baseline_repo = get_baseline_repo()
    return baseline_repo.update_thresholds(user_id, data)

