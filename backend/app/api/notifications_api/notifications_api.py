from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.services.notifications import get_notifications, mark_notification_read, mark_all_read
from app.db.repositories import get_notification_repo
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# --- HL-018: the phone's push token, saved after sign-in and removed on sign-out ----------------------------
class PushTokenRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    platform: Literal["android", "ios"] = "android"


class PushTokenRemoval(BaseModel):
    token: str = Field(min_length=10, max_length=200)


@router.post("/push-token")
def save_push_token(payload: PushTokenRequest, current_user: dict = Depends(get_current_user)):
    from app.db.repositories import get_push_token_repo
    from app.services.push import is_expo_token
    if not is_expo_token(payload.token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That isn't an Expo push token.")
    get_push_token_repo().save(current_user.get("user_id"), payload.token, payload.platform)
    return {"success": True}


@router.delete("/push-token")
def remove_push_token(payload: PushTokenRemoval, current_user: dict = Depends(get_current_user)):
    from app.db.repositories import get_push_token_repo
    get_push_token_repo().disable_for_user(current_user.get("user_id"), payload.token)
    return {"success": True}

@router.get("/broadcasts", response_model=List[Dict[str, Any]])
def get_latest_broadcasts():
    return get_notification_repo().list_broadcasts()

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_notifications(
    user_id: str,
    include_archived: bool = False,
    current_user: dict = Depends(get_current_user),
):
    from app.utils.security import verify_user_access
    verify_user_access(current_user, user_id)
    # HL-019: notifications over 72 hours old are archived; ?include_archived=true lists them too.
    return get_notifications(user_id, include_archived)

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


