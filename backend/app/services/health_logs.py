from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import daily_health_logs

def get_health_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = [l for l in daily_health_logs if l["user_id"] == user_id]
    return sorted(logs, key=lambda x: x["logged_at"], reverse=True)

def create_health_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    new_log = {
        "id": f"log-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "systolic_bp": data.get("systolic_bp"),
        "diastolic_bp": data.get("diastolic_bp"),
        "heart_rate_bpm": data.get("heart_rate_bpm"),
        "weight_kg": data.get("weight_kg"),
        "medication_taken": data.get("medication_taken", False),
        "symptoms": data.get("symptoms", []),
        "severity_map": data.get("severity_map", {}),
        "context": data.get("context", "resting"),
        "notes": data.get("notes", ""),
        "logged_at": datetime.now(),
    }
    daily_health_logs.append(new_log)
    return new_log
