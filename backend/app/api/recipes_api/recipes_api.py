from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from app.services.recipes import (
    get_recipes, 
    get_recipe, 
    save_recipe_for_user, 
    get_saved_recipes,
    create_recipe,
    update_recipe,
    delete_recipe
)

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

@router.post("/", response_model=Dict[str, Any])
def add_recipe(data: Dict[str, Any] = Body(...)):
    new_recipe = create_recipe(data)
    return new_recipe

@router.put("/{recipe_id}", response_model=Dict[str, Any])
def edit_recipe(recipe_id: str, data: Dict[str, Any] = Body(...)):
    updated_recipe = update_recipe(recipe_id, data)
    if not updated_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return updated_recipe

@router.delete("/{recipe_id}")
def remove_recipe(recipe_id: str):
    success = delete_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"success": True, "message": "Recipe deleted successfully"}

@router.post("/{recipe_id}/save/{user_id}")
def save_recipe(recipe_id: str, user_id: str):
    save_recipe_for_user(user_id, recipe_id)
    return {"success": True, "message": "Recipe saved"}
