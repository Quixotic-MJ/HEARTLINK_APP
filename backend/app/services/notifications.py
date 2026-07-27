from typing import List, Dict, Any
from app.mock_db import notifications

def get_notifications(user_id: str) -> List[Dict[str, Any]]:
    notifs = [n for n in notifications if n["user_id"] == user_id]
    return sorted(notifs, key=lambda x: x["created_at"], reverse=True)

def mark_notification_read(notification_id: str) -> bool:
    for n in notifications:
        if n["id"] == notification_id:
            n["read"] = True
            from app.mock_db import save_logs
            save_logs()
            return True
    return False

def mark_all_read(user_id: str) -> bool:
    updated = False
    for n in notifications:
        if n["user_id"] == user_id and not n["read"]:
            n["read"] = True
            updated = True
    if updated:
        from app.mock_db import save_logs
        save_logs()
    return True
