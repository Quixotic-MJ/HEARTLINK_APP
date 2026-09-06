from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from app.services.notifications import get_notifications, mark_notification_read, mark_all_read
from app.db.repositories import get_notification_repo
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/broadcasts", response_model=List[Dict[str, Any]])
def get_latest_broadcasts():
    return get_notification_repo().list_broadcasts()

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_notifications(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    from app.utils.security import verify_user_access
    verify_user_access(current_user, user_id)
    return get_notifications(user_id)

@router.put("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    user_filter = caller_id if caller_role != "super_admin" else None
    success = mark_notification_read(notification_id, user_id=user_filter)
    return {"success": True, "message": "Notification marked as read"}

@router.put("/{user_id}/mark-all-read")
def mark_all(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_id != user_id and caller_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own notifications.",
        )
    mark_all_read(user_id)
    return {"success": True, "message": "All notifications marked as read"}


