"""HL-087: family sharing (app/services/family.py). The caller always comes from the sign-in token, never the address."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.services import family
from app.utils.rate_limiter import limiter, user_or_ip_key
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/family", tags=["Family sharing"])


class FollowRequest(BaseModel):
    code: str = Field(min_length=1, max_length=20)


class AccountKindRequest(BaseModel):
    kind: Literal["patient", "family"]


def _patient(current_user: dict = Depends(get_current_user)) -> str:
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Family sharing is for patient accounts.")
    return current_user.get("user_id")


# the patient's side

@router.get("/sharing")
def read_sharing(user_id: str = Depends(_patient)):
    return family.sharing_status(user_id)


@router.post("/invite")
def create_invite(user_id: str = Depends(_patient)):
    return family.create_invite(user_id)


@router.delete("/followers/{follower_id}")
def remove_follower(follower_id: str, user_id: str = Depends(_patient)):
    family.remove_follower(user_id, follower_id)
    return {"success": True}


# the follower's side

@router.post("/follow")
@limiter.limit("10/minute", key_func=user_or_ip_key)
def follow(payload: FollowRequest, request: Request, response: Response, user_id: str = Depends(_patient)):
    return family.follow(user_id, payload.code)


@router.get("/following")
def read_following(user_id: str = Depends(_patient)):
    return family.following(user_id)


@router.get("/following/{patient_id}/summary")
def read_summary(patient_id: str, user_id: str = Depends(_patient)):
    return family.summary(user_id, patient_id)


@router.delete("/following/{patient_id}")
def stop_following(patient_id: str, user_id: str = Depends(_patient)):
    family.stop_following(user_id, patient_id)
    return {"success": True}


@router.put("/account-kind")
def set_account_kind(payload: AccountKindRequest, user_id: str = Depends(_patient)):
    return family.set_account_kind(user_id, payload.kind)
