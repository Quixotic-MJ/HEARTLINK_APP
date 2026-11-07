# backend/app/db/repositories/exercise_screening.py
"""
Exercise Screening Repository Layer (HL-093): one row of safety check answers per patient.
"""
from typing import Any, Dict, Optional

from app.db.repositories.base import handle_db_error

TABLE = "exercise_screenings"


class ExerciseScreeningRepository:
    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def save(self, user_id: str, row: Dict[str, Any]) -> None:
        raise NotImplementedError


class SupabaseExerciseScreeningRepository(ExerciseScreeningRepository):
    def __init__(self, client):
        self.client = client

    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).select("*").eq("user_id", user_id).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def save(self, user_id: str, row: Dict[str, Any]) -> None:
        try:
            self.client.table(TABLE).upsert({"user_id": user_id, **row}, on_conflict="user_id").execute()
        except Exception as e:
            handle_db_error(e)
