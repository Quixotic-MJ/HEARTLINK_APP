from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from app.services.health_logs import get_health_logs, create_health_log, delete_health_log
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/health-logs", tags=["Health Logs"])

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_health_logs(user_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own health logs.",
        )
    return get_health_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_health_log(user_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only record your own health logs.",
        )
    sys_bp = data.get("systolic_bp")
    dia_bp = data.get("diastolic_bp")
    hr = data.get("heart_rate_bpm")
    weight = data.get("weight_kg")
    
    if sys_bp is not None:
        if sys_bp < 50 or sys_bp > 300:
            raise HTTPException(status_code=400, detail="Systolic blood pressure must be between 50 and 300.")
    if dia_bp is not None:
        if dia_bp < 30 or dia_bp > 200:
            raise HTTPException(status_code=400, detail="Diastolic blood pressure must be between 30 and 200.")
    if hr is not None:
        if hr < 30 or hr > 250:
            raise HTTPException(status_code=400, detail="Heart rate must be between 30 and 250.")
    if weight is not None:
        if weight <= 0 or weight > 500:
            raise HTTPException(status_code=400, detail="Weight must be greater than 0.")

    log = create_health_log(user_id, data)
    return {"success": True, "message": "Health log saved", "data": log}

@router.delete("/{user_id}/{log_id}", response_model=Dict[str, Any])
def remove_health_log(user_id: str, log_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only delete your own health logs.",
        )
    success, msg, status_code = delete_health_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=status_code, detail=msg)
    return {"success": True, "message": msg}
