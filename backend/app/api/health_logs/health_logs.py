from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.health_logs import get_health_logs, create_health_log

router = APIRouter(prefix="/api/health-logs", tags=["Health Logs"])

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_health_logs(user_id: str):
    return get_health_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_health_log(user_id: str, data: Dict[str, Any]):
    log = create_health_log(user_id, data)
    return {"success": True, "message": "Health log saved", "data": log}
