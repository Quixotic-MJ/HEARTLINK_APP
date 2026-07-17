from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import exercise_logs, exercise_routines

def get_routines() -> List[Dict[str, Any]]:
    return exercise_routines

def get_exercise_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = [e for e in exercise_logs if e["user_id"] == user_id]
    return sorted(logs, key=lambda x: x["logged_at"], reverse=True)

def create_exercise_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    new_log = {
        "id": f"ex-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "routine_id": data.get("routine_id"),
        "routine_name": data.get("routine_name"),
        "duration_minutes": data.get("duration_minutes", 0),
        "status": data.get("status", "completed"),
        "logged_at": datetime.now(),
    }
    exercise_logs.append(new_log)
    return new_log
