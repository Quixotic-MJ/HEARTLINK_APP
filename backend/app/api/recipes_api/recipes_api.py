from fastapi import APIRouter, HTTPException, Body, Depends
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
from app.utils.security import get_current_admin_user
from app.utils.activity_helper import record_admin_activity

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
def add_recipe(data: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_admin_user)):
    new_recipe = create_recipe(data)
    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="created",
        target_type="recipe",
        target_id=new_recipe.get("id"),
        target_name=new_recipe.get("name")
    )
    return new_recipe

@router.put("/{recipe_id}", response_model=Dict[str, Any])
def edit_recipe(recipe_id: str, data: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_admin_user)):
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    old_status = recipe.get("status")
    updated_recipe = update_recipe(recipe_id, data)
    if not updated_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    new_status = updated_recipe.get("status")
    action = "updated"
    if old_status != new_status:
        if new_status == "published":
            action = "published"
        elif new_status == "archived":
            action = "archived"
        elif new_status == "draft" and old_status == "archived":
            action = "restored"

    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action=action,
        target_type="recipe",
        target_id=updated_recipe.get("id"),
        target_name=updated_recipe.get("name")
    )
    return updated_recipe

@router.delete("/{recipe_id}")
def remove_recipe(recipe_id: str, current_user: dict = Depends(get_current_admin_user)):
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    success = delete_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found")
    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="deleted",
        target_type="recipe",
        target_id=recipe_id,
        target_name=recipe.get("name")
    )
    return {"success": True, "message": "Recipe deleted successfully"}

@router.post("/{recipe_id}/save/{user_id}")
def save_recipe(recipe_id: str, user_id: str):
    save_recipe_for_user(user_id, recipe_id)
    return {"success": True, "message": "Recipe saved"}
