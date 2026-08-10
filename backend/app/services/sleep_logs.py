from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import sleep_logs, save_logs

def get_sleep_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = [l for l in sleep_logs if l["user_id"] == user_id and l.get("deleted_at") is None]
    return sorted(logs, key=lambda x: x["logged_at"], reverse=True)

def delete_sleep_log(user_id: str, log_id: str) -> bool:
    for log in sleep_logs:
        if log["id"] == log_id and log["user_id"] == user_id:
            log["deleted_at"] = datetime.now().isoformat()
            save_logs()
            return True
    return False

def create_sleep_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now()
    today_date = now.date()
    
    # Soft delete any existing primary sleep log for today to prevent duplicates
    for log in sleep_logs:
        if log["user_id"] == user_id and log.get("deleted_at") is None:
            log_date = log.get("logged_at")
            if isinstance(log_date, datetime):
                log_date = log_date.date()
            elif isinstance(log_date, str):
                try:
                    log_date = datetime.fromisoformat(log_date).date()
                except ValueError:
                    continue
            if log_date == today_date:
                log["deleted_at"] = now.isoformat()

    new_log = {
        "id": f"sleep-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "duration_hours": data.get("duration_hours", 0),
        "quality": data.get("quality", "Good"),
        "logged_at": now,
    }
    sleep_logs.append(new_log)
    save_logs()
    return new_log
