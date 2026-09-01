# backend/app/db/repositories/admin.py
"""
Admin Activity Logs & Admin Notifications Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid

logger = logging.getLogger(__name__)

class AdminRepository:
    def record_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_activity(self, limit: Optional[int] = None, action: Optional[str] = None, target_type: Optional[str] = None, admin_user_id: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_admin_notification(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_admin_notifications(self, caller_role: str, caller_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    def mark_admin_notification_read(self, notification_id: str, caller_role: str, caller_id: str) -> bool:
        raise NotImplementedError

    def mark_all_admin_notifications_read(self, caller_role: str, caller_id: str) -> bool:
        raise NotImplementedError


class SupabaseAdminRepository(AdminRepository):
    def __init__(self, client):
        self.client = client

    def record_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                **data
            }
            res = self.client.table("admin_activity_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_activity(self, limit: Optional[int] = None, action: Optional[str] = None, target_type: Optional[str] = None, admin_user_id: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("admin_activity_logs").select("*")
            if action:
                query = query.eq("action", action)
            if target_type:
                query = query.eq("target_type", target_type)
            if admin_user_id:
                query = query.eq("admin_user_id", admin_user_id)
            res = query.order("created_at", desc=True).execute()
            items = res.data or []
            if search:
                s = search.lower()
                items = [x for x in items if s in (x.get("target_name") or "").lower() or s in (x.get("admin_name") or "").lower()]
            return items[:limit] if limit else items
        except Exception as e:
            handle_db_error(e)
            return []

    def create_admin_notification(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                **data
            }
            clean_payload = {k: v for k, v in payload.items() if k != "read_by"}
            res = self.client.table("admin_notifications").insert(clean_payload).execute()
            created = res.data[0] if res.data else clean_payload
            if data.get("read_by") and created.get("id"):
                reads = [{"notification_id": created["id"], "admin_user_id": uid, "read_at": datetime.utcnow().isoformat()} for uid in data["read_by"]]
                self.client.table("admin_notification_reads").insert(reads).execute()
            return created
        except Exception as e:
            handle_db_error(e)
            return None

    def list_admin_notifications(self, caller_role: str, caller_id: str) -> Dict[str, Any]:
        try:
            admin_uuid = resolve_uuid(caller_id)
            res = self.client.table("admin_notifications").select("*").order("created_at", desc=True).execute()
            all_notifs = res.data or []
            visible = [n for n in all_notifs if caller_role in n.get("recipient_roles", [])]
            
            read_notif_ids = set()
            if admin_uuid:
                reads_res = self.client.table("admin_notification_reads").select("notification_id").eq("admin_user_id", admin_uuid).execute()
                read_notif_ids = {r["notification_id"] for r in (reads_res.data or [])}

            formatted = []
            unread_count = 0
            for n in visible:
                item = dict(n)
                item["read_by"] = [caller_id] if n["id"] in read_notif_ids else []
                if n["id"] not in read_notif_ids:
                    unread_count += 1
                formatted.append(item)

            return {
                "items": formatted,
                "unread_count": unread_count,
                "total": len(formatted)
            }
        except Exception as e:
            handle_db_error(e)
            return {"items": [], "unread_count": 0, "total": 0}

    def mark_admin_notification_read(self, notification_id: str, caller_role: str, caller_id: str) -> bool:
        try:
            admin_uuid = resolve_uuid(caller_id)
            if not admin_uuid:
                return False
            payload = {
                "notification_id": notification_id,
                "admin_user_id": admin_uuid,
                "read_at": datetime.utcnow().isoformat()
            }
            self.client.table("admin_notification_reads").insert(payload).execute()
            return True
        except Exception as e:
            handle_db_error(e)
            return False

    def mark_all_admin_notifications_read(self, caller_role: str, caller_id: str) -> bool:
        try:
            admin_uuid = resolve_uuid(caller_id)
            if not admin_uuid:
                return False
            notifs = self.list_admin_notifications(caller_role, caller_id)
            items = notifs.get("items", [])
            unread_ids = [n["id"] for n in items if caller_id not in n.get("read_by", [])]
            if unread_ids:
                reads = [{"notification_id": nid, "admin_user_id": admin_uuid, "read_at": datetime.utcnow().isoformat()} for nid in unread_ids]
                self.client.table("admin_notification_reads").insert(reads).execute()
            return True
        except Exception as e:
            handle_db_error(e)
            return False
