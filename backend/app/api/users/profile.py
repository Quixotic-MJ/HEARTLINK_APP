from fastapi import APIRouter, status, HTTPException
from app.schemas.user import (
    ProfileUpdate,
    BaselineLifestyleRequest,
    BaselineDietaryRequest,
    BaselineClinicalRequest,
    ChangePasswordRequest,
    RemindersUpdateRequest,
    CareTeamContactRequest
)
from app.services.users import (
    update_profile,
    upsert_baseline_lifestyle,
    upsert_baseline_dietary,
    upsert_baseline_clinical,
    get_full_profile,
    delete_user,
    change_password,
    get_reminders,
    update_reminders,
    add_care_team_contact,
    update_care_team_contact,
    delete_care_team_contact
)
import app.mock_db as mock_db
from app.services.ml_service import ml_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", status_code=status.HTTP_200_OK)
async def read_all_users():
    return mock_db.profiles

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

@router.put("/{user_id}/password", status_code=status.HTTP_200_OK)
async def update_user_password(user_id: str, payload: ChangePasswordRequest):
    result = change_password(user_id, payload.current_password, payload.new_password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password"
        )
    return {"success": True, "message": "Password updated successfully"}

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user_account(user_id: str):
    result = delete_user(user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return {"success": True, "message": "Account permanently deleted"}

@router.get("/{user_id}/reminders", status_code=status.HTTP_200_OK)
async def read_user_reminders(user_id: str):
    return get_reminders(user_id)

@router.put("/{user_id}/reminders", status_code=status.HTTP_200_OK)
async def update_user_reminders_route(user_id: str, payload: RemindersUpdateRequest):
    result = update_reminders(user_id, payload.model_dump())
    return {"success": True, "message": "Reminders updated", "data": result}


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
    user_profile = next((p for p in mock_db.profiles if p["id"] == user_id), None)
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Validate that prior mandatory baseline steps are complete
    if not user_profile.get("first_name") or not user_profile.get("date_of_birth"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Core biometrics (name and date of birth) must be completed before saving clinical baseline."
        )

    lifestyle = next((l for l in mock_db.baseline_lifestyle if l["user_id"] == user_id), None)
    if not lifestyle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lifestyle baseline must be completed before saving clinical baseline."
        )

    dietary = next((d for d in mock_db.baseline_dietary if d["user_id"] == user_id), None)
    if not dietary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dietary baseline must be completed before saving clinical baseline."
        )

    result = upsert_baseline_clinical(user_id, payload.model_dump())

    # ML Prediction for Initial CSS
    clinical = payload.model_dump()
    css_entry = ml_service.predict_initial_css(user_id, lifestyle, dietary, clinical)

    return {
        "success": True,
        "message": "Clinical baseline saved — onboarding complete",
        "data": result,
        "initial_css": css_entry
    }

@router.post("/{user_id}/care-team", status_code=status.HTTP_201_CREATED)
async def add_care_team_member(user_id: str, payload: CareTeamContactRequest):
    result = add_care_team_contact(user_id, payload.model_dump())
    return {"success": True, "message": "Care team member added", "data": result}

@router.put("/{user_id}/care-team/{contact_id}", status_code=status.HTTP_200_OK)
async def update_care_team_member(user_id: str, contact_id: str, payload: CareTeamContactRequest):
    result = update_care_team_contact(user_id, contact_id, payload.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "message": "Care team member updated", "data": result}

@router.delete("/{user_id}/care-team/{contact_id}", status_code=status.HTTP_200_OK)
async def delete_care_team_member(user_id: str, contact_id: str):
    success = delete_care_team_contact(user_id, contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "message": "Care team member deleted"}