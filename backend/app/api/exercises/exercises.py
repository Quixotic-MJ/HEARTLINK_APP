from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.exercises import get_routines, get_exercise_logs, create_exercise_log

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])

@router.get("/", response_model=List[Dict[str, Any]])
def read_routines():
    return get_routines()

@router.get("/{routine_id}", response_model=Dict[str, Any])
def read_routine(routine_id: str):
    routines = get_routines()
    routine = next((r for r in routines if r["id"] == routine_id), None)
    if not routine:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine

@router.get("/logs/{user_id}", response_model=List[Dict[str, Any]])
def read_exercise_logs(user_id: str):
    return get_exercise_logs(user_id)

@router.post("/logs/{user_id}", response_model=Dict[str, Any])
def add_exercise_log(user_id: str, data: Dict[str, Any]):
    log = create_exercise_log(user_id, data)
    return {"success": True, "message": "Exercise log saved", "data": log}
