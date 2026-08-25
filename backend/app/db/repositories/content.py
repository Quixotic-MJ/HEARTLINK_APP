# backend/app/db/repositories/content.py
"""
Global Content (Recipes, Exercises, Clinics) & User Bookmarks Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

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


class MockContentRepository(ContentRepository):
    def list_recipes(self) -> List[Dict[str, Any]]:
        return mock_db.recipes

    def get_recipe(self, recipe_id: str) -> Optional[Dict[str, Any]]:
        return next((r for r in mock_db.recipes if r.get("id") == recipe_id or r.get("legacy_id") == recipe_id), None)

    def create_recipe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        from app.services.recipes import create_recipe
        return create_recipe(data)

    def update_recipe(self, recipe_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        from app.services.recipes import update_recipe
        return update_recipe(recipe_id, data)

    def delete_recipe(self, recipe_id: str) -> bool:
        from app.services.recipes import delete_recipe
        return delete_recipe(recipe_id)

    def list_saved_recipes(self, user_id: str) -> List[Dict[str, Any]]:
        from app.services.recipes import get_saved_recipes
        return get_saved_recipes(user_id)

    def save_recipe_for_user(self, user_id: str, recipe_id: str) -> bool:
        from app.services.recipes import save_recipe_for_user
        return save_recipe_for_user(user_id, recipe_id)

    def list_routines(self) -> List[Dict[str, Any]]:
        return mock_db.exercise_routines

    def get_routine(self, routine_id: str) -> Optional[Dict[str, Any]]:
        return next((e for e in mock_db.exercise_routines if e.get("id") == routine_id or e.get("legacy_id") == routine_id), None)

    def create_routine(self, data: Dict[str, Any]) -> Dict[str, Any]:
        from app.services.exercises import create_routine
        return create_routine(data)

    def update_routine(self, routine_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        from app.services.exercises import update_routine
        return update_routine(routine_id, data)

    def delete_routine(self, routine_id: str) -> bool:
        from app.services.exercises import delete_routine
        return delete_routine(routine_id)

    def list_saved_exercises(self, user_id: str) -> List[Dict[str, Any]]:
        from app.services.exercises import get_saved_exercises
        return get_saved_exercises(user_id)

    def save_exercise_for_user(self, user_id: str, routine_id: str) -> bool:
        from app.services.exercises import save_exercise_for_user
        return save_exercise_for_user(user_id, routine_id)

    def list_clinics(self) -> List[Dict[str, Any]]:
        return mock_db.clinics


class SupabaseContentRepository(ContentRepository):
    def __init__(self, client):
        self.client = client

    def list_recipes(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("recipes").select("*").execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get_recipe(self, recipe_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("recipes").select("*").eq("id", recipe_id).execute()
            if not res.data:
                res = self.client.table("recipes").select("*").eq("legacy_id", recipe_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create_recipe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                **data
            }
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
            res = self.client.table("recipes").update(payload).eq("id", recipe_id).execute()
            if not res.data:
                res = self.client.table("recipes").update(payload).eq("legacy_id", recipe_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_recipe(self, recipe_id: str) -> bool:
        try:
            res = self.client.table("recipes").delete().eq("id", recipe_id).execute()
            if not res.data:
                res = self.client.table("recipes").delete().eq("legacy_id", recipe_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_saved_recipes(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("saved_recipes").select("recipe_id, recipes(*)").eq("user_id", user_id).execute()
            saved = []
            for row in (res.data or []):
                r = row.get("recipes")
                if r:
                    saved.append(r)
            return saved
        except Exception as e:
            handle_db_error(e)
            return []

    def save_recipe_for_user(self, user_id: str, recipe_id: str) -> bool:
        try:
            payload = {
                "user_id": user_id,
                "recipe_id": recipe_id,
                "saved_at": datetime.utcnow().isoformat()
            }
            res = self.client.table("saved_recipes").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_routines(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("exercise_routines").select("*").execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get_routine(self, routine_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("exercise_routines").select("*").eq("id", routine_id).execute()
            if not res.data:
                res = self.client.table("exercise_routines").select("*").eq("legacy_id", routine_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create_routine(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                **data
            }
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
            res = self.client.table("exercise_routines").update(payload).eq("id", routine_id).execute()
            if not res.data:
                res = self.client.table("exercise_routines").update(payload).eq("legacy_id", routine_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_routine(self, routine_id: str) -> bool:
        try:
            res = self.client.table("exercise_routines").delete().eq("id", routine_id).execute()
            if not res.data:
                res = self.client.table("exercise_routines").delete().eq("legacy_id", routine_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_saved_exercises(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("saved_exercises").select("routine_id, exercise_routines(*)").eq("user_id", user_id).execute()
            saved = []
            for row in (res.data or []):
                ex = row.get("exercise_routines")
                if ex:
                    saved.append(ex)
            return saved
        except Exception as e:
            handle_db_error(e)
            return []

    def save_exercise_for_user(self, user_id: str, routine_id: str) -> bool:
        try:
            payload = {
                "user_id": user_id,
                "routine_id": routine_id,
                "saved_at": datetime.utcnow().isoformat()
            }
            res = self.client.table("saved_exercises").insert(payload).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_clinics(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("clinics").select("*").execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []
