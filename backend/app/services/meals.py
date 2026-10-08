from typing import List, Dict, Any
from app.db.repositories import get_meals_repo, get_content_repo
from app.services.recipes import normalize_recipe_fields

def get_meal_logs(user_id: str) -> List[Dict[str, Any]]:
    return get_meals_repo().list_user_meals(user_id)

def get_paginated_meal_logs(user_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    return get_meals_repo().list_user_meals_paginated(user_id, page, page_size)

def create_meal_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return get_meals_repo().create_meal(user_id, data)

def search_meals(query: str) -> List[Dict[str, Any]]:
    query = query.lower()
    recipes = get_content_repo().list_recipes()
    return [
        normalize_recipe_fields(r) 
        for r in recipes 
        if r.get("status") == "published"
        and (query in r.get("name", "").lower() or any(query in str(tag).lower() for tag in r.get("tags", [])))
    ]

def delete_meal_log(user_id: str, meal_id: str) -> bool:
    return get_meals_repo().delete_meal(user_id, meal_id)
