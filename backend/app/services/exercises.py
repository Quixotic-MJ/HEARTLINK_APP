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
        "status": data.get("status", "completed"),
        "logged_at": datetime.now(),
        "deleted_at": None,
    }
    exercise_logs.append(new_log)
    save_logs()

    try:
        from app.services.css_engine import recalculate_css
        recalculate_css(user_id)
    except Exception as e:
        print(f"Error recalculating CSS on exercise log: {e}")

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

    try:
        from app.services.css_engine import recalculate_css
        recalculate_css(user_id)
    except Exception as e:
        print(f"Error recalculating CSS on exercise delete: {e}")

    return True, "Exercise log deleted successfully", 200


