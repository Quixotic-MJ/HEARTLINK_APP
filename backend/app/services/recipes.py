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

def create_recipe(data: Dict[str, Any], created_by: Optional[str] = None) -> Dict[str, Any]:
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
        elif isinstance(ing, str) and ing.strip():
            ingredients_list.append({
                "name": ing.strip(),
                "amount": None,
                "unit": None
            })

    # Validate category against schema check constraint ('Breakfast', 'Lunch', 'Dinner', 'Snack')
    raw_cat = (data.get("category") or "Breakfast").strip()
    valid_categories = {"Breakfast", "Lunch", "Dinner", "Snack"}
    category = raw_cat if raw_cat in valid_categories else "Breakfast"

    # Difficulty check constraint ('Easy', 'Medium', 'Hard')
    raw_diff = (data.get("difficulty") or "Easy").strip()
    valid_difficulties = {"Easy", "Medium", "Hard"}
    difficulty = raw_diff if raw_diff in valid_difficulties else "Easy"

    # Prep time and servings
    try:
        prep_time = int(data.get("prepTimeMinutes") or data.get("prep_time_minutes") or 15)
        if prep_time < 0: prep_time = 15
    except Exception:
        prep_time = 15

    try:
        servings = int(data.get("servings") or 1)
        if servings < 1: servings = 1
    except Exception:
        servings = 1

    # Status check constraint ('draft', 'published', 'archived')
    raw_status = (data.get("status") or "draft").strip().lower()
    valid_statuses = {"draft", "published", "archived"}
    status_val = raw_status if raw_status in valid_statuses else "draft"

    new_recipe_payload = {
        "name": (data.get("name") or "Untitled Recipe").strip(),
        "subtitle": data.get("subtitle") or None,
        "category": category,
        "hss_tier": map_hss_tier(data.get("hssTarget") or data.get("hss_tier") or "Stable"),
        "sodium_mg": float(data.get("sodium") or data.get("sodium_mg") or 0),
        "calories": float(data.get("calories") or 0),
        "saturated_fat_g": float(data.get("satFat") or data.get("saturated_fat_g") or 0),
        "cholesterol_mg": float(data.get("cholesterol") or data.get("cholesterol_mg") or 0),
        "fiber_g": float(data.get("fiber") or data.get("fiber_g") or 0),
        "prep_time_minutes": prep_time,
        "servings": servings,
        "difficulty": difficulty,
        "heart_benefit": data.get("heart_benefit") or data.get("heartBenefit") or None,
        "tags": data.get("tags") or [],
        "ingredients": ingredients_list,
        "steps": steps,
        "image_url": data.get("mediaUrl") or data.get("image_url") or "",
        "status": status_val,
        "expert_validated": bool(data.get("expertValidated") or data.get("expert_validated", False)),
    }
    if created_by:
        new_recipe_payload["created_by"] = created_by
    if data.get("id"):
        new_recipe_payload["id"] = data["id"]
        
    res = get_content_repo().create_recipe(new_recipe_payload)
    return normalize_recipe_fields(res)

def update_recipe(recipe_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    update_data = {}
    if "name" in data: update_data["name"] = data["name"]
    if "subtitle" in data: update_data["subtitle"] = data["subtitle"]
    if "category" in data:
        raw_cat = str(data["category"]).strip()
        if raw_cat in {"Breakfast", "Lunch", "Dinner", "Snack"}:
            update_data["category"] = raw_cat
    if "hssTarget" in data or "hss_tier" in data:
        update_data["hss_tier"] = map_hss_tier(data.get("hssTarget", data.get("hss_tier")))
    if "sodium" in data or "sodium_mg" in data:
        try:
            update_data["sodium_mg"] = float(data.get("sodium", data.get("sodium_mg", 0)))
        except Exception:
            pass
    if "calories" in data:
        try:
            update_data["calories"] = float(data["calories"])
        except Exception:
            pass
    if "satFat" in data or "saturated_fat_g" in data:
        try:
            update_data["saturated_fat_g"] = float(data.get("satFat", data.get("saturated_fat_g", 0)))
        except Exception:
            pass
    if "cholesterol" in data or "cholesterol_mg" in data:
        try:
            update_data["cholesterol_mg"] = float(data.get("cholesterol", data.get("cholesterol_mg", 0)))
        except Exception:
            pass
    if "fiber" in data or "fiber_g" in data:
        try:
            update_data["fiber_g"] = float(data.get("fiber", data.get("fiber_g", 0)))
        except Exception:
            pass
    if "prepTimeMinutes" in data or "prep_time_minutes" in data:
        try:
            val = int(data.get("prepTimeMinutes", data.get("prep_time_minutes", 15)))
            if val >= 0:
                update_data["prep_time_minutes"] = val
        except Exception:
            pass
    if "servings" in data:
        try:
            val = int(data["servings"])
            if val >= 1:
                update_data["servings"] = val
        except Exception:
            pass
    if "difficulty" in data:
        val = str(data["difficulty"]).strip()
        if val in {"Easy", "Medium", "Hard"}:
            update_data["difficulty"] = val
    if "heartBenefit" in data or "heart_benefit" in data:
        update_data["heart_benefit"] = data.get("heartBenefit", data.get("heart_benefit"))
    if "tags" in data:
        update_data["tags"] = data["tags"]
    if "status" in data:
        val = str(data["status"]).strip().lower()
        if val in {"draft", "published", "archived"}:
            update_data["status"] = val
    if "expertValidated" in data or "expert_validated" in data:
        update_data["expert_validated"] = bool(data.get("expertValidated", data.get("expert_validated")))
    if "mediaUrl" in data or "image_url" in data:
        update_data["image_url"] = data.get("mediaUrl", data.get("image_url"))
    
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
            elif isinstance(ing, str) and ing.strip():
                ingredients_list.append({
                    "name": ing.strip(),
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

def unsave_recipe_for_user(user_id: str, recipe_id: str) -> bool:
    return get_content_repo().unsave_recipe_for_user(user_id, recipe_id)

def get_saved_recipes(user_id: str) -> List[Dict[str, Any]]:
    recipes = get_content_repo().list_saved_recipes(user_id)
    return [normalize_recipe_fields(r) for r in recipes]
