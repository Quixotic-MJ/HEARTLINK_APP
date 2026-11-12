"""Meal plan changes (HL-159): one row per patient, day and meal, laid over the worked-out weekly plan."""
from typing import Any, Dict, List

from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now

TABLE = "meal_plan_changes"


class MealPlanChangesRepository:
    def list(self, user_id: str, start: str, end: str) -> List[Dict[str, Any]]:
        """Every change from `start` to `end` (ISO dates, both included)."""
        raise NotImplementedError

    def save(self, user_id: str, day: str, meal: str, row: Dict[str, Any]) -> None:
        raise NotImplementedError

    def delete_one(self, user_id: str, day: str, meal: str) -> None:
        raise NotImplementedError

    def delete_range(self, user_id: str, start: str, end: str) -> None:
        raise NotImplementedError


class SupabaseMealPlanChangesRepository(MealPlanChangesRepository):
    def __init__(self, client):
        self.client = client

    def list(self, user_id: str, start: str, end: str) -> List[Dict[str, Any]]:
        try:
            res = (self.client.table(TABLE).select("*").eq("user_id", user_id)
                   .gte("day", start).lte("day", end).execute())
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def save(self, user_id: str, day: str, meal: str, row: Dict[str, Any]) -> None:
        # Exactly one kind per row: a swap clears an own meal and the other way round
        payload = {"recipe_id": None, "own_name": None, "own_sodium_mg": None, "own_calories": None, **row}
        try:
            self.client.table(TABLE).upsert(
                {"user_id": user_id, "day": day, "meal": meal, **payload, "saved_at": utc_now().isoformat()},
                on_conflict="user_id,day,meal",
            ).execute()
        except Exception as e:
            handle_db_error(e)

    def delete_one(self, user_id: str, day: str, meal: str) -> None:
        try:
            self.client.table(TABLE).delete().eq("user_id", user_id).eq("day", day).eq("meal", meal).execute()
        except Exception as e:
            handle_db_error(e)

    def delete_range(self, user_id: str, start: str, end: str) -> None:
        try:
            self.client.table(TABLE).delete().eq("user_id", user_id).gte("day", start).lte("day", end).execute()
        except Exception as e:
            handle_db_error(e)
