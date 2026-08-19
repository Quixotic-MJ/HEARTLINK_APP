from fastapi import APIRouter, status, HTTPException, Depends
from app.utils.security import get_current_admin_user, get_current_user
from app.schemas.user import (
    ProfileUpdate,
    ChangePasswordRequest,
    RemindersUpdateRequest,
    CareTeamContactRequest,
    BaselineOnboardingRequest
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
    enriched_profiles = []
    from datetime import datetime, timedelta
    # Use datetime.min as default sort key
    from datetime import date
    
    for p in mock_db.profiles:
        if p.get("role") != "patient":
            enriched_profiles.append(p)
            continue
            
        # Compute HSS
        user_hss = [h for h in mock_db.hss_history if h.get("user_id") == p["id"]]
        if user_hss:
            # Sort with datetime fallback
            latest = sorted(user_hss, key=lambda x: x.get("computed_at") or datetime.min)[-1]
            hss_score = latest.get("score")
            hss_tier = latest.get("tier")
        else:
            hss_score = None
            hss_tier = "N/A"
            
        # Compute Activity Status (Checking last 7 days)
        cutoff = datetime.utcnow() - timedelta(days=7)
        recent_logs = []
        recent_logs.extend([m for m in mock_db.meal_logs if m.get("user_id") == p["id"] and m.get("created_at") and m["created_at"] >= cutoff])
        recent_logs.extend([e for e in mock_db.exercise_logs if e.get("user_id") == p["id"] and e.get("created_at") and e["created_at"] >= cutoff])
        recent_logs.extend([s for s in mock_db.sleep_logs if s.get("user_id") == p["id"] and not s.get("is_deleted") and s.get("created_at") and s["created_at"] >= cutoff])
        recent_logs.extend([d for d in mock_db.daily_health_logs if d.get("user_id") == p["id"] and d.get("created_at") and d["created_at"] >= cutoff])
        
        has_logs_at_all = any(
            [m for m in mock_db.meal_logs if m.get("user_id") == p["id"]] + 
            [e for e in mock_db.exercise_logs if e.get("user_id") == p["id"]] +
            [s for s in mock_db.sleep_logs if s.get("user_id") == p["id"] and not s.get("is_deleted")] +
            [d for d in mock_db.daily_health_logs if d.get("user_id") == p["id"]]
        )
        
        if recent_logs:
            activity_status = "Recently Active"
        elif has_logs_at_all:
            activity_status = "Inactive"
        else:
            activity_status = "New User"
            
        # Compute Review Status
        has_evaluation = any(e.get("user_id") == p["id"] for e in mock_db.expert_evaluations)
        review_status = "Evaluated" if has_evaluation else "Pending Review"
        
        p_copy = p.copy()
        p_copy["hss_score"] = hss_score
        p_copy["hss_tier"] = hss_tier
        p_copy["activity_status"] = activity_status
        p_copy["review_status"] = review_status
        enriched_profiles.append(p_copy)
        
    return enriched_profiles

@router.get("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def read_user_profile(user_id: str):
    data = get_full_profile(user_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return data

@router.put("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def update_user_profile(
    user_id: str,
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    if caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only update your own profile.",
        )
    result = update_profile(user_id, payload.model_dump())
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return {"success": True, "message": "Profile updated", "data": result}

@router.put("/{user_id}/password", status_code=status.HTTP_200_OK)
async def update_user_password(
    user_id: str,
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_admin_user),
):
    # ── Ownership check ────────────────────────────────────────────────────────
    # Authenticated caller may only change their own password.
    # No admin may use this endpoint to change another user's password.
    caller_id = current_user.get("user_id")
    if caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only change your own password.",
        )

    # ── Rate-limit on failed password attempts ─────────────────────────────────
    # Reuse the existing login_attempts mechanism from auth.py.
    # Key is the authenticated caller's user_id so it is tied to identity, not IP.
    from app.api.auth.auth import check_rate_limit, record_failed_attempt, clear_attempts
    check_rate_limit(caller_id)

    # ── Password verification and mutation ────────────────────────────────────
    result = change_password(user_id, payload.current_password, payload.new_password)
    if not result:
        # Count this as a failed attempt toward the lockout threshold
        record_failed_attempt(caller_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    # Successful change: reset any accumulated failed attempts for this user
    clear_attempts(caller_id)

    # ── Activity log ──────────────────────────────────────────────────────────
    # Actor is the authenticated caller (caller_id), NOT the path parameter.
    # No passwords, hashes, or tokens are written to the log.
    # Failed changes never reach this block (HTTPException raised above).
    try:
        from app.utils.activity_helper import record_admin_activity
        import app.mock_db as _mock_db
        _profile = next((p for p in _mock_db.profiles if p["id"] == user_id), None)
        _label = None
        if _profile:
            _fn = _profile.get("first_name", "")
            _ln = _profile.get("last_name", "")
            _label = f"{_fn} {_ln}".strip() or _profile.get("email") or user_id
        record_admin_activity(
            admin_user_id=caller_id,   # authenticated caller — not the URL path param
            action="changed password",
            target_type="user",
            target_id=user_id,
            target_name=_label,
        )
    except Exception:
        pass  # Logging must never block the primary operation

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


from app.services.hss_service import compute_initial_hss, HSSModelError
from datetime import datetime

@router.post("/{user_id}/baseline/complete", status_code=status.HTTP_201_CREATED)
async def complete_baseline_onboarding(
    user_id: str,
    payload: BaselineOnboardingRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    if caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only complete baseline onboarding for your own account.",
        )
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
    
    # 3. Save or update the baseline HSS score
    baseline_id = f"hss-base-{user_id}"
    now_utc = datetime.utcnow()
    new_hss = None

    if hasattr(mock_db, 'hss_history'):
        # Check for existing baseline record for this user
        existing_baseline = None
        for record in mock_db.hss_history:
            if record.get("user_id") == user_id and (
                record.get("source") == "baseline" or 
                record.get("id") in (baseline_id, f"hss-baseline-{user_id}")
            ):
                existing_baseline = record
                break

        if existing_baseline:
            existing_baseline["id"] = baseline_id
            existing_baseline["score"] = hss_score
            existing_baseline["tier"] = hss_tier
            existing_baseline["risk_probability"] = risk_probability
            existing_baseline["source"] = "baseline"
            existing_baseline["computed_at"] = now_utc
            new_hss = existing_baseline
        else:
            new_hss = {
                "id": baseline_id,
                "user_id": user_id,
                "score": hss_score,
                "tier": hss_tier,
                "risk_probability": risk_probability,
                "source": "baseline",
                "computed_at": now_utc,
            }
            mock_db.hss_history.append(new_hss)

        if hasattr(mock_db, 'save_logs'):
            mock_db.save_logs()

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