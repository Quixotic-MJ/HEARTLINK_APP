from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import recipes, saved_recipes

def get_recipes() -> List[Dict[str, Any]]:
    return recipes

def get_recipe(recipe_id: str) -> Dict[str, Any]:
    return next((r for r in recipes if r["id"] == recipe_id), None)

def create_recipe(data: Dict[str, Any]) -> Dict[str, Any]:
    new_recipe = {
        "id": f"rec-{uuid.uuid4().hex[:8]}",
        "name": data.get("name", ""),
        "category": data.get("category", ""),
        "hss_tier": data.get("hssTarget", "Stable (80-100)"),
        "sodium_mg": data.get("sodium", 0),
        "calories": data.get("calories", 0),
        "saturated_fat_g": data.get("satFat", 0),
        "cholesterol_mg": data.get("cholesterol", 0),
        "fiber_g": data.get("fiber", 0),
        "status": data.get("status", "draft"),
        "expert_validated": data.get("expertValidated", False),
        "image_url": data.get("mediaUrl", ""),
        "instructions": data.get("instructions", ""),
        "ingredients": [{"name": i, "amount": 0, "unit": ""} for i in data.get("ingredients", [])],
        "created_at": datetime.now(),
        "foodSourceType": data.get("foodSourceType", "Home Recipe")
    }
    recipes.append(new_recipe)
    return new_recipe

def update_recipe(recipe_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    recipe = get_recipe(recipe_id)
    if not recipe:
        return None
    
    recipe["name"] = data.get("name", recipe.get("name"))
    recipe["category"] = data.get("category", recipe.get("category"))
    recipe["hss_tier"] = data.get("hssTarget", recipe.get("hss_tier"))
    recipe["sodium_mg"] = data.get("sodium", recipe.get("sodium_mg"))
    recipe["calories"] = data.get("calories", recipe.get("calories"))
    recipe["saturated_fat_g"] = data.get("satFat", recipe.get("saturated_fat_g"))
    recipe["cholesterol_mg"] = data.get("cholesterol", recipe.get("cholesterol_mg"))
    recipe["fiber_g"] = data.get("fiber", recipe.get("fiber_g"))
    recipe["status"] = data.get("status", recipe.get("status"))
    recipe["expert_validated"] = data.get("expertValidated", recipe.get("expert_validated"))
    recipe["image_url"] = data.get("mediaUrl", recipe.get("image_url"))
    recipe["instructions"] = data.get("instructions", recipe.get("instructions"))
    recipe["foodSourceType"] = data.get("foodSourceType", recipe.get("foodSourceType"))
    
    if "ingredients" in data:
        recipe["ingredients"] = [{"name": i, "amount": 0, "unit": ""} for i in data["ingredients"]]

    return recipe

def delete_recipe(recipe_id: str) -> bool:
    global recipes
    original_length = len(recipes)
    recipes[:] = [r for r in recipes if r["id"] != recipe_id]
    return len(recipes) < original_length

def save_recipe_for_user(user_id: str, recipe_id: str) -> bool:
    if not any(s["user_id"] == user_id and s["recipe_id"] == recipe_id for s in saved_recipes):
        saved_recipes.append({"user_id": user_id, "recipe_id": recipe_id})
    return True

def get_saved_recipes(user_id: str) -> List[Dict[str, Any]]:
    saved_ids = [s["recipe_id"] for s in saved_recipes if s["user_id"] == user_id]
    return [r for r in recipes if r["id"] in saved_ids]
