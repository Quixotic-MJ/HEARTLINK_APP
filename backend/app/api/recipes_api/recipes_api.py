from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.recipes import get_recipes, get_recipe, save_recipe_for_user, get_saved_recipes

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])

@router.get("/", response_model=List[Dict[str, Any]])
def read_recipes():
    return get_recipes()

@router.get("/saved/{user_id}", response_model=List[Dict[str, Any]])
def read_saved_recipes(user_id: str):
    return get_saved_recipes(user_id)

@router.get("/{recipe_id}", response_model=Dict[str, Any])
def read_recipe(recipe_id: str):
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@router.post("/{recipe_id}/save/{user_id}")
def save_recipe(recipe_id: str, user_id: str):
    save_recipe_for_user(user_id, recipe_id)
    return {"success": True, "message": "Recipe saved"}
