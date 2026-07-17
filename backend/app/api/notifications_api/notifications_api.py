from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.notifications import get_notifications, mark_notification_read

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_notifications(user_id: str):
    return get_notifications(user_id)

@router.put("/{notification_id}/read")
def mark_read(notification_id: str):
    success = mark_notification_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification marked as read"}
