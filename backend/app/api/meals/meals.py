from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.meals import get_meal_logs, create_meal_log, search_meals, delete_meal_log
from app.services.filipino_food_db import search_filipino_foods

router = APIRouter(prefix="/api/meals", tags=["Meals"])

@router.get("/filipino-foods", response_model=List[Dict[str, Any]])
def search_filipino(q: str = Query("")):
    return search_filipino_foods(q)

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

@router.delete("/{meal_id}", response_model=Dict[str, Any])
def remove_meal_log(meal_id: str):
    deleted = delete_meal_log(meal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meal log not found")
    return {"success": True, "message": "Meal log deleted"}
