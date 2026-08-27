from typing import List, Dict, Any
from datetime import datetime
from app.db.repositories import get_hss_repo, get_baseline_repo

def get_analytics(user_id: str) -> Dict[str, Any]:
    hss_repo = get_hss_repo()
    history = hss_repo.list_hss_history(user_id)
    
    def parse_dt(x):
        dt = x.get("computed_at") or x.get("created_at")
        if isinstance(dt, datetime):
            return dt
        if isinstance(dt, str):
            try:
                return datetime.fromisoformat(dt)
            except Exception:
                pass
        return datetime.min

    history = sorted(history, key=parse_dt)
    
    # Normalize computed_at to string for frontend
    for h in history:
        if isinstance(h.get("computed_at"), datetime):
            h["computed_at"] = h["computed_at"].isoformat()
    
    baseline_repo = get_baseline_repo()
    thresholds = baseline_repo.get_thresholds(user_id)
    
    return {
        "history": history,
        "thresholds": thresholds
    }

def update_thresholds(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    baseline_repo = get_baseline_repo()
    return baseline_repo.update_thresholds(user_id, data)

