from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from app.services.sleep_logs import get_sleep_logs, create_sleep_log, delete_sleep_log
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/sleep-logs", tags=["Sleep Logs"])

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_sleep_logs(user_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own sleep data.",
        )
    return get_sleep_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_sleep_log(user_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only record your own sleep data.",
        )
    
    # Validate and coerce duration_hours
    try:
        duration = float(data.get("duration_hours", 0))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid sleep duration value.")

    if duration <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sleep duration must be greater than 0.")
    data["duration_hours"] = duration

    # Normalize quality to canonical TitleCase ('Poor', 'Fair', 'Good', 'Excellent')
    raw_quality = data.get("quality")
    if raw_quality:
        canonical_quality = str(raw_quality).strip().capitalize()
        if canonical_quality not in ["Poor", "Fair", "Good", "Excellent"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Sleep quality must be one of: 'Poor', 'Fair', 'Good', 'Excellent'."
            )
        data["quality"] = canonical_quality
    else:
        data["quality"] = "Good"

    log = create_sleep_log(user_id, data)
    return {"success": True, "message": "Sleep log saved", "data": log}

@router.delete("/{user_id}/{log_id}", response_model=Dict[str, Any])
def remove_sleep_log(user_id: str, log_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only delete your own sleep data.",
        )
    success = delete_sleep_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    return {"success": True, "message": "Sleep log deleted"}
