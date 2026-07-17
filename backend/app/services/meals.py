from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.mock_db import meal_logs, recipes

def get_meal_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = [m for m in meal_logs if m["user_id"] == user_id]
    return sorted(logs, key=lambda x: x["logged_at"], reverse=True)

def create_meal_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    new_log = {
        "id": f"meal-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "recipe_id": data.get("recipe_id"),
        "meal_name": data.get("meal_name"),
        "barcode": data.get("barcode"),
        "portion": data.get("portion"),
        "calories": data.get("calories", 0),
        "sodium_mg": data.get("sodium_mg", 0),
        "saturated_fat_g": data.get("saturated_fat_g", 0),
        "fiber_g": data.get("fiber_g", 0),
        "image_url": data.get("image_url"),
        "logged_at": datetime.now(),
    }
    meal_logs.append(new_log)
    return new_log

def search_meals(query: str) -> List[Dict[str, Any]]:
    query = query.lower()
    return [r for r in recipes if query in r["name"].lower() or any(query in tag.lower() for tag in r.get("tags", []))]
