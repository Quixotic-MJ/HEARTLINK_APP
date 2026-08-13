from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import recipes, saved_recipes

def normalize_recipe_fields(recipe: Dict[str, Any]) -> Dict[str, Any]:
    if not recipe:
        return recipe
    
    # 1. Standardize instructions/steps
    if not recipe.get("steps"):
        inst = recipe.get("instructions") or ""
        if isinstance(inst, str):
            recipe["steps"] = [s.strip() for s in inst.split("\n") if s.strip()]
        else:
            recipe["steps"] = []
            
    if "instructions" in recipe:
        del recipe["instructions"]
        
    # 2. Standardize ingredients
    ingredients = recipe.get("ingredients") or []
    normalized_ingredients = []
    for ing in ingredients:
        if isinstance(ing, str):
            normalized_ingredients.append({
                "name": ing,
                "amount": None,
                "unit": None
            })
        elif isinstance(ing, dict):
            name = ing.get("name", "")
            amount = ing.get("amount")
            if amount == 0 or amount == "" or amount is None:
                amount = None
            unit = ing.get("unit")
            if unit == "" or unit is None:
                unit = None
            normalized_ingredients.append({
                "name": name,
                "amount": amount,
                "unit": unit
            })
    recipe["ingredients"] = normalized_ingredients
    return recipe

def get_recipes() -> List[Dict[str, Any]]:
    return [normalize_recipe_fields(r) for r in recipes]

def get_recipe(recipe_id: str) -> Dict[str, Any]:
    r = next((r for r in recipes if r["id"] == recipe_id), None)
    return normalize_recipe_fields(r) if r else None

def map_hss_tier(tier: str) -> str:
    if not tier: return "Stable"
    if "Stable" in tier: return "Stable"
    if "Moderate" in tier or "Monitor Closely" in tier: return "Moderate"
    if "Elevated Risk" in tier: return "Elevated Risk"
    if "Critical" in tier: return "Critical"
    return "Stable"

def create_recipe(data: Dict[str, Any]) -> Dict[str, Any]:
    instructions_str = data.get("instructions") or ""
    if isinstance(instructions_str, str):
        steps = [s.strip() for s in instructions_str.split("\n") if s.strip()]
    else:
        steps = data.get("steps", [])

    ingredients_list = []
    for ing in data.get("ingredients", []):
        ingredients_list.append({
            "name": ing,
            "amount": None,
            "unit": None
        })

    new_recipe = {
        "id": f"rec-{uuid.uuid4().hex[:8]}",
        "name": data.get("name", ""),
        "category": data.get("category", ""),
        "hss_tier": map_hss_tier(data.get("hssTarget", "Stable")),
        "sodium_mg": data.get("sodium", 0),
        "calories": data.get("calories", 0),
        "saturated_fat_g": data.get("satFat", 0),
        "cholesterol_mg": data.get("cholesterol", 0),
        "fiber_g": data.get("fiber", 0),
        "status": data.get("status", "draft"),
        "expert_validated": data.get("expertValidated", False),
        "image_url": data.get("mediaUrl", ""),
        "steps": steps,
        "ingredients": ingredients_list,
        "created_at": datetime.now(),
        "foodSourceType": data.get("foodSourceType", "Home Recipe")
    }
    recipes.append(new_recipe)
    return normalize_recipe_fields(new_recipe)

def update_recipe(recipe_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    recipe = next((r for r in recipes if r["id"] == recipe_id), None)
    if not recipe:
        return None
    
    recipe["name"] = data.get("name", recipe.get("name"))
    recipe["category"] = data.get("category", recipe.get("category"))
    recipe["hss_tier"] = map_hss_tier(data.get("hssTarget", recipe.get("hss_tier")))
    recipe["sodium_mg"] = data.get("sodium", recipe.get("sodium_mg"))
    recipe["calories"] = data.get("calories", recipe.get("calories"))
    recipe["saturated_fat_g"] = data.get("satFat", recipe.get("saturated_fat_g"))
    recipe["cholesterol_mg"] = data.get("cholesterol", recipe.get("cholesterol_mg"))
    recipe["fiber_g"] = data.get("fiber", recipe.get("fiber_g"))
    recipe["status"] = data.get("status", recipe.get("status"))
    recipe["expert_validated"] = data.get("expertValidated", recipe.get("expert_validated"))
    recipe["image_url"] = data.get("mediaUrl", recipe.get("image_url"))
    recipe["foodSourceType"] = data.get("foodSourceType", recipe.get("foodSourceType"))
    
    instructions_str = data.get("instructions")
    if instructions_str is not None:
        if isinstance(instructions_str, str):
            recipe["steps"] = [s.strip() for s in instructions_str.split("\n") if s.strip()]
        else:
            recipe["steps"] = data.get("steps", [])
            
    if "ingredients" in data:
        ingredients_list = []
        for ing in data["ingredients"]:
            ingredients_list.append({
                "name": ing,
                "amount": None,
                "unit": None
            })
        recipe["ingredients"] = ingredients_list

    return normalize_recipe_fields(recipe)

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
    return [normalize_recipe_fields(r) for r in recipes if r["id"] in saved_ids]
