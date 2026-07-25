from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from app.services.exercises import get_routines, get_exercise_logs, create_exercise_log, delete_exercise_log

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

@router.get("/", response_model=List[Dict[str, Any]])
def read_routines():
    return get_routines()

@router.get("/{routine_id}", response_model=Dict[str, Any])
def read_routine(routine_id: str):
    routines = get_routines()
    routine = next((r for r in routines if r["id"] == routine_id), None)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine

@router.get("/logs/{user_id}", response_model=List[Dict[str, Any]])
def read_exercise_logs(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    return get_exercise_logs(user_id, limit=limit, offset=offset)

@router.post("/logs/{user_id}", response_model=Dict[str, Any])
def add_exercise_log(user_id: str, data: Dict[str, Any]):
    log = create_exercise_log(user_id, data)
    return {"success": True, "message": "Exercise log saved", "data": log}

@router.delete("/logs/{user_id}/{log_id}", response_model=Dict[str, Any])
def delete_log(user_id: str, log_id: str):
    success, message, status_code = delete_exercise_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=status_code, detail=message)
    return {"success": True, "message": message}

