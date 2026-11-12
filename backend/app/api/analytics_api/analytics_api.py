from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, Any
from app.services.analytics import get_analytics, update_thresholds
from app.services.long_term_trends import LONG_TERM_DAYS, build_long_term
from app.services.progress_summary import SUMMARY_DAYS, build_summary
from app.services.premium import require_premium
from app.utils.security import get_current_user, verify_user_access, check_expert_permission
from app.schemas.user import ThresholdsUpdateRequest
from app.services.nutrition_targets import SODIUM_LIMIT_MG

STRICT_LIMITS_MESSAGE = "Your daily limits come from heart-health guidelines. Your care team can set a lower one."

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

@router.get("/{user_id}/summary", response_model=Dict[str, Any])
def read_progress_summary(
    user_id: str,
    days: int = Query(default=7),
    current_user: dict = Depends(get_current_user),
):
    """The AI summary on Trends for 7, 14 or 30 days (app/services/progress_summary.py). Free, like those periods."""
    verify_user_access(current_user, user_id)
    check_expert_permission(current_user, "vitals:read")
    if days not in SUMMARY_DAYS:
        raise HTTPException(status_code=400, detail="Choose 7, 14 or 30 days.")
    return build_summary(user_id, days)

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
    data = payload.model_dump(exclude_none=True)
    # HL-156: strict daily limits. A patient can't change their sodium limit (sending the guideline value is ignored,
    # for older app builds); the care team can only set a stricter (lower) one.
    sodium = data.get("sodium_limit_mg")
    if sodium is not None:
        if current_user.get("role") == "patient":
            if sodium != SODIUM_LIMIT_MG:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=STRICT_LIMITS_MESSAGE)
            data.pop("sodium_limit_mg")
        elif sodium > SODIUM_LIMIT_MG:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"A personal sodium limit can only be stricter than {SODIUM_LIMIT_MG:,} mg.")
    if not data:
        return {"success": True, "message": "Nothing to change", "data": {}}
    res = update_thresholds(user_id, data)
    return {"success": True, "message": "Thresholds updated", "data": res}


