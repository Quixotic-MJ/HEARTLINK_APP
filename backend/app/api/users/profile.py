import logging
from fastapi import APIRouter, Depends, status

from app.api.auth.deps import get_current_user
from app.schemas.user import (
    ProfileSetupRequest,
    LifestyleSetupRequest,
    DietarySetupRequest,
    ClinicalSetupRequest,
    MessageResponse
)
from app.services import users as users_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile Onboarding"])

@router.post("/onboarding/step1-2", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def setup_core_biometrics(
    payload: ProfileSetupRequest,
    current_user: dict = Depends(get_current_user)
):
    await users_service.upsert_profile(user_id=current_user["id"], data=payload.dict())
    return MessageResponse(message="Core biometrics saved successfully")

@router.post("/onboarding/step3", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def setup_lifestyle(
    payload: LifestyleSetupRequest,
    current_user: dict = Depends(get_current_user)
):
    await users_service.upsert_baseline_lifestyle(user_id=current_user["id"], data=payload.dict())
    return MessageResponse(message="Lifestyle baseline saved successfully")

@router.post("/onboarding/step4", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def setup_dietary(
    payload: DietarySetupRequest,
    current_user: dict = Depends(get_current_user)
):
    await users_service.upsert_baseline_dietary(user_id=current_user["id"], data=payload.dict())
    return MessageResponse(message="Dietary profile saved successfully")

@router.post("/onboarding/step5", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def setup_clinical(
    payload: ClinicalSetupRequest,
    current_user: dict = Depends(get_current_user)
):
    await users_service.upsert_baseline_clinical(user_id=current_user["id"], data=payload.dict())
    return MessageResponse(message="Clinical baseline saved successfully. Onboarding complete.")
