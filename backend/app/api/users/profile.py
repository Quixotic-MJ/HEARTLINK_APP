from fastapi import APIRouter, status, HTTPException
from app.schemas.user import (
    ProfileUpdate,
    BaselineLifestyleRequest,
    BaselineDietaryRequest,
    BaselineClinicalRequest,
)
from app.services.users import (
    update_profile,
    upsert_baseline_lifestyle,
    upsert_baseline_dietary,
    upsert_baseline_clinical,
    get_full_profile,
)
import app.mock_db as mock_db
from app.services.ml_service import ml_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def read_user_profile(user_id: str):
    data = get_full_profile(user_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return data

@router.put("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def update_user_profile(user_id: str, payload: ProfileUpdate):
    result = update_profile(user_id, payload.model_dump())
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return {"success": True, "message": "Profile updated", "data": result}


@router.post("/{user_id}/baseline/lifestyle", status_code=status.HTTP_201_CREATED)
async def save_baseline_lifestyle(user_id: str, payload: BaselineLifestyleRequest):
    # Check user exists
    user_exists = any(p["id"] == user_id for p in mock_db.profiles)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    result = upsert_baseline_lifestyle(user_id, payload.model_dump())
    return {"success": True, "message": "Lifestyle baseline saved", "data": result}


@router.post("/{user_id}/baseline/dietary", status_code=status.HTTP_201_CREATED)
async def save_baseline_dietary(user_id: str, payload: BaselineDietaryRequest):
    user_exists = any(p["id"] == user_id for p in mock_db.profiles)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    result = upsert_baseline_dietary(user_id, payload.model_dump())
    return {"success": True, "message": "Dietary baseline saved", "data": result}


@router.post("/{user_id}/baseline/clinical", status_code=status.HTTP_201_CREATED)
async def save_baseline_clinical(user_id: str, payload: BaselineClinicalRequest):
    user_exists = any(p["id"] == user_id for p in mock_db.profiles)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    result = upsert_baseline_clinical(user_id, payload.model_dump())
    
    # ML Prediction for Initial CSS
    lifestyle = next((l for l in mock_db.baseline_lifestyle if l["user_id"] == user_id), {})
    dietary = next((d for d in mock_db.baseline_dietary if d["user_id"] == user_id), {})
    clinical = payload.model_dump()
    
    css_entry = ml_service.predict_initial_css(user_id, lifestyle, dietary, clinical)
    
    return {
        "success": True, 
        "message": "Clinical baseline saved — onboarding complete", 
        "data": result, 
        "initial_css": css_entry
    }