# backend/app/db/repositories/sleep.py
"""
Sleep Logs Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

class SleepLogsRepository:
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_all_logs(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_log(self, user_id: str, log_id: str) -> bool:
        raise NotImplementedError


class SupabaseSleepLogsRepository(SleepLogsRepository):
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

    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            query = self.client.table("sleep_logs").select("*").eq("user_id", uuid_val).eq("is_deleted", False).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading sleep logs for {user_id}: {e}")
            return []

    def list_all_logs(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("sleep_logs").select("*").eq("is_deleted", False).order("logged_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading all sleep logs: {e}")
            return []

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot record sleep log: invalid or unknown user '{user_id}'")
        try:
            payload = {
                **data,
                "user_id": uuid_val,
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            if payload.get("quality"):
                clean_q = str(payload["quality"]).strip().capitalize()
                payload["quality"] = clean_q if clean_q in ["Poor", "Fair", "Good", "Excellent"] else "Good"
            else:
                payload["quality"] = "Good"

            payload = serialize_for_db(payload)
            res = self.client.table("sleep_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_log(self, user_id: str, log_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        valid_log_id = resolve_uuid(log_id)
        if not uuid_val or not valid_log_id:
            return False
        try:
            res = self.client.table("sleep_logs").update({"is_deleted": True}).eq("id", valid_log_id).eq("user_id", uuid_val).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
