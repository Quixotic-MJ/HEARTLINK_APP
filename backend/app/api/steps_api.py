"""HL-163: steps from the phone (Health Connect), for the app (app/services/steps.py). The caller comes from the sign-in
token; a portal session can't use these."""
from datetime import date, datetime
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.services import steps
from app.utils.security import APP_ROLE, get_current_user

router = APIRouter(prefix="/api/steps", tags=["Steps"])


def _app_user(current_user: dict = Depends(get_current_user)) -> str:
    if current_user.get("role") != APP_ROLE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return current_user.get("user_id")


class StepDay(BaseModel):
    day: date
    steps: int = Field(..., ge=0, le=100000)
    brisk_periods: List[Tuple[datetime, datetime]] = Field(default_factory=list, max_length=300)


class StepWeek(BaseModel):
    days: List[StepDay] = Field(..., min_length=1, max_length=8)


@router.get("/week")
def read_week(user_id: str = Depends(_app_user)):
    return steps.week_for(user_id)


@router.put("/days", status_code=204)
def save_days(body: StepWeek, user_id: str = Depends(_app_user)):
    steps.save_days(user_id, [d.model_dump() for d in body.days])


@router.delete("", status_code=204)
def remove_steps(user_id: str = Depends(_app_user)):
    steps.delete_all(user_id)
