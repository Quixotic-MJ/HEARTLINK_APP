# backend/app/db/repositories/sleep.py
"""
Sleep Logs Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

class SleepLogsRepository:
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_log(self, user_id: str, log_id: str) -> bool:
        raise NotImplementedError


class MockSleepLogsRepository(SleepLogsRepository):
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        logs = [s for s in mock_db.sleep_logs if s.get("user_id") == user_id and not s.get("is_deleted")]
        sorted_logs = sorted(logs, key=lambda x: x.get("logged_at") or datetime.min, reverse=True)
        return sorted_logs[:limit] if limit else sorted_logs

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        new_log = {
            "id": f"sleep-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "created_at": now,
            "logged_at": data.get("logged_at") or now
        }
        mock_db.sleep_logs.append(new_log)
        mock_db.save_logs()
        return new_log

    def delete_log(self, user_id: str, log_id: str) -> bool:
        for s in mock_db.sleep_logs:
            if s.get("id") == log_id and s.get("user_id") == user_id:
                s["is_deleted"] = True
                mock_db.save_logs()
                return True
        return False


class SupabaseSleepLogsRepository(SleepLogsRepository):
    def __init__(self, client):
        self.client = client

    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("sleep_logs").select("*").eq("user_id", user_id).eq("is_deleted", False).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                **data,
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            res = self.client.table("sleep_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_log(self, user_id: str, log_id: str) -> bool:
        try:
            res = self.client.table("sleep_logs").update({"is_deleted": True}).eq("id", log_id).eq("user_id", user_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
