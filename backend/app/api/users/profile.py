from fastapi import APIRouter, status, HTTPException, Depends, Request, Response
from app.utils.security import get_current_user, get_current_admin_only, set_auth_cookies, REFRESH_COOKIE_NAME, STAFF_ROLES
from app.services.session_service import restart_after_password_change
from app.utils.rate_limiter import limiter, user_or_ip_key
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.schemas.user import (
    ProfileUpdate,
    ChangePasswordRequest,
    DeleteAccountRequest,
    RemindersUpdateRequest,
    CareTeamContactRequest,
    BaselineOnboardingRequest,
    HeartAnswersUpdate,
    KidneyResult,
    RISK_ANSWERS,
    RiskAnswersUpdate,
    CholesterolResult,
    BloodSugarResult,
    ExerciseScreeningRequest,
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
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", status_code=status.HTTP_200_OK)
async def read_all_users(current_user: dict = Depends(get_current_admin_only)):
    """HL-136: the Admin's account directory. Account fields only; Admins can't open health records."""
    from app.db.repositories import get_profile_repo
    try:
        return [row for row in get_profile_repo().list_portal_accounts() if row.get("role") == "patient"]
    except Exception as error:
        logger.warning("Account directory unavailable (%s)", type(error).__name__)
        raise HTTPException(status_code=500, detail="Account directory unavailable")


@router.get("/{user_id}/profile", status_code=status.HTTP_200_OK)
async def read_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    from app.utils.security import verify_user_access
    verify_user_access(current_user, user_id)
        
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
    
    # Ownership rule: users can only update their own profile unless an admin
    if caller_id != user_id and caller_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only update your own profile.",
        )
    result = update_profile(user_id, payload.model_dump())
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    # Height and weight set the score's body weight area. During setup there are no answers yet, so nothing to update.
    if payload.height_cm is not None or payload.weight_kg is not None:
        try:
            from app.db.repositories import get_baseline_repo
            if get_baseline_repo().get_baseline(user_id):
                try_recalculate(user_id, "profile_update")
        except Exception as e:
            logger.warning(f"Couldn't update the Heart score after a profile change: {e}")
    return {"success": True, "message": "Profile updated", "data": result}


