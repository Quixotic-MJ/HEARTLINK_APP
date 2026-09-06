from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, Any
from app.services.analytics import get_analytics, update_thresholds
from app.utils.security import get_current_user, verify_user_access
from app.schemas.user import ThresholdsUpdateRequest

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/{user_id}", response_model=Dict[str, Any])
def read_analytics(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    verify_user_access(current_user, user_id)
    return get_analytics(user_id, days=days)

@router.put("/{user_id}/thresholds", response_model=Dict[str, Any])
def update_user_thresholds(
    user_id: str, 
    payload: ThresholdsUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    verify_user_access(current_user, user_id)
    res = update_thresholds(user_id, payload.model_dump())
    return {"success": True, "message": "Thresholds updated", "data": res}


