from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.analytics import get_analytics, update_thresholds

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/{user_id}", response_model=Dict[str, Any])
def read_analytics(user_id: str):
    return get_analytics(user_id)

@router.put("/{user_id}/thresholds", response_model=Dict[str, Any])
def update_user_thresholds(user_id: str, data: Dict[str, Any]):
    res = update_thresholds(user_id, data)
    return {"success": True, "message": "Thresholds updated", "data": res}
