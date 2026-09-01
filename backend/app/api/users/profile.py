from fastapi import APIRouter, status, HTTPException, Depends
from app.utils.security import get_current_user
from app.schemas.user import (
    ProfileUpdate,
    ChangePasswordRequest,
    DeleteAccountRequest,
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

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", status_code=status.HTTP_200_OK)
async def read_all_users(current_user: dict = Depends(get_current_user)):
    caller_role = current_user.get("role")
    if caller_role not in ["admin", "super_admin", "medical_expert"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admins/Experts only",
        )

    enriched_profiles = []
    from datetime import datetime, timedelta, timezone
    from app.db.repositories import (
        get_profile_repo,
        get_hss_repo,
        get_health_logs_repo,
        get_meals_repo,
        get_exercises_repo,
        get_sleep_repo,
        get_case_review_repo,
    )
    
    all_profiles = get_profile_repo().list_all()
    
    # --- BULK AGGREGATION TO PREVENT N+1 QUERY ---
    import logging
    logger = logging.getLogger(__name__)

    all_hss = all_meals = all_exercises = all_sleeps = all_health_logs = all_reviews = []

    try:
        all_hss = get_hss_repo().list_all_hss_records()
    except Exception as e:
        logger.error(f"[read_all_users] Failed to fetch HSS records: {e}", exc_info=True)

    try:
        all_meals = get_meals_repo().list_all_meals()
    except Exception as e:
        logger.error(f"[read_all_users] Failed to fetch meal logs: {e}", exc_info=True)

    try:
        all_exercises = get_exercises_repo().list_all_logs()
    except Exception as e:
        logger.error(f"[read_all_users] Failed to fetch exercise logs: {e}", exc_info=True)

    try:
        all_sleeps = get_sleep_repo().list_all_logs()
    except Exception as e:
        logger.error(f"[read_all_users] Failed to fetch sleep logs: {e}", exc_info=True)

    try:
        all_health_logs = get_health_logs_repo().list_all_logs()
    except Exception as e:
        logger.error(f"[read_all_users] Failed to fetch health logs: {e}", exc_info=True)

    try:
        all_reviews = get_case_review_repo().list_evaluations()
    except Exception as e:
        logger.error(f"[read_all_users] Failed to fetch case reviews: {e}", exc_info=True)

    # Build memory maps
    hss_map = {}
    for r in all_hss:
        uid = r.get("user_id")
        # Since it's ordered by computed_at desc in the repo, the first one encountered is the latest.
        if uid and uid not in hss_map:
            hss_map[uid] = r

    activity_map = {}
    cutoff = datetime.utcnow() - timedelta(days=7)
    
    def parse_dt(x):
        if x is None:
            return datetime.min
        dt = x
        if isinstance(x, dict):
            dt = x.get("created_at") or x.get("logged_at") or x.get("timestamp") or x.get("computed_at")
        if isinstance(dt, datetime):
            if dt.tzinfo is not None:
                return dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        if isinstance(dt, str):
            try:
                s = dt.strip()
                if s.endswith("Z"):
                    s = s[:-1] + "+00:00"
                parsed = datetime.fromisoformat(s)
                if parsed.tzinfo is not None:
                    return parsed.astimezone(timezone.utc).replace(tzinfo=None)
                return parsed
            except Exception:
                return datetime.min
        return datetime.min

    def add_dates(data_list):
        for r in data_list:
            uid = r.get("user_id")
            if not uid: continue
            if uid not in activity_map:
                activity_map[uid] = []
            activity_map[uid].append(parse_dt(r))

    add_dates(all_meals)
    add_dates(all_exercises)
    add_dates(all_sleeps)
    add_dates(all_health_logs)
    
    review_set = {r.get("user_id") for r in all_reviews if r.get("user_id")}
    # ---------------------------------------------

    for p in all_profiles:
        if p.get("role") != "patient":
            # Sanitize passwords before returning
            clean_p = {k: v for k, v in p.items() if k not in ["password", "password_hash", "token", "secret"]}
            enriched_profiles.append(clean_p)
            continue

        try:
            uid = p.get("id")
            # Compute HSS
            latest_hss = hss_map.get(uid)
            if latest_hss:
                hss_score = latest_hss.get("score")
                hss_tier = latest_hss.get("tier")
            else:
                hss_score = None
                hss_tier = "N/A"
                
            # Compute Activity Status
            user_dates = activity_map.get(uid, [])
            recent_logs = [d for d in user_dates if d >= cutoff]
            if recent_logs:
                activity_status = "Recently Active"
            elif user_dates:
                activity_status = "Inactive"
            else:
                activity_status = "New User"
                
            # Compute Review Status
            review_status = "Evaluated" if uid in review_set else "Pending Review"
            
            p_copy = {k: v for k, v in p.items() if k not in ["password", "password_hash", "token", "secret"]}
            p_copy["hss_score"] = hss_score
            p_copy["hss_tier"] = hss_tier
            p_copy["activity_status"] = activity_status
            p_copy["review_status"] = review_status
            enriched_profiles.append(p_copy)
        except Exception as enrich_err:
            print(f"[read_all_users] Enrichment logic failed for user {p.get('id')}: {enrich_err}")
            p_copy = {k: v for k, v in p.items() if k not in ["password", "password_hash", "token", "secret"]}
            p_copy["hss_score"] = None
            p_copy["hss_tier"] = "N/A"
            p_copy["activity_status"] = "Unknown"
            p_copy["review_status"] = "Pending Review"
            enriched_profiles.append(p_copy)
        
    return enriched_profiles



@router.get("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def read_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    # Ownership rule: users can only access their own profile unless they are admin/medical_expert
    if caller_id != user_id and caller_role not in ["admin", "super_admin", "medical_expert"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own profile.",
        )
        
    user_profile = get_full_profile(user_id)
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user_profile


@router.put("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def update_user_profile(
    user_id: str,
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    # Ownership rule: users can only update their own profile unless super_admin
    if caller_id != user_id and caller_role != "super_admin":
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
    current_user: dict = Depends(get_current_user),
):
    # ── Ownership check ────────────────────────────────────────────────────────
    caller_id = current_user.get("user_id")
    if caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only change your own password.",
        )

    # ── Password verification and mutation ────────────────────────────────────
    result = change_password(user_id, payload.current_password, payload.new_password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
    # ── Activity log ──────────────────────────────────────────────────────────
    try:
        from app.utils.activity_helper import record_admin_activity
        from app.db.repositories import get_profile_repo
        _profile = get_profile_repo().get_by_id(user_id)
        _label = None
        if _profile:
            _fn = _profile.get("first_name", "")
            _ln = _profile.get("last_name", "")
            _label = f"{_fn} {_ln}".strip() or _profile.get("email") or user_id
        record_admin_activity(
            admin_user_id=caller_id,
            action="changed password",
            target_type="account",
            target_id=user_id,
            target_name=_label,
        )
    except Exception:
        pass

    return {"success": True, "message": "Password updated successfully"}


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user_account(
    user_id: str,
    payload: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    # Ownership rule: users can only delete their own account (or super_admin)
    if caller_id != user_id and caller_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only delete your own account.",
        )
        
    from app.db.repositories import get_profile_repo
    _profile = get_profile_repo().get_by_id(user_id)
    if not _profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    _fn = _profile.get("first_name", "")
    _ln = _profile.get("last_name", "")
    _label = f"{_fn} {_ln}".strip() or _profile.get("email") or user_id

    result = delete_user(user_id, password=payload.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Account deletion aborted.",
        )
        
    # Record exactly one audit log on successful deletion
    try:
        from app.utils.activity_helper import record_admin_activity
        record_admin_activity(
            admin_user_id=caller_id,
            action="deleted account",
            target_type="account",
            target_id=user_id,
            target_name=_label,
        )
    except Exception:
        pass
        
    return {"success": True, "message": "Account permanently deleted"}


@router.get("/{user_id}/reminders", status_code=status.HTTP_200_OK)
async def read_user_reminders(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own reminders.",
        )
    return get_reminders(user_id)


@router.put("/{user_id}/reminders", status_code=status.HTTP_200_OK)
async def update_user_reminders_route(
    user_id: str, 
    payload: RemindersUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only update your own reminders.",
        )
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
    
    from app.db.repositories import get_profile_repo, get_hss_repo
    profile_repo = get_profile_repo()
    user_profile = profile_repo.get_by_id(user_id)
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
    now_utc = datetime.utcnow()
    hss_repo = get_hss_repo()
    new_hss = hss_repo.create_hss_record(user_id, {
        "score": hss_score,
        "tier": hss_tier,
        "risk_probability": risk_probability,
        "source": "baseline",
        "computed_at": now_utc.isoformat()
    })

    return {
        "success": True,
        "message": "Onboarding complete. HSS generated.",
        "data": result,
        "initial_hss": new_hss
    }

@router.post("/{user_id}/care-team", status_code=status.HTTP_201_CREATED)
async def add_care_team_member(
    user_id: str, 
    payload: CareTeamContactRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own care team.",
        )
    result = add_care_team_contact(user_id, payload.model_dump())
    return {"success": True, "message": "Care team member added", "data": result}

@router.put("/{user_id}/care-team/{contact_id}", status_code=status.HTTP_200_OK)
async def update_care_team_member(
    user_id: str, 
    contact_id: str, 
    payload: CareTeamContactRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own care team.",
        )
    result = update_care_team_contact(user_id, contact_id, payload.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "message": "Care team member updated", "data": result}

@router.delete("/{user_id}/care-team/{contact_id}", status_code=status.HTTP_200_OK)
async def delete_care_team_member(
    user_id: str, 
    contact_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own care team.",
        )
    success = delete_care_team_contact(user_id, contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "message": "Care team member deleted"}