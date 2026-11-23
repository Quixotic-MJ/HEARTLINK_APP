"""Step Days Repository Layer (HL-163): one row per patient per day, from the phone's step counts."""
from typing import Any, Dict, List

from app.db.repositories.base import handle_db_error

TABLE = "step_days"


class StepDaysRepository:
    def list(self, user_id: str, start: str, end: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def save_days(self, user_id: str, days: List[Dict[str, Any]]) -> None:
        raise NotImplementedError

    def delete_all(self, user_id: str) -> None:
        raise NotImplementedError


class SupabaseStepDaysRepository(StepDaysRepository):
    def __init__(self, client):
        self.client = client

    def list(self, user_id: str, start: str, end: str) -> List[Dict[str, Any]]:
        """Days from start to end (inclusive, YYYY-MM-DD)."""
        try:
            res = (
                self.client.table(TABLE).select("*").eq("user_id", user_id)
                .gte("day", start).lte("day", end).order("day").execute()
            )
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def save_days(self, user_id: str, days: List[Dict[str, Any]]) -> None:
        """Replaces each day sent (the app sends the whole week every time)."""
        if not days:
            return
        try:
            rows = [{"user_id": user_id, **d} for d in days]
            self.client.table(TABLE).upsert(rows, on_conflict="user_id,day").execute()
        except Exception as e:
            handle_db_error(e)

    def delete_all(self, user_id: str) -> None:
        try:
            self.client.table(TABLE).delete().eq("user_id", user_id).execute()
        except Exception as e:
            handle_db_error(e)
