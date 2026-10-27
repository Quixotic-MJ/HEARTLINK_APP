from fastapi import APIRouter, Request, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
from app.services.exercises import get_routines, get_exercise_logs, create_exercise_log, delete_exercise_log, create_routine, update_routine, delete_routine, is_visible_to_patients, get_saved_exercises, save_exercise_for_user, unsave_exercise_for_user
from app.services.hss_service import compute_lifestyle_composite_hss
from app.utils.security import expert_id_if, require_permission, check_expert_permission, get_current_user, verify_token, get_optional_token, verify_user_access
from app.utils.activity_helper import record_admin_activity
from app.services.admin_notifications import notify_waiting_content

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

security = HTTPBearer(auto_error=False)

@router.get("/", response_model=List[Dict[str, Any]])
def read_routines(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    routines = get_routines()

    is_admin = False
    token = get_optional_token(request, credentials)
    if token:
        try:
            payload = verify_token(token)
            if payload.get("role") in ["admin", "medical_expert"]:
                is_admin = True
        except Exception:
            pass

    if is_admin:
        return routines
    return [r for r in routines if is_visible_to_patients(r)]

def _own_account_only(current_user: dict, user_id: str) -> None:
    if current_user.get("user_id") != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only change saved exercises for your own account.")

@router.get("/saved/{user_id}", response_model=List[Dict[str, Any]])
def read_saved_exercises(user_id: str, current_user: dict = Depends(get_current_user)):
    verify_user_access(current_user, user_id)
    return get_saved_exercises(user_id)

@router.post("/{routine_id}/save/{user_id}")
def save_exercise(routine_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    _own_account_only(current_user, user_id)
    save_exercise_for_user(user_id, routine_id)
    return {"success": True, "message": "Exercise saved"}

@router.delete("/{routine_id}/save/{user_id}")
def unsave_exercise(routine_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    _own_account_only(current_user, user_id)
    unsave_exercise_for_user(user_id, routine_id)
    return {"success": True, "message": "Exercise removed from saved"}

@router.get("/{routine_id}", response_model=Dict[str, Any])
def read_routine(routine_id: str, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    routines = get_routines()
    routine = next((r for r in routines if r["id"] == routine_id), None)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
        
    is_admin = False
    token = get_optional_token(request, credentials)
    if token:
        try:
            payload = verify_token(token)
            if payload.get("role") in ["admin", "medical_expert"]:
                is_admin = True
        except Exception:
            pass

    if not is_admin and not is_visible_to_patients(routine):
        raise HTTPException(status_code=404, detail="Routine not found")
        
    return routine

@router.post("/", response_model=Dict[str, Any])
def add_routine(data: Dict[str, Any], current_user: dict = Depends(require_permission("exercises:edit"))):
    new_routine = create_routine(data, pt_id=expert_id_if(current_user, "Physical Therapist"))
    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="created",
        target_type="exercise",
        target_id=new_routine.get("id"),
        target_name=new_routine.get("name")
    )
    # HL-082: tell the Physical Therapists when it now waits for their approval
    notify_waiting_content("exercise", new_routine, expert_id_if(current_user, "Physical Therapist"), admin_id)
    return new_routine

@router.put("/{routine_id}", response_model=Dict[str, Any])
def edit_routine(routine_id: str, data: Dict[str, Any], current_user: dict = Depends(require_permission("exercises:edit"))):
    try:
        updated_routine = update_routine(routine_id, data, pt_id=expert_id_if(current_user, "Physical Therapist"))
        if not updated_routine:
            raise ValueError("Exercise not found")
        admin_id = current_user.get("user_id") if current_user else "admin"
        record_admin_activity(
            admin_user_id=admin_id,
            action="updated",
            target_type="exercise",
            target_id=updated_routine.get("id"),
            target_name=updated_routine.get("name")
        )
        notify_waiting_content("exercise", updated_routine, expert_id_if(current_user, "Physical Therapist"), admin_id)
        return updated_routine
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{routine_id}", response_model=Dict[str, Any])
def remove_routine(routine_id: str, current_user: dict = Depends(require_permission("exercises:edit"))):
    routines = get_routines()
    routine = next((r for r in routines if r["id"] == routine_id), None)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    success = delete_routine(routine_id)
    if not success:
        raise HTTPException(status_code=404, detail="Routine not found")
    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="deleted",
        target_type="exercise",
        target_id=routine_id,
        target_name=routine.get("name")
    )
    return {"success": True, "message": "Routine deleted"}

from app.db.repositories.base import resolve_uuid

@router.get("/logs/{user_id}", response_model=List[Dict[str, Any]])
def read_exercise_logs(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    target_uuid = resolve_uuid(user_id)
    if not target_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    verify_user_access(current_user, user_id)
    check_expert_permission(current_user, "exercise_logs:read")
    return get_exercise_logs(user_id, limit=limit, offset=offset)

@router.post("/logs/{user_id}", response_model=Dict[str, Any])
def add_exercise_log(user_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    target_uuid = resolve_uuid(user_id)
    if not target_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    caller_uuid = resolve_uuid(caller_id) if caller_id else None

    # Write privilege is strictly restricted to the patient account owner
    if caller_role != "patient" or not caller_uuid or caller_uuid != target_uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient account owner may record their own exercise logs.",
        )

    if "duration_seconds" in data and data["duration_seconds"] is not None:
        try:
            sec_val = int(data["duration_seconds"])
            if sec_val < 0 or sec_val > 86400:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="duration_seconds must be between 0 and 86400 (24 hours).",
                )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="duration_seconds must be a valid integer.",
            )

    if "duration_minutes" in data and data["duration_minutes"] is not None:
        try:
            min_val = int(data["duration_minutes"])
            if min_val < 0 or min_val > 1440:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="duration_minutes must be between 0 and 1440 (24 hours).",
                )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="duration_minutes must be a valid integer.",
            )

    log = create_exercise_log(user_id, data)

    # Recalculate dynamic lifestyle composite HSS (Pillar B)
    try:
        compute_lifestyle_composite_hss(user_id, trigger="exercise_log")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to update lifestyle composite HSS after exercise log: %s", e)

    return {"success": True, "message": "Exercise log saved", "data": log}

@router.delete("/logs/{user_id}/{log_id}", response_model=Dict[str, Any])
def delete_log(user_id: str, log_id: str, current_user: dict = Depends(get_current_user)):
    target_uuid = resolve_uuid(user_id)
    if not target_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    caller_uuid = resolve_uuid(caller_id) if caller_id else None

    # Delete privilege is strictly restricted to the patient account owner
    if caller_role != "patient" or not caller_uuid or caller_uuid != target_uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient account owner may delete their own exercise logs.",
        )
    success, message, status_code = delete_exercise_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=status_code, detail=message)

    # Recalculate lifestyle composite HSS after exercise log deletion (HL-ENG-29)
    try:
        from app.services.hss_service import compute_lifestyle_composite_hss
        compute_lifestyle_composite_hss(user_id, trigger="exercise_delete")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to recalculate composite HSS after exercise deletion for {user_id}: {e}")

    return {"success": True, "message": message}

