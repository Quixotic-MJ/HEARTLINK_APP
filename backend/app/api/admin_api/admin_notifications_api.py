from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
from datetime import datetime
from app.db.repositories import get_admin_repo
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.utils.security import get_current_admin_user
from app.services import live_events

router = APIRouter(prefix="/api/admin/notifications", tags=["Admin Notifications"])

def _require_admin(current_user: dict = Depends(get_current_admin_user)) -> dict:
    role = current_user.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admins only"
        )
    return current_user

@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_admin_notifications(include_archived: bool = False, current_user: dict = Depends(_require_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    try:
        # HL-019: notifications over 72 hours old are archived; ?include_archived=true lists them too.
        return get_admin_repo().list_admin_notifications(caller_role, caller_id, include_archived)
    except Exception:
        return {"items": [], "unread_count": 0, "total": 0}

@router.get("/stream")
def stream_notification_changes(request: Request, current_user: dict = Depends(_require_admin)):
    """HL-041: a long-lived Server-Sent Events stream; each event means "refresh your notifications"."""
    return StreamingResponse(
        live_events.event_stream(request.is_disconnected),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(_require_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    success = get_admin_repo().mark_admin_notification_read(notification_id, caller_role, caller_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or access denied")
    live_events.publish("notifications")  # other open tabs update their unread count
    return {"success": True}

@router.put("/mark-all-read")
def mark_all_notifications_read(current_user: dict = Depends(_require_admin)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    get_admin_repo().mark_all_admin_notifications_read(caller_role, caller_id)
    live_events.publish("notifications")
    return {"success": True, "unread_count": 0}
