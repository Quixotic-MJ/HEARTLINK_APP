# backend/app/db/repositories/hss.py
"""
HSS History Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

class HSSRepository:
    def get_latest_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_baseline_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_hss_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_all_hss_records(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_hss_record(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class SupabaseHSSRepository(HSSRepository):
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

    def list_hss_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            query = self.client.table("hss_history").select("*").eq("user_id", uuid_val).order("computed_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading HSS history for {user_id}: {e}")
            return []

    def list_all_hss_records(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("hss_history").select("*").order("computed_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading all HSS records: {e}")
            return []

    def get_latest_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        records = self.list_hss_history(user_id, limit=1)
        return records[0] if records else None

    def get_baseline_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return None
        try:
            res = self.client.table("hss_history").select("*").eq("user_id", uuid_val).eq("source", "baseline").order("computed_at", desc=True).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.warning(f"Error reading baseline HSS for {user_id}: {e}")
            return None

    def create_hss_record(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot record HSS: invalid or unknown user '{user_id}'")
        try:
            payload = {
                "user_id": uuid_val,
                "score": data["score"],
                "tier": data["tier"],
                "risk_probability": data.get("risk_probability"),
                "source": data.get("source", "telemetry"),
                "model_version": data.get("model_version", "v1.0.0"),
                "model_hash": data.get("model_hash"),
                "contributing_factors": data.get("contributing_factors", {}),
                "computed_at": data.get("computed_at") or datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat()
            }
            payload = serialize_for_db(payload)
            res = self.client.table("hss_history").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}
