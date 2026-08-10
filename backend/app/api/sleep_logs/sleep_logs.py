from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.sleep_logs import get_sleep_logs, create_sleep_log, delete_sleep_log

router = APIRouter(prefix="/api/sleep-logs", tags=["Sleep Logs"])

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_sleep_logs(user_id: str):
    return get_sleep_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_sleep_log(user_id: str, data: Dict[str, Any]):
    duration = data.get("duration_hours", 0)
    if duration <= 0:
        raise HTTPException(status_code=400, detail="Sleep duration must be greater than 0.")
    log = create_sleep_log(user_id, data)
    return {"success": True, "message": "Sleep log saved", "data": log}

@router.delete("/{user_id}/{log_id}", response_model=Dict[str, Any])
def remove_sleep_log(user_id: str, log_id: str):
    success = delete_sleep_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    return {"success": True, "message": "Sleep log deleted"}
