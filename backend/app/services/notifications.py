from typing import List, Dict, Any
from app.mock_db import notifications

def get_notifications(user_id: str) -> List[Dict[str, Any]]:
    notifs = [n for n in notifications if n["user_id"] == user_id]
    return sorted(notifs, key=lambda x: x["created_at"], reverse=True)

def mark_notification_read(notification_id: str) -> bool:
    for n in notifications:
        if n["id"] == notification_id:
            n["read"] = True
            return True
    return False
