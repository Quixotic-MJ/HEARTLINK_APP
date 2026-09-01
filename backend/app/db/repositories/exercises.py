# backend/app/db/repositories/exercises.py
"""
Exercise Logs Repository Layer.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

class ExercisesRepository:
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_all_logs(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_log(self, user_id: str, log_id: str) -> bool:
        raise NotImplementedError


class SupabaseExercisesRepository(ExercisesRepository):
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

    def _normalize_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        if not log:
            return log
        # If duration_seconds is already present from database column
        if log.get("duration_seconds") is not None:
            return log
        
        # Check if duration_seconds was embedded in routine_name during fallback
        routine_name = log.get("routine_name") or ""
        if "[sec:" in routine_name:
            import re
            m = re.search(r"\s*\[sec:(\d+)\]", routine_name)
            if m:
                log["duration_seconds"] = int(m.group(1))
                log["routine_name"] = re.sub(r"\s*\[sec:\d+\]", "", routine_name)
                return log
        
        # Legacy row fallback
        if log.get("duration_minutes"):
            log["duration_seconds"] = int(log["duration_minutes"]) * 60
        return log

    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            query = self.client.table("exercise_logs").select("*").eq("user_id", uuid_val).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            logs = res.data or []
            return [self._normalize_log(log) for log in logs]
        except Exception as e:
            logger.warning(f"Error reading exercise logs for {user_id}: {e}")
            return []

    def list_all_logs(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("exercise_logs").select("*").order("logged_at", desc=True).execute()
            logs = res.data or []
            return [self._normalize_log(log) for log in logs]
        except Exception as e:
            logger.warning(f"Error reading all exercise logs: {e}")
            return []

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot record exercise log: invalid or unknown user '{user_id}'")

        try:
            duration_sec = int(data.get("duration_seconds") or 0)
            if duration_sec == 0 and data.get("duration_minutes"):
                duration_sec = int(round(float(data.get("duration_minutes")) * 60))
            
            duration_min = int(round(duration_sec / 60.0)) if duration_sec > 0 else int(data.get("duration_minutes") or 0)
            status_val = data.get("status") or "completed"
            routine_name_raw = data.get("routine_name") or "Exercise Session"
            
            payload = {
                "user_id": uuid_val,
                "routine_name": routine_name_raw,
                "duration_seconds": duration_sec,
                "duration_minutes": duration_min,
                "status": status_val,
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            if data.get("routine_id"):
                valid_routine_id = resolve_uuid(data["routine_id"])
                payload["routine_id"] = valid_routine_id

            payload = serialize_for_db(payload)
            
            # Resilient execution with emergency fallback during migration deploy
            insert_payload = dict(payload)
            try:
                res = self.client.table("exercise_logs").insert(insert_payload).execute()
                result = res.data[0] if res.data else payload
                return self._normalize_log(result)
            except Exception as insert_err:
                err_msg = str(insert_err)
                
                # Fallback 1: Column 'duration_seconds' does not exist yet (PGRST204)
                if "duration_seconds" in err_msg or "PGRST204" in err_msg:
                    insert_payload.pop("duration_seconds", None)
                    # Embed seconds into routine_name to preserve exact duration in DB
                    insert_payload["routine_name"] = f"{routine_name_raw} [sec:{duration_sec}]"
                    if insert_payload.get("duration_minutes", 0) < 1:
                        insert_payload["duration_minutes"] = 1
                    try:
                        res = self.client.table("exercise_logs").insert(insert_payload).execute()
                        result = res.data[0] if res.data else payload
                        result["duration_seconds"] = duration_sec
                        result["duration_minutes"] = duration_min
                        result["routine_name"] = routine_name_raw
                        return result
                    except Exception as sub_err:
                        insert_err = sub_err

                # Fallback 2: Check constraint violation on duration_minutes >= 1 (23514)
                err_msg = str(insert_err)
                if "exercise_logs_duration_minutes_check" in err_msg or "23514" in err_msg:
                    insert_payload.pop("duration_seconds", None)
                    insert_payload["routine_name"] = f"{routine_name_raw} [sec:{duration_sec}]"
                    insert_payload["duration_minutes"] = 1
                    res = self.client.table("exercise_logs").insert(insert_payload).execute()
                    result = res.data[0] if res.data else payload
                    result["duration_seconds"] = duration_sec
                    result["duration_minutes"] = duration_min
                    result["routine_name"] = routine_name_raw
                    return result

                if "exercise_logs_status_check" in err_msg:
                    logger.warning(f"exercise_logs status check failed for '{status_val}', falling back to 'completed'")
                    insert_payload["status"] = "completed"
                    res = self.client.table("exercise_logs").insert(insert_payload).execute()
                    result = res.data[0] if res.data else payload
                    return self._normalize_log(result)

                raise insert_err
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_log(self, user_id: str, log_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        valid_log_id = resolve_uuid(log_id)
        if not uuid_val or not valid_log_id:
            return False
        try:
            res = self.client.table("exercise_logs").delete().eq("id", valid_log_id).eq("user_id", uuid_val).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
