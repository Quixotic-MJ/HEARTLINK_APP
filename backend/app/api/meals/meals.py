from fastapi import APIRouter, Query, HTTPException, Depends, status
from typing import List, Dict, Any
from app.services.meals import get_meal_logs, create_meal_log, search_meals, delete_meal_log
from app.services.filipino_food_db import search_filipino_foods
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/meals", tags=["Meals"])

@router.get("/filipino-foods", response_model=List[Dict[str, Any]])
def search_filipino(q: str = Query("")):
    return search_filipino_foods(q)

@router.get("/search", response_model=List[Dict[str, Any]])
def search(q: str = Query("")):
    return search_meals(q)

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_meal_logs(user_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own meal logs.",
        )
    return get_meal_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_meal_log(user_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only record your own meal logs.",
        )
    log = create_meal_log(user_id, data)
    return {"success": True, "message": "Meal log saved", "data": log}

@router.delete("/{user_id}/{meal_id}", response_model=Dict[str, Any])
def remove_meal_log(user_id: str, meal_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only delete your own meal logs.",
        )
    deleted = delete_meal_log(user_id, meal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meal log not found")
    return {"success": True, "message": "Meal log deleted"}
