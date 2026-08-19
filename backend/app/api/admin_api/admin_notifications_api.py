from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
import app.mock_db as mock_db
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

def _format_notification(n: Dict[str, Any]) -> Dict[str, Any]:
    item = dict(n)
    created_at = item.get("created_at")
    if isinstance(created_at, datetime):
        item["created_at"] = created_at.isoformat()
    return item

@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_admin_notifications(current_user: dict = Depends(_require_admin_or_super_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")

    # Filter notifications visible to caller's role
    visible = [
        n for n in mock_db.admin_notifications 
        if caller_role in n.get("recipient_roles", [])
    ]

    # Sort newest first
    sorted_items = sorted(
        visible, 
        key=lambda x: x.get("created_at") or datetime.min, 
        reverse=True
    )

    # Compute unread count for current user
    unread_count = sum(1 for n in sorted_items if caller_id not in n.get("read_by", []))

    formatted_items = [_format_notification(n) for n in sorted_items]

    return {
        "items": formatted_items,
        "unread_count": unread_count,
        "total": len(formatted_items)
    }

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(_require_admin_or_super_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")

    notification = next(
        (n for n in mock_db.admin_notifications if n.get("id") == notification_id),
        None
    )

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if caller_role not in notification.get("recipient_roles", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Notification not accessible for this role"
        )

    read_by = notification.setdefault("read_by", [])
    if caller_id not in read_by:
        read_by.append(caller_id)
        mock_db.save_logs()

    return {
        "success": True,
        "notification": _format_notification(notification)
    }

@router.put("/mark-all-read")
def mark_all_notifications_read(current_user: dict = Depends(_require_admin_or_super_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")

    updated = False
    for n in mock_db.admin_notifications:
        if caller_role in n.get("recipient_roles", []):
            read_by = n.setdefault("read_by", [])
            if caller_id not in read_by:
                read_by.append(caller_id)
                updated = True

    if updated:
        mock_db.save_logs()

    return {
        "success": True,
        "unread_count": 0
    }
