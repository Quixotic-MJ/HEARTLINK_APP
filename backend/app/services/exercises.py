from typing import List, Dict, Any, Tuple
from datetime import datetime
import uuid
from app.mock_db import exercise_logs, exercise_routines, daily_health_logs, save_logs

def get_routines() -> List[Dict[str, Any]]:
    return exercise_routines

def get_exercise_logs(user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    logs = [
        e for e in exercise_logs 
        if e["user_id"] == user_id and e.get("deleted_at") is None
    ]
    sorted_logs = sorted(logs, key=lambda x: x["logged_at"], reverse=True)
    return sorted_logs[offset:offset + limit]

def create_exercise_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    new_log = {
        "id": data.get("id") or f"ex-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "routine_id": data.get("routine_id"),
        "routine_name": data.get("routine_name"),
        "duration_seconds": data.get("duration_seconds", 0),
        "duration_minutes": data.get("duration_minutes", 0),
        "planned_duration_seconds": data.get("planned_duration_seconds", 0),
        "planned_duration_minutes": data.get("planned_duration_minutes", 0),
        "status": data.get("status", "completed"),
        "logged_at": datetime.now(),
        "deleted_at": None,
    }
    exercise_logs.append(new_log)
    save_logs()

    return new_log

def delete_exercise_log(user_id: str, log_id: str) -> Tuple[bool, str, int]:
    """
    Soft-deletes an exercise log.
    Returns (success, message, status_code)
    """
    # 1. Find log
    log = next((l for l in exercise_logs if l["id"] == log_id), None)
    if not log or log.get("deleted_at") is not None:
        return False, "Log not found or already deleted", 404
    
    # 2. Authorization check
    if log["user_id"] != user_id:
        return False, "Unauthorized to delete this exercise log", 403
    
    # 3. Check for linked symptom report
    linked_symptom = next(
        (s for s in daily_health_logs if s.get("triggered_by_exercise_id") == log_id), 
        None
    )
    if linked_symptom:
        return False, "This session is linked to a symptom report — deleting it will remove that context from your record.", 409
    
    # 4. Soft delete
    log["deleted_at"] = datetime.now().isoformat()
    save_logs()

    return True, "Exercise log deleted successfully", 200

def map_hss_tier(tier: str) -> str:
    if not tier: return "Stable"
    if "Stable" in tier: return "Stable"
    if "Moderate" in tier or "Monitor Closely" in tier: return "Moderate"
    if "Elevated Risk" in tier: return "Elevated Risk"
    if "Critical" in tier: return "Critical"
    return "Stable"

def create_routine(data: Dict[str, Any]) -> Dict[str, Any]:
    raw_hss = data.get("hssTarget", data.get("hss_tier", "Stable"))
    new_routine = {
        "id": f"rout-{uuid.uuid4().hex[:8]}",
        "name": data.get("name", "New Routine"),
        "description": data.get("description", ""),
        "duration_minutes": data.get("duration", data.get("duration_minutes", 0)),
        "hss_tier": map_hss_tier(raw_hss),
        "type": data.get("type", "General"),
        "intensity": data.get("intensity", "Low"),
        "goal": data.get("goal", ""),
        "steps": data.get("steps", []),
        "media_url": data.get("mediaUrl", data.get("media_url", None)),
        "guide_images": data.get("guideImages", data.get("guide_images", [])),
        "status": data.get("status", "draft"),
        "expert_validated": data.get("expertValidated", data.get("expert_validated", False)),
        "created_by": "usr-admin-002",
        "created_at": datetime.now(),
    }
    exercise_routines.insert(0, new_routine)
    return new_routine

def update_routine(routine_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    routine = next((r for r in exercise_routines if r["id"] == routine_id), None)
    if not routine:
        raise ValueError("Routine not found")
    
    if "name" in data:
        routine["name"] = data["name"]
    if "description" in data:
        routine["description"] = data["description"]
    if "duration" in data or "duration_minutes" in data:
        routine["duration_minutes"] = data.get("duration", data.get("duration_minutes", 0))
    if "hssTarget" in data or "hss_tier" in data:
        raw_hss = data.get("hssTarget", data.get("hss_tier", routine.get("hss_tier", "Stable")))
        routine["hss_tier"] = map_hss_tier(raw_hss)
    if "type" in data:
        routine["type"] = data["type"]
    if "intensity" in data:
        routine["intensity"] = data["intensity"]
    if "goal" in data:
        routine["goal"] = data["goal"]
    if "steps" in data:
        routine["steps"] = data["steps"]
    if "mediaUrl" in data or "media_url" in data:
        routine["media_url"] = data.get("mediaUrl", data.get("media_url", routine.get("media_url")))
    if "guideImages" in data or "guide_images" in data:
        routine["guide_images"] = data.get("guideImages", data.get("guide_images", routine.get("guide_images", [])))
    if "status" in data:
        routine["status"] = data["status"]
    if "expertValidated" in data or "expert_validated" in data:
        routine["expert_validated"] = data.get("expertValidated", data.get("expert_validated", routine.get("expert_validated")))
        
    return routine

def delete_routine(routine_id: str) -> bool:
    routine = next((r for r in exercise_routines if r["id"] == routine_id), None)
    if not routine:
        return False
    exercise_routines.remove(routine)
    return True
