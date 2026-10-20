from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from app.db.repositories import get_content_repo
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN

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
                **ing,
                "name": name,
                "amount": amount,
                "unit": unit,
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

def _float_value(value: Any, default: float = 0) -> float:
    try:
        return float(value if value not in (None, "") else default)
    except (TypeError, ValueError):
        return default


def _string_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split("\n") if item.strip()]
    return []


def _evidence_list(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if isinstance(item, str) and item.strip():
            result.append({"title": item.strip(), "url": ""})
        elif isinstance(item, dict) and (item.get("title") or item.get("url")):
            result.append({
                "title": str(item.get("title") or "").strip(),
                "url": str(item.get("url") or "").strip(),
            })
    return result


def _normalize_ingredient(ingredient: Dict[str, Any]) -> Dict[str, Any]:
    household_amount = ingredient.get("household_amount", ingredient.get("amount"))
    household_unit = ingredient.get("household_unit", ingredient.get("unit"))
    return {
        "name": str(ingredient.get("name") or "").strip(),
        "amount": _float_value(household_amount, None) if household_amount not in (None, "") else None,
        "unit": str(household_unit).strip() if household_unit not in (None, "") else None,
        "household_amount": str(household_amount).strip() if household_amount not in (None, "") else "",
        "household_unit": str(household_unit or "").strip(),
        "metric_amount": _float_value(ingredient.get("metric_amount"), None) if ingredient.get("metric_amount") not in (None, "") else None,
        "metric_unit": str(ingredient.get("metric_unit") or "").strip(),
        "preparation": str(ingredient.get("preparation") or "").strip(),
        "brand": str(ingredient.get("brand") or "").strip(),
        "nutrient_source": str(ingredient.get("nutrient_source") or "").strip(),
        "nutrient_source_record_id": str(ingredient.get("nutrient_source_record_id") or "").strip(),
    }


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
            ingredients_list.append(_normalize_ingredient(ing))
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
        "status": "draft",
        "expert_validated": False,
        "content_version": 1,
        "change_notes": str(data.get("changeNotes") or data.get("change_notes") or "Initial draft").strip(),
        "yield_description": str(data.get("yieldDescription") or data.get("yield_description") or "").strip(),
        "serving_description": str(data.get("servingDescription") or data.get("serving_description") or "").strip(),
        "nutrient_source": str(data.get("nutrientSource") or data.get("nutrient_source") or "").strip(),
        "nutrient_source_record_id": str(data.get("nutrientSourceRecordId") or data.get("nutrient_source_record_id") or "").strip(),
        "nutrient_calculation_notes": str(data.get("nutrientCalculationNotes") or data.get("nutrient_calculation_notes") or "").strip(),
        "nutrition_totals": data.get("nutritionTotals") or data.get("nutrition_totals") or {},
        "intended_audiences": _string_list(data.get("intendedAudiences") or data.get("intended_audiences") or ["general_wellness"]),
        "allergen_notes": str(data.get("allergenNotes") or data.get("allergen_notes") or "").strip(),
        "contraindication_notes": str(data.get("contraindicationNotes") or data.get("contraindication_notes") or "").strip(),
        "evidence_sources": _evidence_list(data.get("evidenceSources") or data.get("evidence_sources") or []),
        "requires_cardiologist_review": bool(data.get("requiresCardiologistReview") or data.get("requires_cardiologist_review", False)),
    }
    if created_by:
        new_recipe_payload["created_by"] = created_by
    if data.get("id"):
        new_recipe_payload["id"] = data["id"]
        
    res = get_content_repo().create_recipe(new_recipe_payload)
    return normalize_recipe_fields(res)

def update_recipe(recipe_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    existing = get_content_repo().get_recipe(recipe_id)
    if not existing:
        return None
    update_data = {
        "content_version": int(existing.get("content_version") or 1) + 1,
        "status": "draft",
        "expert_validated": False,
        "change_notes": str(data.get("changeNotes") or data.get("change_notes") or "Content updated").strip(),
    }
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
    if "mediaUrl" in data or "image_url" in data:
        update_data["image_url"] = data.get("mediaUrl", data.get("image_url"))

    expanded_fields = {
        "yieldDescription": "yield_description",
        "yield_description": "yield_description",
        "servingDescription": "serving_description",
        "serving_description": "serving_description",
        "nutrientSource": "nutrient_source",
        "nutrient_source": "nutrient_source",
        "nutrientSourceRecordId": "nutrient_source_record_id",
        "nutrient_source_record_id": "nutrient_source_record_id",
        "nutrientCalculationNotes": "nutrient_calculation_notes",
        "nutrient_calculation_notes": "nutrient_calculation_notes",
        "allergenNotes": "allergen_notes",
        "allergen_notes": "allergen_notes",
        "contraindicationNotes": "contraindication_notes",
        "contraindication_notes": "contraindication_notes",
    }
    for source, target in expanded_fields.items():
        if source in data:
            update_data[target] = str(data.get(source) or "").strip()
    if "nutritionTotals" in data or "nutrition_totals" in data:
        update_data["nutrition_totals"] = data.get("nutritionTotals", data.get("nutrition_totals")) or {}
    if "intendedAudiences" in data or "intended_audiences" in data:
        update_data["intended_audiences"] = _string_list(data.get("intendedAudiences", data.get("intended_audiences")))
    if "evidenceSources" in data or "evidence_sources" in data:
        update_data["evidence_sources"] = _evidence_list(data.get("evidenceSources", data.get("evidence_sources")))
    if "requiresCardiologistReview" in data or "requires_cardiologist_review" in data:
        update_data["requires_cardiologist_review"] = bool(data.get("requiresCardiologistReview", data.get("requires_cardiologist_review")))
    
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
                ingredients_list.append(_normalize_ingredient(ing))
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
