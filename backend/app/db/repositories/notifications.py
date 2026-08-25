# backend/app/db/repositories/notifications.py
"""
Patient Notifications & System Broadcasts Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

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

    def create_broadcast(self, broadcast_data: Dict[str, Any], target_user_ids: List[str]) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_broadcast(self, broadcast_id: str) -> bool:
        raise NotImplementedError


class MockNotificationRepository(NotificationRepository):
    def list_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        notifs = [n for n in mock_db.notifications if n.get("user_id") == user_id]
        return sorted(notifs, key=lambda x: x.get("created_at") or datetime.min, reverse=True)

    def mark_read(self, notification_id: str, user_id: Optional[str] = None) -> bool:
        for n in mock_db.notifications:
            if n.get("id") == notification_id:
                if user_id and n.get("user_id") and n["user_id"] != user_id:
                    return False
                n["read"] = True
                mock_db.save_logs()
                return True
        return False

    def mark_all_read(self, user_id: str) -> bool:
        updated = False
        for n in mock_db.notifications:
            if n.get("user_id") == user_id and not n.get("read"):
                n["read"] = True
                updated = True
        if updated:
            mock_db.save_logs()
        return True

    def create_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        record = {
            "id": data.get("id") or f"notif-{uuid.uuid4().hex[:8]}",
            "created_at": now,
            "read": False,
            **data
        }
        mock_db.notifications.append(record)
        mock_db.save_logs()
        return record

    def list_broadcasts(self) -> List[Dict[str, Any]]:
        return sorted(mock_db.system_broadcasts, key=lambda x: x.get("created_at") or datetime.min, reverse=True)

    def create_broadcast(self, broadcast_data: Dict[str, Any], target_user_ids: List[str]) -> Dict[str, Any]:
        now = datetime.utcnow()
        b_id = broadcast_data.get("id") or f"brd-{uuid.uuid4().hex[:8]}"
        record = {
            "id": b_id,
            "created_at": now,
            **broadcast_data
        }
        mock_db.system_broadcasts.append(record)

        # Fanout to notifications
        for uid in target_user_ids:
            notif = {
                "id": f"notif-brd-{b_id}-{uid}",
                "user_id": uid,
                "scope": "broadcast",
                "type": "announcement",
                "broadcast_type": record.get("type"),
                "broadcast_id": b_id,
                "publisher_id": record.get("publisher_id"),
                "title": record.get("title"),
                "message": record.get("message"),
                "read": False,
                "created_at": now
            }
            mock_db.notifications.append(notif)

        mock_db.save_logs()
        return record

    def delete_broadcast(self, broadcast_id: str) -> bool:
        initial = len(mock_db.system_broadcasts)
        mock_db.system_broadcasts[:] = [b for b in mock_db.system_broadcasts if not (b.get("id") == broadcast_id or b.get("legacy_id") == broadcast_id)]
        # Cascade linked notifications
        mock_db.notifications[:] = [n for n in mock_db.notifications if not (n.get("broadcast_id") == broadcast_id)]
        if len(mock_db.system_broadcasts) < initial:
            mock_db.save_logs()
            return True
        return False


class SupabaseNotificationRepository(NotificationRepository):
    def __init__(self, client):
        self.client = client

    def list_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("patient_notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def mark_read(self, notification_id: str, user_id: Optional[str] = None) -> bool:
        try:
            query = self.client.table("patient_notifications").update({"read": True}).eq("id", notification_id)
            if user_id:
                query = query.eq("user_id", user_id)
            res = query.execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def mark_all_read(self, user_id: str) -> bool:
        try:
            res = self.client.table("patient_notifications").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
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
            handle_db_error(e)
            return []

    def create_broadcast(self, broadcast_data: Dict[str, Any], target_user_ids: List[str]) -> Dict[str, Any]:
        try:
            now_iso = datetime.utcnow().isoformat()
            payload = {
                "created_at": now_iso,
                **broadcast_data
            }
            res = self.client.table("system_broadcasts").insert(payload).execute()
            created_b = res.data[0] if res.data else payload
            b_id = created_b.get("id")

            # Fanout
            if target_user_ids and b_id:
                fanout_rows = [
                    {
                        "user_id": uid,
                        "scope": "broadcast",
                        "type": "announcement",
                        "broadcast_type": created_b.get("type"),
                        "broadcast_id": b_id,
                        "publisher_id": created_b.get("publisher_id"),
                        "title": created_b.get("title"),
                        "message": created_b.get("message"),
                        "read": False,
                        "created_at": now_iso
                    }
                    for uid in target_user_ids
                ]
                self.client.table("patient_notifications").insert(fanout_rows).execute()

            return created_b
        except Exception as e:
            handle_db_error(e)
            return {}

    def delete_broadcast(self, broadcast_id: str) -> bool:
        try:
            res = self.client.table("system_broadcasts").delete().eq("id", broadcast_id).execute()
            if not res.data:
                res = self.client.table("system_broadcasts").delete().eq("legacy_id", broadcast_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
