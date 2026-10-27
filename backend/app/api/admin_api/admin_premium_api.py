"""HL-084: the portal's Premium controls: plan settings, members and history, and giving or removing Premium."""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.repositories import get_profile_repo
from app.services import premium
from app.utils.activity_helper import record_admin_activity
from app.utils.security import get_current_admin_only

router = APIRouter(prefix="/api/admin", tags=["Admin Premium"])


class PlanChange(BaseModel):
    premium: bool
    days: Optional[int] = None


@router.get("/premium")
def read_premium_overview(current_user: dict = Depends(get_current_admin_only)):
    return premium.summary()


@router.get("/premium/config")
def read_premium_config(current_user: dict = Depends(get_current_admin_only)):
    return premium.get_config()


@router.put("/premium/config")
def update_premium_config(payload: dict, current_user: dict = Depends(get_current_admin_only)):
    saved = premium.update_config(payload, current_user.get("user_id"))
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action=(f"updated Premium settings (₱{saved['monthly_price_php']}/month, ₱{saved['yearly_price_php']}/year, "
                f"{saved['trial_days']}-day trial, sign-ups {'on' if saved['checkout_enabled'] else 'off'})"),
        target_type="premium",
        target_name="Premium settings",
    )
    return saved


@router.put("/users/{user_id}/plan")
def change_patient_plan(user_id: str, payload: PlanChange, current_user: dict = Depends(get_current_admin_only)):
    result = premium.admin_set_plan(user_id, payload.premium, payload.days, current_user.get("user_id"))
    profile = get_profile_repo().get_by_id(user_id) or {}
    name = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip() or user_id
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action=f"gave Premium for {payload.days} days" if payload.premium else "removed Premium",
        target_type="user",
        target_id=str(user_id),
        target_name=name,
    )
    return result
