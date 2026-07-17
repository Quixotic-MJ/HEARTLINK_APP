from typing import List, Dict, Any
from app.mock_db import css_history, user_thresholds, profiles

def get_analytics(user_id: str) -> Dict[str, Any]:
    history = [c for c in css_history if c["user_id"] == user_id]
    history = sorted(history, key=lambda x: x["computed_at"])
    
    thresholds = next((t for t in user_thresholds if t["user_id"] == user_id), None)
    
    return {
        "history": history,
        "thresholds": thresholds
    }

def update_thresholds(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    for t in user_thresholds:
        if t["user_id"] == user_id:
            t["sodium_limit_mg"] = data.get("sodium_limit_mg", t["sodium_limit_mg"])
            t["active_minutes_goal"] = data.get("active_minutes_goal", t["active_minutes_goal"])
            t["systolic_threshold"] = data.get("systolic_threshold", t["systolic_threshold"])
            t["diastolic_threshold"] = data.get("diastolic_threshold", t["diastolic_threshold"])
            return t
    
    # Create if not exists
    new_threshold = {
        "id": f"thresh-{len(user_thresholds) + 200}",
        "user_id": user_id,
        "sodium_limit_mg": data.get("sodium_limit_mg", 1500),
        "active_minutes_goal": data.get("active_minutes_goal", 30),
        "systolic_threshold": data.get("systolic_threshold", 120),
        "diastolic_threshold": data.get("diastolic_threshold", 80)
    }
    user_thresholds.append(new_threshold)
    return new_threshold
