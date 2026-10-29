# backend/app/db/repositories/admin.py
"""
Admin Activity Logs & Admin Notifications Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.services.notification_archive import keep_active

logger = logging.getLogger(__name__)

class AdminRepository:
    def record_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_activity(self, limit: Optional[int] = None, action: Optional[str] = None, target_type: Optional[str] = None, admin_user_id: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_admin_notification(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_admin_notifications(self, caller_role: str, caller_id: str, include_archived: bool = False,
                                 expert_type: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    def mark_admin_notification_read(self, notification_id: str, caller_role: str, caller_id: str,
                                     expert_type: Optional[str] = None) -> bool:
        raise NotImplementedError

    def mark_all_admin_notifications_read(self, caller_role: str, caller_id: str, expert_type: Optional[str] = None) -> bool:
        raise NotImplementedError


class SupabaseAdminRepository(AdminRepository):
    def __init__(self, client):
        self.client = client

    def record_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": utc_now().isoformat(),
                **data
            }
            res = self.client.table("admin_activity_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_activity(self, limit: Optional[int] = None, action: Optional[str] = None, target_type: Optional[str] = None, admin_user_id: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            def page(start: int, end: int):
                query = self.client.table("admin_activity_logs").select("*")
                if action:
                    query = query.eq("action", action)
                if target_type:
                    query = query.eq("target_type", target_type)
                if admin_user_id:
                    query = query.eq("admin_user_id", admin_user_id)
                return query.order("created_at", desc=True).range(start, end).execute()

            # HL-080: page through the table; one request stops at Supabase's 1,000-row limit
            rows, start, step = [], 0, 1000
            while True:
                res = page(start, start + step - 1)
                batch = res.data or []
                rows.extend(batch)
                if len(batch) < step or (limit and len(rows) >= limit):
                    break
                start += step
            items = [item for item in rows if "[TEST FIXTURE" not in str(item)]
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
                "created_at": utc_now().isoformat(),
                **data
            }
            clean_payload = {k: v for k, v in payload.items() if k != "read_by"}
            res = self.client.table("admin_notifications").insert(clean_payload).execute()
            created = res.data[0] if res.data else clean_payload
            if data.get("read_by") and created.get("id"):
                self._save_reads([created["id"]], data["read_by"])
            return created
        except Exception as e:
            handle_db_error(e)
            return None

    def list_admin_notifications(self, caller_role: str, caller_id: str, include_archived: bool = False,
                                 expert_type: Optional[str] = None) -> Dict[str, Any]:
        try:
            from app.services.admin_notifications import recipient_keys
            admin_uuid = resolve_uuid(caller_id)
            res = self.client.table("admin_notifications").select("*").order("created_at", desc=True).execute()
            all_notifs = res.data or []
            # HL-082: experts answer to "expert:<their type>"; nobody sees a notification they caused themselves
            keys = recipient_keys(caller_role, expert_type)
            visible = [
                n for n in all_notifs
                if keys & set(n.get("recipient_roles") or []) and not (admin_uuid and n.get("actor_id") == admin_uuid)
            ]
            # HL-019: archived ones (over 72 hours old) only when asked for; they never count as unread.
            visible = keep_active(visible, include_archived)
            
            read_notif_ids = set()
            if admin_uuid:
                reads_res = self.client.table("admin_notification_reads").select("notification_id").eq("admin_user_id", admin_uuid).execute()
                read_notif_ids = {r["notification_id"] for r in (reads_res.data or [])}

            formatted = []
            unread_count = 0
            for n in visible:
                item = dict(n)
                item["read_by"] = [caller_id] if n["id"] in read_notif_ids else []
                if n["id"] not in read_notif_ids and not item["archived"]:
                    unread_count += 1
                formatted.append(item)

            return {
                "items": formatted,
                "unread_count": unread_count,
                "total": len(formatted)
            }
        except Exception as e:
            err_str = str(e).lower()
            if "relation" in err_str or "does not exist" in err_str or "42p01" in err_str or "42501" in err_str:
                return {"items": [], "unread_count": 0, "total": 0}
            handle_db_error(e)
            return {"items": [], "unread_count": 0, "total": 0}

    def _save_reads(self, notification_ids: List[str], admin_ids: List[str]) -> None:
        # A notification already marked read (a double click, a second tab) is left as it is, not an error
        now = utc_now().isoformat()
        reads = [{"notification_id": nid, "admin_user_id": uid, "read_at": now} for nid in notification_ids for uid in admin_ids]
        self.client.table("admin_notification_reads").upsert(
            reads, on_conflict="notification_id,admin_user_id", ignore_duplicates=True
        ).execute()

    def mark_admin_notification_read(self, notification_id: str, caller_role: str, caller_id: str,
                                     expert_type: Optional[str] = None) -> bool:
        try:
            admin_uuid = resolve_uuid(caller_id)
            if not admin_uuid:
                return False
            # HL-082: only a notification this person can see
            visible = self.list_admin_notifications(caller_role, caller_id, True, expert_type).get("items", [])
            notif = next((n for n in visible if n.get("id") == notification_id), None)
            if notif is None:
                return False
            if caller_id not in notif.get("read_by", []):
                self._save_reads([notification_id], [admin_uuid])
            return True
        except Exception as e:
            handle_db_error(e)
            return False

    def mark_all_admin_notifications_read(self, caller_role: str, caller_id: str, expert_type: Optional[str] = None) -> bool:
        try:
            admin_uuid = resolve_uuid(caller_id)
            if not admin_uuid:
                return False
            notifs = self.list_admin_notifications(caller_role, caller_id, expert_type=expert_type)
            items = notifs.get("items", [])
            unread_ids = [n["id"] for n in items if caller_id not in n.get("read_by", [])]
            if unread_ids:
                self._save_reads(unread_ids, [admin_uuid])
            return True
        except Exception as e:
            handle_db_error(e)
            return False
