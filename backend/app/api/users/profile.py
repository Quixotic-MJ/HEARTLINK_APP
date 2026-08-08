from fastapi import APIRouter, status, HTTPException
from app.schemas.user import (
    ProfileUpdate,
    ChangePasswordRequest,
    RemindersUpdateRequest,
    CareTeamContactRequest
)
from app.services.users import (
    update_profile,
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


from app.schemas.user import BaselineOnboardingRequest
from app.services.hss_service import compute_initial_hss, HSSModelError
from datetime import datetime

@router.post("/{user_id}/baseline/complete", status_code=status.HTTP_201_CREATED)
async def complete_baseline_onboarding(user_id: str, payload: BaselineOnboardingRequest):
    user_profile = next((p for p in mock_db.profiles if p["id"] == user_id), None)
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
        
    if not user_profile.get("first_name") or not user_profile.get("date_of_birth"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Core biometrics (name and date of birth) must be completed before saving baseline."
        )

    onboarding_data = payload.model_dump()
    
    # 1. Compute HSS score using the ML model
    try:
        hss_score, hss_tier, risk_probability = compute_initial_hss(onboarding_data, user_profile)
    except HSSModelError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health Stability Score computation failed: {str(e)}"
        )

    # 2. Save the onboarding data (also marks onboarding_status as complete)
    from app.services.users import save_baseline_onboarding
    result = save_baseline_onboarding(user_id, onboarding_data, user_profile)
    
    # 3. Save the new HSS score
    new_hss = {
        "id": f"hss-baseline-{user_id}",
        "user_id": user_id,
        "score": hss_score,
        "tier": hss_tier,
        "risk_probability": risk_probability,
        "source": "baseline",
        "computed_at": datetime.utcnow(),
    }
    if hasattr(mock_db, 'hss_history'):
        mock_db.hss_history.append(new_hss)

    return {
        "success": True,
        "message": "Onboarding complete. HSS generated.",
        "data": result,
        "initial_hss": new_hss
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