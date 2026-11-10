"""Lab Results Repository Layer (HL-138): one row per patient per kind ('cholesterol' or 'blood_sugar')."""
from typing import Any, Dict, List

from app.db.repositories.base import handle_db_error

TABLE = "lab_results"


class LabResultsRepository:
    def list(self, user_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def save(self, user_id: str, kind: str, row: Dict[str, Any]) -> None:
        raise NotImplementedError

    def delete(self, user_id: str, kind: str) -> None:
        raise NotImplementedError


class SupabaseLabResultsRepository(LabResultsRepository):
    def __init__(self, client):
        self.client = client

    def list(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).select("*").eq("user_id", user_id).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def save(self, user_id: str, kind: str, row: Dict[str, Any]) -> None:
        try:
            self.client.table(TABLE).upsert({"user_id": user_id, "kind": kind, **row}, on_conflict="user_id,kind").execute()
        except Exception as e:
            handle_db_error(e)

    def delete(self, user_id: str, kind: str) -> None:
        try:
            self.client.table(TABLE).delete().eq("user_id", user_id).eq("kind", kind).execute()
        except Exception as e:
            handle_db_error(e)
