from fastapi import APIRouter, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
from app.services.exercises import get_routines, get_exercise_logs, create_exercise_log, delete_exercise_log, create_routine, update_routine, delete_routine
from app.utils.security import get_current_admin_user, get_current_user, verify_token
from app.utils.activity_helper import record_admin_activity

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

security = HTTPBearer(auto_error=False)

@router.get("/", response_model=List[Dict[str, Any]])
def read_routines(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    routines = get_routines()
    
    is_admin = False
    if credentials:
        try:
            payload = verify_token(credentials.credentials)
            if payload.get("role") in ["admin", "medical_expert"]:
                is_admin = True
        except Exception:
            pass
            
    if is_admin:
        return routines
    return [r for r in routines if r.get("status") == "published"]

@router.get("/{routine_id}", response_model=Dict[str, Any])
def read_routine(routine_id: str, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    routines = get_routines()
    routine = next((r for r in routines if r["id"] == routine_id), None)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
        
    is_admin = False
    if credentials:
        try:
            payload = verify_token(credentials.credentials)
            if payload.get("role") in ["admin", "medical_expert"]:
                is_admin = True
        except Exception:
            pass
            
    if not is_admin and routine.get("status") != "published":
        raise HTTPException(status_code=404, detail="Routine not found")
        
    return routine

@router.post("/", response_model=Dict[str, Any])
def add_routine(data: Dict[str, Any], current_user: dict = Depends(get_current_admin_user)):
    new_routine = create_routine(data)
    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="created",
        target_type="exercise",
        target_id=new_routine.get("id"),
        target_name=new_routine.get("name")
    )
    return new_routine

@router.put("/{routine_id}", response_model=Dict[str, Any])
def edit_routine(routine_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_admin_user)):
    try:
        updated_routine = update_routine(routine_id, data)
        admin_id = current_user.get("user_id") if current_user else "admin"
        record_admin_activity(
            admin_user_id=admin_id,
            action="updated",
            target_type="exercise",
            target_id=updated_routine.get("id"),
            target_name=updated_routine.get("name")
        )
        return updated_routine
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{routine_id}", response_model=Dict[str, Any])
def remove_routine(routine_id: str, current_user: dict = Depends(get_current_admin_user)):
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

@router.get("/logs/{user_id}", response_model=List[Dict[str, Any]])
def read_exercise_logs(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own exercise logs.",
        )
    return get_exercise_logs(user_id, limit=limit, offset=offset)

@router.post("/logs/{user_id}", response_model=Dict[str, Any])
def add_exercise_log(user_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only record your own exercise logs.",
        )
    log = create_exercise_log(user_id, data)
    return {"success": True, "message": "Exercise log saved", "data": log}

@router.delete("/logs/{user_id}/{log_id}", response_model=Dict[str, Any])
def delete_log(user_id: str, log_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only delete your own exercise logs.",
        )
    success, message, status_code = delete_exercise_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=status_code, detail=message)
    return {"success": True, "message": message}

