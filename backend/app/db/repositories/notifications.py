# backend/app/db/repositories/notifications.py
"""
Patient Notifications & System Broadcasts Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

class NotificationRepository:
    def list_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def mark_read(self, notification_id: str, user_id: Optional[str] = None) -> bool:
        raise NotImplementedError

    def mark_all_read(self, user_id: str) -> bool:
        raise NotImplementedError

    def create_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_broadcasts(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_broadcast(self, broadcast_data: Dict[str, Any], target_user_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_broadcast(self, broadcast_id: str) -> bool:
        raise NotImplementedError


class SupabaseNotificationRepository(NotificationRepository):
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

    def list_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            res = self.client.table("patient_notifications").select("*").eq("user_id", uuid_val).order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading notifications for {user_id}: {e}")
            return []

    def mark_read(self, notification_id: str, user_id: Optional[str] = None) -> bool:
        valid_notif_id = resolve_uuid(notification_id)
        if not valid_notif_id:
            return False
        try:
            query = self.client.table("patient_notifications").update({"read": True}).eq("id", valid_notif_id)
            if user_id:
                uuid_val = self._resolve_user_uuid(user_id)
                if uuid_val:
                    query = query.eq("user_id", uuid_val)
            res = query.execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def mark_all_read(self, user_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return False
        try:
            self.client.table("patient_notifications").update({"read": True}).eq("user_id", uuid_val).eq("read", False).execute()
            return True
        except Exception as e:
            handle_db_error(e)
            return False

    def create_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "read": False,
                **data
            }
            if data.get("user_id"):
                resolved = self._resolve_user_uuid(data["user_id"])
                if resolved:
                    payload["user_id"] = resolved
            payload = serialize_for_db(payload)
            res = self.client.table("patient_notifications").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_broadcasts(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("system_broadcasts").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading system broadcasts: {e}")
            return []

    def create_broadcast(self, broadcast_data: Dict[str, Any], target_user_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        try:
            now_iso = datetime.utcnow().isoformat()
            payload = {
                "created_at": now_iso,
                **broadcast_data
            }
            payload = serialize_for_db(payload)
            res = self.client.table("system_broadcasts").insert(payload).execute()
            created_b = res.data[0] if res.data else payload
            b_id = created_b.get("id")

            # Resolve target recipients if not provided
            if target_user_ids is None:
                from app.db.repositories import get_profile_repo
                patients = get_profile_repo().list_all(role_filter="patient")
                target_user_ids = [p["id"] for p in patients if p.get("account_status") == "active"]

            # Fanout
            if target_user_ids and b_id:
                fanout_rows = []
                for uid in target_user_ids:
                    r_uid = self._resolve_user_uuid(uid)
                    if r_uid:
                        fanout_rows.append({
                            "user_id": r_uid,
                            "scope": "broadcast",
                            "type": "announcement",
                            "broadcast_type": created_b.get("type"),
                            "broadcast_id": b_id,
                            "publisher_id": created_b.get("publisher_id"),
                            "title": created_b.get("title"),
                            "message": created_b.get("message"),
                            "read": False,
                            "created_at": now_iso
                        })
                if fanout_rows:
                    self.client.table("patient_notifications").insert(fanout_rows).execute()

            return created_b
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_broadcast(self, broadcast_id: str) -> bool:
        try:
            valid_b_id = resolve_uuid(broadcast_id)
            if valid_b_id:
                res = self.client.table("system_broadcasts").delete().eq("id", valid_b_id).execute()
            else:
                res = self.client.table("system_broadcasts").delete().eq("legacy_id", broadcast_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
