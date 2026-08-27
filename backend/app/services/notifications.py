from typing import List, Dict, Any, Optional
from app.db.repositories import get_notification_repo

def get_notifications(user_id: str) -> List[Dict[str, Any]]:
    return get_notification_repo().list_user_notifications(user_id)

def mark_notification_read(notification_id: str, user_id: Optional[str] = None) -> bool:
    return get_notification_repo().mark_read(notification_id, user_id=user_id)

def mark_all_read(user_id: str) -> bool:
    return get_notification_repo().mark_all_read(user_id)

