"""Barangay Contacts Repository Layer (HL-171): the barangays whose emergency hotlines the app can show."""
from typing import Any, Dict, List, Optional

from app.db.repositories.base import handle_db_error

TABLE = "barangay_contacts"


class BarangayContactsRepository:
    def list_all(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get(self, barangay_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create(self, row: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update(self, barangay_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class SupabaseBarangayContactsRepository(BarangayContactsRepository):
    def __init__(self, client):
        self.client = client

    def list_all(self) -> List[Dict[str, Any]]:
        try:
            return self.client.table(TABLE).select("*").order("name").execute().data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get(self, barangay_id: str) -> Optional[Dict[str, Any]]:
        try:
            rows = self.client.table(TABLE).select("*").eq("id", barangay_id).limit(1).execute().data or []
            return rows[0] if rows else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create(self, row: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.client.table(TABLE).insert(row).execute()
            return res.data[0] if res.data else row
        except Exception as e:
            handle_db_error(e)
            return {}

    def update(self, barangay_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).update(patch).eq("id", barangay_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None
