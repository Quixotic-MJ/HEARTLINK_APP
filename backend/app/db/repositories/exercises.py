# backend/app/db/repositories/exercises.py
"""
Exercise Logs Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

class ExercisesRepository:
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_log(self, user_id: str, log_id: str) -> bool:
        raise NotImplementedError


class MockExercisesRepository(ExercisesRepository):
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        logs = [e for e in mock_db.exercise_logs if e.get("user_id") == user_id]
        sorted_logs = sorted(logs, key=lambda x: x.get("logged_at") or datetime.min, reverse=True)
        return sorted_logs[:limit] if limit else sorted_logs

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        new_log = {
            "id": f"ex-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "created_at": now,
            "logged_at": data.get("logged_at") or now
        }
        mock_db.exercise_logs.append(new_log)
        mock_db.save_logs()
        return new_log

    def delete_log(self, user_id: str, log_id: str) -> bool:
        initial = len(mock_db.exercise_logs)
        mock_db.exercise_logs[:] = [e for e in mock_db.exercise_logs if not (e.get("id") == log_id and e.get("user_id") == user_id)]
        if len(mock_db.exercise_logs) < initial:
            mock_db.save_logs()
            return True
        return False


class SupabaseExercisesRepository(ExercisesRepository):
    def __init__(self, client):
        self.client = client

    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("exercise_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            from app.db.repositories.base import serialize_for_db
            duration_min = data.get("duration_minutes") or (int(data.get("duration_seconds", 60)) // 60) or 1
            payload = {
                "user_id": user_id,
                "routine_name": data.get("routine_name") or "Exercise Session",
                "duration_minutes": max(1, int(duration_min)),
                "status": data.get("status") or "completed",
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            if data.get("routine_id"):
                try:
                    uuid.UUID(str(data["routine_id"]))
                    payload["routine_id"] = str(data["routine_id"])
                except (ValueError, TypeError):
                    pass
            payload = serialize_for_db(payload)
            res = self.client.table("exercise_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_log(self, user_id: str, log_id: str) -> bool:
        try:
            res = self.client.table("exercise_logs").delete().eq("id", log_id).eq("user_id", user_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
