from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import daily_health_logs, save_logs

def get_health_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = [l for l in daily_health_logs if l["user_id"] == user_id and l.get("deleted_at") is None]
    return sorted(logs, key=lambda x: x["logged_at"], reverse=True)

def delete_health_log(user_id: str, log_id: str) -> bool:
    for log in daily_health_logs:
        if log["id"] == log_id and log["user_id"] == user_id:
            log["deleted_at"] = datetime.now().isoformat()
            
            # Recalculate CSS
            try:
                from app.services.css_engine import recalculate_css
                recalculate_css(user_id)
            except Exception as e:
                print(f"Error recalculating CSS on health log delete: {e}")
                
            save_logs()
            return True
    return False

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
        "triggered_by_exercise_id": data.get("triggered_by_exercise_id"),
        "notes": data.get("notes", ""),
        "logged_at": datetime.now(),
    }
    daily_health_logs.append(new_log)
    
    # Instantly recalculate the CSS Score dynamically
    try:
        from app.services.css_engine import recalculate_css
        recalculate_css(user_id, new_log)
    except Exception as e:
        print(f"Error recalculating CSS: {e}")
        
    save_logs()
    return new_log
