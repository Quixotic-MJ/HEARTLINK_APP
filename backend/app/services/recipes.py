from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from app.db.repositories import get_content_repo

def normalize_recipe_fields(recipe: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not recipe:
        return recipe
    
    # Clone to avoid mutating internal records
    recipe = dict(recipe)

    # 1. Standardize instructions/steps
    if not recipe.get("steps"):
        inst = recipe.get("instructions") or ""
        if isinstance(inst, str):
            recipe["steps"] = [s.strip() for s in inst.split("\n") if s.strip()]
        elif isinstance(inst, list):
            recipe["steps"] = inst
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
    recipes = get_content_repo().list_recipes()
    return [normalize_recipe_fields(r) for r in recipes]

def get_recipe(recipe_id: str) -> Optional[Dict[str, Any]]:
    r = get_content_repo().get_recipe(recipe_id)
    return normalize_recipe_fields(r) if r else None

def map_hss_tier(tier: str) -> str:
    if not tier: return "Stable"
    if "Stable" in tier: return "Stable"
    if "Moderate" in tier or "Monitor Closely" in tier: return "Moderate"
    if "Elevated Risk" in tier or "Caution" in tier or "At Risk" in tier: return "Elevated Risk"
    if "Critical" in tier or "Needs Attention" in tier: return "Critical"
    return "Stable"

def create_recipe(data: Dict[str, Any]) -> Dict[str, Any]:
    steps = data.get("steps")
    if steps is None:
        instructions_str = data.get("instructions") or ""
        if isinstance(instructions_str, str):
            steps = [s.strip() for s in instructions_str.split("\n") if s.strip()]
        else:
            steps = []

    ingredients_list = []
    for ing in data.get("ingredients", []):
        if isinstance(ing, dict):
            amt = ing.get("amount")
            if amt == 0 or amt == "" or amt is None:
                amt = None
            else:
                try:
                    amt = float(amt)
                except Exception:
                    amt = None
            
            ut = ing.get("unit")
            if ut == "":
                ut = None

            ingredients_list.append({
                "name": ing.get("name", ""),
                "amount": amt,
                "unit": ut
            })
        else:
            ingredients_list.append({
                "name": ing,
                "amount": None,
                "unit": None
            })

    new_recipe_payload = {
        "name": data.get("name", ""),
        "category": data.get("category", ""),
        "hss_tier": map_hss_tier(data.get("hssTarget", "Stable")),
        "sodium_mg": data.get("sodium", 0) or data.get("sodium_mg", 0),
        "calories": data.get("calories", 0),
        "saturated_fat_g": data.get("satFat", 0) or data.get("saturated_fat_g", 0),
        "cholesterol_mg": data.get("cholesterol", 0) or data.get("cholesterol_mg", 0),
        "fiber_g": data.get("fiber", 0) or data.get("fiber_g", 0),
        "status": data.get("status", "draft"),
        "expert_validated": data.get("expertValidated", False) or data.get("expert_validated", False),
        "image_url": data.get("mediaUrl", "") or data.get("image_url", ""),
        "steps": steps,
        "ingredients": ingredients_list,
        "foodSourceType": data.get("foodSourceType", "Home Recipe")
    }
    if data.get("id"):
        new_recipe_payload["id"] = data["id"]
    res = get_content_repo().create_recipe(new_recipe_payload)
    return normalize_recipe_fields(res)

def update_recipe(recipe_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    update_data = {}
    if "name" in data: update_data["name"] = data["name"]
    if "category" in data: update_data["category"] = data["category"]
    if "hssTarget" in data or "hss_tier" in data:
        update_data["hss_tier"] = map_hss_tier(data.get("hssTarget", data.get("hss_tier")))
    if "sodium" in data or "sodium_mg" in data:
        update_data["sodium_mg"] = data.get("sodium", data.get("sodium_mg"))
    if "calories" in data: update_data["calories"] = data["calories"]
    if "satFat" in data or "saturated_fat_g" in data:
        update_data["saturated_fat_g"] = data.get("satFat", data.get("saturated_fat_g"))
    if "cholesterol" in data or "cholesterol_mg" in data:
        update_data["cholesterol_mg"] = data.get("cholesterol", data.get("cholesterol_mg"))
    if "fiber" in data or "fiber_g" in data:
        update_data["fiber_g"] = data.get("fiber", data.get("fiber_g"))
    if "status" in data: update_data["status"] = data["status"]
    if "expertValidated" in data or "expert_validated" in data:
        update_data["expert_validated"] = data.get("expertValidated", data.get("expert_validated"))
    if "mediaUrl" in data or "image_url" in data:
        update_data["image_url"] = data.get("mediaUrl", data.get("image_url"))
    if "foodSourceType" in data: update_data["foodSourceType"] = data["foodSourceType"]
    
    if "steps" in data:
        update_data["steps"] = data["steps"]
    elif "instructions" in data and data["instructions"] is not None:
        instructions_str = data["instructions"]
        if isinstance(instructions_str, str):
            update_data["steps"] = [s.strip() for s in instructions_str.split("\n") if s.strip()]
        else:
            update_data["steps"] = []
            
    if "ingredients" in data:
        ingredients_list = []
        for ing in data["ingredients"]:
            if isinstance(ing, dict):
                amt = ing.get("amount")
                if amt == 0 or amt == "" or amt is None:
                    amt = None
                else:
                    try:
                        amt = float(amt)
                    except Exception:
                        amt = None
                ut = ing.get("unit") or None
                ingredients_list.append({
                    "name": ing.get("name", ""),
                    "amount": amt,
                    "unit": ut
                })
            else:
                ingredients_list.append({
                    "name": ing,
                    "amount": None,
                    "unit": None
                })
        update_data["ingredients"] = ingredients_list

    res = get_content_repo().update_recipe(recipe_id, update_data)
    return normalize_recipe_fields(res) if res else None

def delete_recipe(recipe_id: str) -> bool:
    return get_content_repo().delete_recipe(recipe_id)

def save_recipe_for_user(user_id: str, recipe_id: str) -> bool:
    return get_content_repo().save_recipe_for_user(user_id, recipe_id)

def get_saved_recipes(user_id: str) -> List[Dict[str, Any]]:
    recipes = get_content_repo().list_saved_recipes(user_id)
    return [normalize_recipe_fields(r) for r in recipes]
