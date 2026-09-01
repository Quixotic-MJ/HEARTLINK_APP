# backend/app/db/repositories/meals.py
"""
Meal Logs Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

class MealsRepository:
    def list_user_meals(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_all_meals(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_meal(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_meal(self, user_id: str, meal_id: str) -> bool:
        raise NotImplementedError


class SupabaseMealsRepository(MealsRepository):
    def __init__(self, client):
        self.client = client

    def _resolve_user_uuid(self, user_id: str) -> Optional[str]:
        valid_uuid = resolve_uuid(user_id)
        if valid_uuid:
            return valid_uuid
        try:
            from app.db.repositories import get_profile_repo
            profile = get_profile_repo().get_by_id(user_id)
            if profile and profile.get("id"):
                return resolve_uuid(profile["id"])
        except Exception:
            pass
        return None

    def list_user_meals(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            query = self.client.table("meal_logs").select("*").eq("user_id", uuid_val).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading meal logs for {user_id}: {e}")
            return []

    def list_all_meals(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("meal_logs").select("*").order("logged_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading all meal logs: {e}")
            return []

    def create_meal(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot create meal log: invalid or unknown user '{user_id}'")
        try:
            meal_name = data.get("meal_name") or data.get("food_name") or data.get("name") or "Unnamed Meal"
            raw_payload = {
                **data,
                "meal_name": meal_name,
                "calories": float(data.get("calories", 0)),
                "sodium_mg": float(data.get("sodium_mg", 0)),
                "user_id": uuid_val,
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            if raw_payload.get("recipe_id"):
                valid_recipe_id = resolve_uuid(raw_payload["recipe_id"])
                raw_payload["recipe_id"] = valid_recipe_id

            allowed_cols = {
                "id", "user_id", "recipe_id", "meal_name", "barcode",
                "portion", "calories", "sodium_mg", "saturated_fat_g",
                "fiber_g", "image_url", "logged_at", "created_at"
            }
            payload = {k: v for k, v in raw_payload.items() if k in allowed_cols}
            payload = serialize_for_db(payload)
            res = self.client.table("meal_logs").insert(payload).execute()
            return res.data[0] if res.data else raw_payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_meal(self, user_id: str, meal_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        valid_meal_id = resolve_uuid(meal_id)
        if not uuid_val or not valid_meal_id:
            return False
        try:
            res = self.client.table("meal_logs").delete().eq("id", valid_meal_id).eq("user_id", uuid_val).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