@router.put("/{user_id}/password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute", key_func=user_or_ip_key)  # the current-password check must not be a way to guess passwords
async def update_user_password(
    user_id: str,
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
):
    # ── Ownership check ────────────────────────────────────────────────────────
    caller_id = current_user.get("user_id")
    if caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only change your own password.",
        )

    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )

    # ── Password verification and mutation ────────────────────────────────────
    result = change_password(user_id, payload.current_password, payload.new_password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    # HL-044: the temporary password has been replaced, so unlock the account
    from app.db.repositories import get_profile_repo
    profile_repo = get_profile_repo()
    caller_profile = profile_repo.get_by_id(user_id)
    if caller_profile and caller_profile.get("must_change_password"):
        if not profile_repo.update(user_id, {"must_change_password": False}):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Password changed, but the account could not be unlocked. Please try logging in again.",
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

    # HL-047: every session of this account ends (other devices are logged out); this device gets a fresh one
    is_mobile = request.headers.get("authorization", "").lower().startswith("bearer ")
    session = restart_after_password_change(
        user_id,
        current_user.get("role", "patient"),
        "mobile" if is_mobile else "web",
        current_refresh=None if is_mobile else request.cookies.get(REFRESH_COOKIE_NAME),
    )
    if is_mobile:
        return {
            "success": True,
            "message": "Password updated successfully",
            "token": session["token"],
            "refresh_token": session["refresh_token"],
            "expires_in": session["expires_in"],
        }
    set_auth_cookies(response, session)
    return {"success": True, "message": "Password updated successfully"}


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute", key_func=user_or_ip_key)  # the password check must not be a way to guess passwords
async def delete_user_account(
    user_id: str,
    payload: DeleteAccountRequest,
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    # Ownership rule: users can only delete their own account (or an admin)
    if caller_id != user_id and caller_role != "admin":
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
            detail="Incorrect password. Your account is still open.",
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
        
    # The account is archived (closed): signing in stops and the records are kept, so say "closed", not "deleted"
    return {"success": True, "message": "Account closed"}


@router.get("/{user_id}/reminders", status_code=status.HTTP_200_OK)
async def read_user_reminders(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    from app.utils.security import verify_user_access
    verify_user_access(current_user, user_id)
    return get_reminders(user_id)


@router.put("/{user_id}/reminders", status_code=status.HTTP_200_OK)
async def update_user_reminders_route(
    user_id: str, 
    payload: RemindersUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_id != user_id and caller_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only update your own reminders.",
        )
    result = update_reminders(user_id, payload.model_dump())
    return {"success": True, "message": "Reminders updated", "data": result}


from app.services.heart_score import recalculate_score, try_recalculate
from app.services.starting_score import compute_initial_hss, HSSModelError, load_hss_model
from datetime import datetime

def _own_account(current_user: dict, user_id: str) -> None:
    if current_user.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only change your own account.")


# HL-093: the pre-exercise safety check
@router.get("/{user_id}/exercise-screening")
async def get_exercise_screening(user_id: str, current_user: dict = Depends(get_current_user)):
    _own_account(current_user, user_id)
    from app.services import exercise_screening

    return exercise_screening.status_for(user_id)


@router.put("/{user_id}/exercise-screening")
async def save_exercise_screening(
    user_id: str, payload: ExerciseScreeningRequest, current_user: dict = Depends(get_current_user)
):
    _own_account(current_user, user_id)
    from app.services import exercise_screening

    if payload.parq_form is not None:
        return exercise_screening.save_form(user_id, payload.parq_form, payload.pregnant, payload.unwell, payload.declared)
    if payload.parq_result is None and payload.answers is not None:
        return exercise_screening.save_old_answers(user_id, payload.answers)
    return exercise_screening.save_answers(
        user_id, payload.parq_result or "", payload.extra_check_yes, payload.pregnant, payload.unwell, payload.declared
    )


@router.post("/{user_id}/exercise-screening/clear")
async def clear_exercise_screening(user_id: str, current_user: dict = Depends(get_current_user)):
    _own_account(current_user, user_id)
    from app.services import exercise_screening

    return exercise_screening.clear(user_id)


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
    if not onboarding_data.get("smoke_quit_when"):
        onboarding_data.pop("smoke_quit_when", None)
    for key in RISK_ANSWERS:  # HL-140: an older app doesn't send them
        if onboarding_data.get(key) is None:
            onboarding_data.pop(key, None)

    # 1. The starting score from the machine learning model
    try:
        hss_score, hss_tier, model_estimate, rule = compute_initial_hss(onboarding_data, user_profile)
    except HSSModelError as e:
        logger.error(f"Health Stability Score computation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health Stability Score computation failed"
        )

    # 2. Save the onboarding data (also marks onboarding_status as complete)
    from app.services.users import save_baseline_onboarding
    result = save_baseline_onboarding(user_id, onboarding_data, user_profile)

    # 3. HL-139: the estimated Heart risk from the same answers (no lab results or readings yet)
    from app.services.heart_risk import risk_for, risk_probability
    try:
        risk = risk_for(profile=user_profile, baseline=onboarding_data, health_logs=[], sleep_logs=[], lab_results=[])
    except Exception as e:
        logger.warning("Heart risk at setup couldn't be worked out (%s)", type(e).__name__)
        risk = None

    # 4. Save the starting score. The Heart score takes over at the first log (heart_score.py)
    now_utc = utc_now()
    hss_repo = get_hss_repo()
    new_hss = hss_repo.create_hss_record(user_id, {
        "score": hss_score,
        "tier": hss_tier,
        "risk_probability": risk_probability(risk),
        "source": "baseline",
        "model_version": load_hss_model().get("version"),
        "contributing_factors": {"source": "starting_model", "trigger": "setup", "model_estimate": round(model_estimate, 1),
                                 "rule": rule, "risk": risk},
        "computed_at": now_utc.isoformat()
    })

    return {
        "success": True,
        "message": "Onboarding complete. HSS generated.",
        "data": result,
        "initial_hss": new_hss
    }

@router.put("/{user_id}/baseline/answers", status_code=status.HTTP_200_OK)
async def update_heart_answers(
    user_id: str,
    payload: HeartAnswersUpdate,
    current_user: dict = Depends(get_current_user),
):
    """HL-114: smoking and diet answers can change after setup, and the Heart score follows them."""
    _own_account(current_user, user_id)
    from app.db.repositories import get_baseline_repo
    repo = get_baseline_repo()
    if not repo.get_baseline(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finish setup first.")
    data = payload.model_dump()
    for key in RISK_ANSWERS:  # HL-140: an older app doesn't send them, so keep what's saved
        if data.get(key) is None:
            data.pop(key, None)
    saved = repo.save_baseline(user_id, data)
    new_hss = recalculate_score(user_id, "answers_update")
    return {"success": True, "message": "Answers updated", "data": saved, "hss": new_hss}


@router.put("/{user_id}/baseline/risk-answers", status_code=status.HTTP_200_OK)
async def update_risk_answers(user_id: str, payload: RiskAnswersUpdate, current_user: dict = Depends(get_current_user)):
    """HL-140: BP medicine, diabetes and cholesterol medicine, which the Heart risk needs. Existing users answer them
    once from the Dashboard; anyone can change them in Settings."""
    _own_account(current_user, user_id)
    from app.db.repositories import get_baseline_repo
    repo = get_baseline_repo()
    if not repo.get_baseline(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finish setup first.")
    saved = repo.save_baseline(user_id, payload.model_dump())
    return {"success": True, "data": saved, "hss": recalculate_score(user_id, "risk_answers")}


# HL-138: optional lab results for the Heart score (own account only; experts see them on the patient page)
@router.get("/{user_id}/lab-results")
async def get_lab_results(user_id: str, current_user: dict = Depends(get_current_user)):
    _own_account(current_user, user_id)
    from app.services import lab_results
    return lab_results.results_for(user_id)


@router.put("/{user_id}/lab-results/cholesterol")
async def save_cholesterol(user_id: str, payload: CholesterolResult, current_user: dict = Depends(get_current_user)):
    _own_account(current_user, user_id)
    from app.services import lab_results
    saved = lab_results.save(user_id, "cholesterol", payload.model_dump())
    return {"result": saved, "hss": recalculate_score(user_id, "lab_results")}


@router.put("/{user_id}/lab-results/blood_sugar")
async def save_blood_sugar(user_id: str, payload: BloodSugarResult, current_user: dict = Depends(get_current_user)):
    _own_account(current_user, user_id)
    from app.services import lab_results
    saved = lab_results.save(user_id, "blood_sugar", payload.model_dump())
    return {"result": saved, "hss": recalculate_score(user_id, "lab_results")}


@router.put("/{user_id}/lab-results/kidney")
async def save_kidney(user_id: str, payload: KidneyResult, current_user: dict = Depends(get_current_user)):
    """HL-141: a kidney result for the Heart risk."""
    _own_account(current_user, user_id)
    from app.services import lab_results
    saved = lab_results.save(user_id, "kidney", payload.model_dump())
    return {"result": saved, "hss": recalculate_score(user_id, "lab_results")}


@router.delete("/{user_id}/lab-results/{kind}")
async def remove_lab_result(user_id: str, kind: str, current_user: dict = Depends(get_current_user)):
    _own_account(current_user, user_id)
    from app.services import lab_results
    lab_results.remove(user_id, kind)
    return {"success": True, "hss": recalculate_score(user_id, "lab_results")}


@router.post("/{user_id}/care-team", status_code=status.HTTP_201_CREATED)
async def add_care_team_member(
    user_id: str, 
    payload: CareTeamContactRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_id != user_id and caller_role != "admin":
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
    if caller_id != user_id and caller_role != "admin":
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
    if caller_id != user_id and caller_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own care team.",
        )
    success = delete_care_team_contact(user_id, contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "message": "Care team member deleted"}
