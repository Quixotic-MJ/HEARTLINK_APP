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
    
    # Resolve meal_name from aliases (food_name, name, meal_name)
    raw_meal_name = data.get("meal_name")
    raw_food_name = data.get("food_name")
    raw_name = data.get("name")

    names = {str(n).strip() for n in [raw_meal_name, raw_food_name, raw_name] if n and str(n).strip()}
    if not names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Meal name is required."
        )
    if len(names) > 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Conflicting meal name aliases provided."
        )
    
    canonical_meal_name = list(names)[0]
    data["meal_name"] = canonical_meal_name

    # Validate nutrition fields
    try:
        calories = float(data.get("calories", 0))
        sodium_mg = float(data.get("sodium_mg", 0))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Calories and sodium must be valid numbers."
        )
    
    if calories < 0 or sodium_mg < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Calories and sodium cannot be negative."
        )
    
    data["calories"] = calories
    data["sodium_mg"] = sodium_mg

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
