from typing import List, Dict, Any
from datetime import datetime
from app.mock_db import css_history, user_thresholds, profiles

def get_analytics(user_id: str) -> Dict[str, Any]:
    history = [c for c in css_history if c["user_id"] == user_id]
    history = sorted(history, key=lambda x: x["computed_at"])
    
    # Normalize computed_at to string for frontend
    for h in history:
        if isinstance(h.get("computed_at"), datetime):
            h["computed_at"] = h["computed_at"].isoformat()
    
    thresholds = next((t for t in user_thresholds if t["user_id"] == user_id), None)
    
    return {
        "history": history,
        "thresholds": thresholds
    }

def update_thresholds(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    for t in user_thresholds:
        if t["user_id"] == user_id:
            t["sodium_limit_mg"] = data.get("sodium_limit_mg", t["sodium_limit_mg"])
            t["fluid_limit_ml"] = data.get("fluid_limit_ml", t.get("fluid_limit_ml", 2000))
            t["active_minutes_goal"] = data.get("active_minutes_goal", t["active_minutes_goal"])
            t["systolic_threshold"] = data.get("systolic_threshold", t["systolic_threshold"])
            t["diastolic_threshold"] = data.get("diastolic_threshold", t["diastolic_threshold"])
            t["updated_at"] = datetime.utcnow()
            
            from app.mock_db import save_profiles
            save_profiles()
            return t
    
    # Create if not exists
    new_threshold = {
        "id": f"thresh-{len(user_thresholds) + 200}",
        "user_id": user_id,
        "sodium_limit_mg": data.get("sodium_limit_mg", 1500),
        "fluid_limit_ml": data.get("fluid_limit_ml", 2000),
        "active_minutes_goal": data.get("active_minutes_goal", 30),
        "systolic_threshold": data.get("systolic_threshold", 120),
        "diastolic_threshold": data.get("diastolic_threshold", 80),
        "updated_at": datetime.now()
    }
    user_thresholds.append(new_threshold)
    from app.mock_db import save_profiles
    save_profiles()
    return new_threshold
