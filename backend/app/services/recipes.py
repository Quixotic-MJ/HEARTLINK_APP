from typing import List, Dict, Any
from app.mock_db import recipes, saved_recipes

def get_recipes() -> List[Dict[str, Any]]:
    return recipes

def get_recipe(recipe_id: str) -> Dict[str, Any]:
    return next((r for r in recipes if r["id"] == recipe_id), None)

def save_recipe_for_user(user_id: str, recipe_id: str) -> bool:
    if not any(s["user_id"] == user_id and s["recipe_id"] == recipe_id for s in saved_recipes):
        saved_recipes.append({"user_id": user_id, "recipe_id": recipe_id})
    return True

def get_saved_recipes(user_id: str) -> List[Dict[str, Any]]:
    saved_ids = [s["recipe_id"] for s in saved_recipes if s["user_id"] == user_id]
    return [r for r in recipes if r["id"] in saved_ids]
