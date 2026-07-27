from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.notifications import get_notifications, mark_notification_read, mark_all_read

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

@router.put("/{user_id}/mark-all-read")
def mark_all(user_id: str):
    mark_all_read(user_id)
    return {"success": True, "message": "All notifications marked as read"}
