from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from app.services.analytics import get_analytics, update_thresholds
from app.utils.security import get_current_user
from app.schemas.user import ThresholdsUpdateRequest

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/{user_id}", response_model=Dict[str, Any])
def read_analytics(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own analytics data.",
        )
    return get_analytics(user_id)

@router.put("/{user_id}/thresholds", response_model=Dict[str, Any])
def update_user_thresholds(
    user_id: str, 
    payload: ThresholdsUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own clinical thresholds.",
        )
    res = update_thresholds(user_id, payload.model_dump())
    return {"success": True, "message": "Thresholds updated", "data": res}

