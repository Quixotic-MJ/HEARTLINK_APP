from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.services.meals import get_meal_logs, create_meal_log, search_meals

router = APIRouter(prefix="/api/meals", tags=["Meals"])

@router.get("/search", response_model=List[Dict[str, Any]])
def search(q: str = Query("")):
    return search_meals(q)

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_meal_logs(user_id: str):
    return get_meal_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_meal_log(user_id: str, data: Dict[str, Any]):
    log = create_meal_log(user_id, data)
    return {"success": True, "message": "Meal log saved", "data": log}
