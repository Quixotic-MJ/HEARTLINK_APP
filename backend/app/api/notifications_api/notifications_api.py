from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from app.services.notifications import get_notifications, mark_notification_read, mark_all_read
from app.mock_db import system_broadcasts, notifications
from app.utils.security import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/broadcasts", response_model=List[Dict[str, Any]])
def get_latest_broadcasts():
    # Return the broadcasts sorted by created_at descending
    return sorted(system_broadcasts, key=lambda x: x.get("created_at", datetime.min), reverse=True)

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_notifications(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own notifications.",
        )
    return get_notifications(user_id)

@router.put("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    notif = next((n for n in notifications if n["id"] == notification_id), None)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and notif.get("user_id") and notif["user_id"] != caller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own notifications.",
        )
        
    success = mark_notification_read(notification_id)
    return {"success": True, "message": "Notification marked as read"}

@router.put("/{user_id}/mark-all-read")
def mark_all(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own notifications.",
        )
    mark_all_read(user_id)
    return {"success": True, "message": "All notifications marked as read"}

