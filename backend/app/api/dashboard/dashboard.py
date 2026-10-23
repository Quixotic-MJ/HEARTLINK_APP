import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from typing import Any, Dict
from app.services.dashboard import get_dashboard_data, get_7_day_wrap_up_data
from app.utils.security import get_current_user
from app.utils.rate_limiter import limiter, DASHBOARD_RATE_LIMIT, user_or_ip_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/me", response_model=Dict[str, Any])
@limiter.limit(DASHBOARD_RATE_LIMIT, key_func=user_or_ip_key)
def get_dashboard(request: Request, response: Response, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    try:
        data = get_dashboard_data(user_id)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dashboard data not found",
            )
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Dashboard /me Error for {user_id}]: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard data",
        )

@router.get("/wrapup", response_model=Dict[str, Any])
def get_wrapup(
    local_date: str = None,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    try:
        data = get_7_day_wrap_up_data(user_id, local_date)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wrap-up data not found",
            )
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Dashboard /wrapup Error for {user_id}]: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load wrap-up data",
        )

