from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, Any
from app.services.analytics import get_analytics, update_thresholds
from app.services.long_term_trends import LONG_TERM_DAYS, build_long_term
from app.services.premium import require_premium
from app.utils.security import get_current_user, verify_user_access, check_expert_permission
from app.schemas.user import ThresholdsUpdateRequest

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/{user_id}", response_model=Dict[str, Any])
def read_analytics(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    verify_user_access(current_user, user_id)
    check_expert_permission(current_user, "vitals:read")
    return get_analytics(user_id, days=days)

@router.get("/{user_id}/long-term", response_model=Dict[str, Any])
def read_long_term_trends(user_id: str, days: int = Query(default=90), current_user: dict = Depends(require_premium)):
    """HL-086: 90-day and 1-year Trends, a HeartLink Premium feature (app/services/long_term_trends.py)."""
    verify_user_access(current_user, user_id)
    if days not in LONG_TERM_DAYS:
        raise HTTPException(status_code=400, detail="Choose 90 days or 1 year.")
    return build_long_term(user_id, days)

@router.put("/{user_id}/thresholds", response_model=Dict[str, Any])
def update_user_thresholds(
    user_id: str, 
    payload: ThresholdsUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    verify_user_access(current_user, user_id)
    check_expert_permission(current_user, "vitals:write")
    res = update_thresholds(user_id, payload.model_dump())
    return {"success": True, "message": "Thresholds updated", "data": res}


