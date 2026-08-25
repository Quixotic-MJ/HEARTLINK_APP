# backend/app/db/repositories/meals.py
"""
Meal Logs Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

class MealsRepository:
    def list_user_meals(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_meal(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_meal(self, user_id: str, meal_id: str) -> bool:
        raise NotImplementedError


class MockMealsRepository(MealsRepository):
    def list_user_meals(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        meals = [m for m in mock_db.meal_logs if m.get("user_id") == user_id]
        sorted_meals = sorted(meals, key=lambda x: x.get("logged_at") or datetime.min, reverse=True)
        return sorted_meals[:limit] if limit else sorted_meals

    def create_meal(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        new_meal = {
            "id": f"meal-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "created_at": now,
            "logged_at": data.get("logged_at") or now
        }
        mock_db.meal_logs.append(new_meal)
        mock_db.save_logs()
        return new_meal

    def delete_meal(self, user_id: str, meal_id: str) -> bool:
        initial = len(mock_db.meal_logs)
        mock_db.meal_logs[:] = [m for m in mock_db.meal_logs if not (m.get("id") == meal_id and m.get("user_id") == user_id)]
        if len(mock_db.meal_logs) < initial:
            mock_db.save_logs()
            return True
        return False


class SupabaseMealsRepository(MealsRepository):
    def __init__(self, client):
        self.client = client

    def list_user_meals(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("meal_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def create_meal(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                **data,
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            res = self.client.table("meal_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_meal(self, user_id: str, meal_id: str) -> bool:
        try:
            res = self.client.table("meal_logs").delete().eq("id", meal_id).eq("user_id", user_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
