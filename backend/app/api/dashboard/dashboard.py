from fastapi import APIRouter, HTTPException, Depends, status
from typing import Any, Dict
from app.services.dashboard import get_dashboard_data, get_7_day_wrap_up_data
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/me", response_model=Dict[str, Any])
def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    data = get_dashboard_data(user_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard data not found",
        )
    return data

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
    data = get_7_day_wrap_up_data(user_id, local_date)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrap-up data not found",
        )
    return data

