from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
from app.db.repositories import get_admin_repo
from app.utils.security import get_current_admin_user

router = APIRouter(prefix="/api/admin/notifications", tags=["Admin Notifications"])

def _require_admin_or_super_admin(current_user: dict = Depends(get_current_admin_user)) -> dict:
    role = current_user.get("role")
    if role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admin or Super Admin only"
        )
    return current_user

@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_admin_notifications(current_user: dict = Depends(_require_admin_or_super_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    return get_admin_repo().list_admin_notifications(caller_role, caller_id)

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(_require_admin_or_super_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    success = get_admin_repo().mark_admin_notification_read(notification_id, caller_role, caller_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or access denied")
    return {"success": True}

@router.put("/mark-all-read")
def mark_all_notifications_read(current_user: dict = Depends(_require_admin_or_super_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    get_admin_repo().mark_all_admin_notifications_read(caller_role, caller_id)
    return {"success": True, "unread_count": 0}
