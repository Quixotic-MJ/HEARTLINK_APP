# backend/app/db/repositories/content.py
"""
Global Content (Recipes, Exercises, Clinics) & User Bookmarks Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

class ContentRepository:
    # Recipes
    def list_recipes(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_recipe(self, recipe_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create_recipe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_recipe(self, recipe_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def delete_recipe(self, recipe_id: str) -> bool:
        raise NotImplementedError

    def list_saved_recipes(self, user_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def save_recipe_for_user(self, user_id: str, recipe_id: str) -> bool:
        raise NotImplementedError

    def unsave_recipe_for_user(self, user_id: str, recipe_id: str) -> bool:
        raise NotImplementedError

    # Exercises
    def list_routines(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_routine(self, routine_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create_routine(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_routine(self, routine_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def delete_routine(self, routine_id: str) -> bool:
        raise NotImplementedError

    def list_saved_exercises(self, user_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def save_exercise_for_user(self, user_id: str, routine_id: str) -> bool:
        raise NotImplementedError

    # Clinics
    def list_clinics(self) -> List[Dict[str, Any]]:
        raise NotImplementedError


class SupabaseContentRepository(ContentRepository):
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

    def list_recipes(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("recipes").select("*").execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading recipes from Supabase: {e}")
            return []

    def get_recipe(self, recipe_id: str) -> Optional[Dict[str, Any]]:
        try:
            valid_id = resolve_uuid(recipe_id)
            if valid_id:
                res = self.client.table("recipes").select("*").eq("id", valid_id).execute()
                if res.data:
                    return res.data[0]
            res = self.client.table("recipes").select("*").eq("legacy_id", recipe_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.warning(f"Error reading recipe {recipe_id}: {e}")
            return None

    def create_recipe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                **data
            }
            payload = serialize_for_db(payload)
            res = self.client.table("recipes").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_recipe(self, recipe_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            payload = {
                "updated_at": datetime.utcnow().isoformat(),
                **data
            }
            payload = serialize_for_db(payload)
            valid_id = resolve_uuid(recipe_id)
            if valid_id:
                res = self.client.table("recipes").update(payload).eq("id", valid_id).execute()
                if res.data:
                    return res.data[0]
            res = self.client.table("recipes").update(payload).eq("legacy_id", recipe_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_recipe(self, recipe_id: str) -> bool:
        try:
            valid_id = resolve_uuid(recipe_id)
            if valid_id:
                res = self.client.table("recipes").delete().eq("id", valid_id).execute()
                if res.data:
                    return True
            res = self.client.table("recipes").delete().eq("legacy_id", recipe_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_saved_recipes(self, user_id: str) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            res = self.client.table("saved_recipes").select("recipe_id, recipes(*)").eq("user_id", uuid_val).execute()
            saved = []
            for row in (res.data or []):
                r = row.get("recipes")
                if r:
                    saved.append(r)
            return saved
        except Exception as e:
            logger.warning(f"Error reading saved recipes for {user_id}: {e}")
            return []

    def save_recipe_for_user(self, user_id: str, recipe_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return False
        try:
            valid_r_id = resolve_uuid(recipe_id)
            actual_recipe_id = valid_r_id
            if not actual_recipe_id:
                rec = self.get_recipe(recipe_id)
                if rec and rec.get("id"):
                    actual_recipe_id = rec["id"]
            if not actual_recipe_id:
                return False

            payload = {
                "user_id": uuid_val,
                "recipe_id": actual_recipe_id,
                "saved_at": datetime.utcnow().isoformat()
            }
            res = self.client.table("saved_recipes").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def unsave_recipe_for_user(self, user_id: str, recipe_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return False
        try:
            valid_r_id = resolve_uuid(recipe_id)
            actual_recipe_id = valid_r_id
            if not actual_recipe_id:
                rec = self.get_recipe(recipe_id)
                if rec and rec.get("id"):
                    actual_recipe_id = rec["id"]
            if not actual_recipe_id:
                return False

            self.client.table("saved_recipes").delete().eq("user_id", uuid_val).eq("recipe_id", actual_recipe_id).execute()
            return True
        except Exception as e:
            handle_db_error(e)
            return False

    def list_routines(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("exercise_routines").select("*").execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading exercise routines from Supabase: {e}")
            return []

    def get_routine(self, routine_id: str) -> Optional[Dict[str, Any]]:
        try:
            valid_id = resolve_uuid(routine_id)
            if valid_id:
                res = self.client.table("exercise_routines").select("*").eq("id", valid_id).execute()
                if res.data:
                    return res.data[0]
            res = self.client.table("exercise_routines").select("*").eq("legacy_id", routine_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.warning(f"Error reading exercise routine {routine_id}: {e}")
            return None

    def create_routine(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                **data
            }
            payload = serialize_for_db(payload)
            res = self.client.table("exercise_routines").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_routine(self, routine_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            payload = {
                "updated_at": datetime.utcnow().isoformat(),
                **data
            }
            payload = serialize_for_db(payload)
            valid_id = resolve_uuid(routine_id)
            if valid_id:
                res = self.client.table("exercise_routines").update(payload).eq("id", valid_id).execute()
                if res.data:
                    return res.data[0]
            res = self.client.table("exercise_routines").update(payload).eq("legacy_id", routine_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_routine(self, routine_id: str) -> bool:
        try:
            valid_id = resolve_uuid(routine_id)
            if valid_id:
                res = self.client.table("exercise_routines").delete().eq("id", valid_id).execute()
                if res.data:
                    return True
            res = self.client.table("exercise_routines").delete().eq("legacy_id", routine_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_saved_exercises(self, user_id: str) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            res = self.client.table("saved_exercises").select("routine_id, exercise_routines(*)").eq("user_id", uuid_val).execute()
            saved = []
            for row in (res.data or []):
                ex = row.get("exercise_routines")
                if ex:
                    saved.append(ex)
            return saved
        except Exception as e:
            logger.warning(f"Error reading saved exercises for {user_id}: {e}")
            return []

    def save_exercise_for_user(self, user_id: str, routine_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return False
        try:
            valid_r_id = resolve_uuid(routine_id)
            actual_routine_id = valid_r_id
            if not actual_routine_id:
                rt = self.get_routine(routine_id)
                if rt and rt.get("id"):
                    actual_routine_id = rt["id"]
            if not actual_routine_id:
                return False

            payload = {
                "user_id": uuid_val,
                "routine_id": actual_routine_id,
                "saved_at": datetime.utcnow().isoformat()
            }
            res = self.client.table("saved_exercises").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_clinics(self) -> List[Dict[str, Any]]:
        default_clinics = [
            {
                "id": "c1111111-1111-1111-1111-111111111111",
                "legacy_id": "1",
                "name": "Chong Hua Hospital Heart Institute",
                "doctor": "Dr. Maria Santos, MD, FACC",
                "latitude": 10.3129,
                "longitude": 123.8925,
                "phone": "+63322558000",
                "specialty": "General Cardiology & Emergency Care",
                "operating_hours": "24/7"
            },
            {
                "id": "c2222222-2222-2222-2222-222222222222",
                "legacy_id": "2",
                "name": "Cebu Doctors' University Hospital",
                "doctor": "Dr. Juan Dela Cruz, MD",
                "latitude": 10.3152,
                "longitude": 123.8897,
                "phone": "+63322555555",
                "specialty": "General Cardiology & Acute Care",
                "operating_hours": "24/7"
            },
            {
                "id": "c3333333-3333-3333-3333-333333333333",
                "legacy_id": "3",
                "name": "Perpetual Succour Hospital",
                "doctor": "Dr. Anna Reyes, MD",
                "latitude": 10.3188,
                "longitude": 123.8966,
                "phone": "+63322338620",
                "specialty": "Cardiac Rehabilitation & Emergency",
                "operating_hours": "24/7"
            }
        ]
        try:
            res = self.client.table("clinics").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
            return default_clinics
        except Exception as e:
            logger.warning(f"Error reading clinics from Supabase: {e}")
            return default_clinics

