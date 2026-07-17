from fastapi import APIRouter, HTTPException
from typing import Any, Dict
from app.services.dashboard import get_dashboard_data

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/{user_id}", response_model=Dict[str, Any])
def get_dashboard(user_id: str):
    data = get_dashboard_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Dashboard data not found")
    return data
