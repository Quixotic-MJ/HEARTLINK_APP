"""HL-084: a patient's own HeartLink Premium: status, the free trial and the demo checkout (app/services/premium.py)."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.repositories import get_profile_repo
from app.services import premium
from app.utils.security import APP_ROLE, get_current_user

router = APIRouter(prefix="/api/premium", tags=["Premium"])


class CheckoutRequest(BaseModel):
    period: Literal["monthly", "yearly"]
    method: Literal["gcash", "card"]


@router.get("")
def read_premium(current_user: dict = Depends(get_current_user)):
    profile = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    return premium.status_for(profile)


def _app_user(current_user: dict = Depends(get_current_user)) -> str:
    """Buying Premium happens in the app. 2026-11-20: an app session acts as a user for every account, staff included
    (security.APP_ROLE), so a staff member can buy it there for themselves; a portal session can't."""
    if current_user.get("role") != APP_ROLE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return current_user.get("user_id")


@router.post("/trial")
def start_trial(user_id: str = Depends(_app_user)):
    return premium.start_trial(user_id)


@router.post("/checkout")
def demo_checkout(payload: CheckoutRequest, user_id: str = Depends(_app_user)):
    """Test mode: nothing is charged, and the request carries no card or account details."""
    return premium.checkout(user_id, payload.period, payload.method)
