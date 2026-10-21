from typing import List, Dict, Any, Optional
from app.db.repositories import get_meals_repo, get_content_repo
from app.services.recipes import normalize_recipe_fields, is_visible_to_patients

def get_meal_logs(user_id: str) -> List[Dict[str, Any]]:
    return get_meals_repo().list_user_meals(user_id)

def get_paginated_meal_logs(user_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    return get_meals_repo().list_user_meals_paginated(user_id, page, page_size)

def meal_cholesterol(data: Dict[str, Any], recipe: Optional[Dict[str, Any]]) -> float:
    """HL-028: the meal's cholesterol in mg: the value sent with it, else the recipe's, scaled by how
    much was eaten (the logged calories against the recipe's calories per serving), else 0."""
    try:
        sent = data.get("cholesterol_mg")
        if sent is not None and float(sent) >= 0:
            return round(float(sent), 1)
    except (TypeError, ValueError):
        pass
    if not recipe:
        return 0.0
    per_serving = float(recipe.get("cholesterol_mg") or 0)
    recipe_calories = float(recipe.get("calories") or 0)
    servings = float(data.get("calories") or 0) / recipe_calories if recipe_calories > 0 else 1.0
    return round(per_serving * servings, 1)

def create_meal_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    recipe = get_content_repo().get_recipe(str(data["recipe_id"])) if data.get("recipe_id") else None
    return get_meals_repo().create_meal(user_id, {**data, "cholesterol_mg": meal_cholesterol(data, recipe)})

def search_meals(query: str) -> List[Dict[str, Any]]:
    query = query.lower()
    recipes = get_content_repo().list_recipes()
    return [
        normalize_recipe_fields(r) 
        for r in recipes 
        if is_visible_to_patients(r)
        and (query in r.get("name", "").lower() or any(query in str(tag).lower() for tag in r.get("tags", [])))
    ]

def delete_meal_log(user_id: str, meal_id: str) -> bool:
    return get_meals_repo().delete_meal(user_id, meal_id)
