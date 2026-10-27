"""HL-084: a patient's own HeartLink Premium: status, the free trial and the demo checkout (app/services/premium.py)."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.repositories import get_profile_repo
from app.services import premium
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/premium", tags=["Premium"])


class CheckoutRequest(BaseModel):
    period: Literal["monthly", "yearly"]
    method: Literal["gcash", "card"]


@router.get("")
def read_premium(current_user: dict = Depends(get_current_user)):
    profile = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    return premium.status_for(profile)


@router.post("/trial")
def start_trial(current_user: dict = Depends(get_current_user)):
    return premium.start_trial(current_user.get("user_id"))


@router.post("/checkout")
def demo_checkout(payload: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Test mode: nothing is charged, and the request carries no card or account details."""
    return premium.checkout(current_user.get("user_id"), payload.period, payload.method)
