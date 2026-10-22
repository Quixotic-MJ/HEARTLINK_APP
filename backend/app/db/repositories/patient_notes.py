# backend/app/db/repositories/patient_notes.py
"""
Patient Notes Repository Layer (HL-039 / HL-013 / HL-040).
Cardiologist guidance and the Dietitian / Physical Therapist thread on a patient. Soft delete only.
"""
from typing import Optional, Dict, Any, List
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

TABLE = "patient_notes"


class PatientNotesRepository:
    def list_for_patient(self, patient_id: str, kinds: List[str], limit: int = 200) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_latest_guidance(self, limit: int = 5) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get(self, note_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def soft_delete(self, note_id: str) -> bool:
        raise NotImplementedError


class SupabasePatientNotesRepository(PatientNotesRepository):
    def __init__(self, client):
        self.client = client

    def list_for_patient(self, patient_id: str, kinds: List[str], limit: int = 200) -> List[Dict[str, Any]]:
        uuid_val = resolve_uuid(patient_id)
        if not uuid_val or not kinds:
            return []
        try:
            res = self.client.table(TABLE).select("*")\
                .eq("patient_id", uuid_val)\
                .in_("kind", kinds)\
                .is_("deleted_at", "null")\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def list_latest_guidance(self, limit: int = 5) -> List[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).select("*")\
                .eq("kind", "guidance")\
                .is_("deleted_at", "null")\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get(self, note_id: str) -> Optional[Dict[str, Any]]:
        uuid_val = resolve_uuid(note_id)
        if not uuid_val:
            return None
        try:
            res = self.client.table(TABLE).select("*").eq("id", uuid_val).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.client.table(TABLE).insert(data).execute()
            return res.data[0] if res.data else data
        except Exception as e:
            handle_db_error(e)
            return {}

    def soft_delete(self, note_id: str) -> bool:
        uuid_val = resolve_uuid(note_id)
        if not uuid_val:
            return False
        try:
            res = self.client.table(TABLE).update({"deleted_at": utc_now().isoformat()})\
                .eq("id", uuid_val).is_("deleted_at", "null").execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
