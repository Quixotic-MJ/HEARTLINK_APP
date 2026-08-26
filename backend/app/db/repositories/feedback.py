# backend/app/db/repositories/feedback.py
"""
Feedback Tickets Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error

logger = logging.getLogger(__name__)

class FeedbackRepository:
    def list_tickets(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create_ticket(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_ticket(self, ticket_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class MockFeedbackRepository(FeedbackRepository):
    def __init__(self):
        self._tickets: List[Dict[str, Any]] = []

    def list_tickets(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        tickets = list(self._tickets)
        if status_filter:
            tickets = [t for t in tickets if t.get("status") == status_filter]
        return tickets

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        for t in self._tickets:
            if str(t.get("id")) == str(ticket_id) or t.get("ticketId") == ticket_id or t.get("ticket_code") == ticket_id:
                return t
        return None

    def create_ticket(self, data: Dict[str, Any]) -> Dict[str, Any]:
        new_id = len(self._tickets) + 1
        ticket_code = f"FB-{1000 + new_id}"
        record = {
            "id": new_id,
            "ticketId": ticket_code,
            "ticket_code": ticket_code,
            "date": datetime.now().strftime("%b %d, %Y"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": "Open",
            "adminNotes": "",
            **data
        }
        self._tickets.append(record)
        return record

    def update_ticket(self, ticket_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return None
        ticket.update(data)
        ticket["updated_at"] = datetime.utcnow()
        return ticket


class SupabaseFeedbackRepository(FeedbackRepository):
    def __init__(self, client):
        self.client = client

    def list_tickets(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("feedback_tickets").select("*")
            if status_filter:
                query = query.eq("status", status_filter)
            res = query.order("created_at", desc=True).execute()
            formatted = []
            for t in (res.data or []):
                item = dict(t)
                item["ticketId"] = item.get("ticket_code") or item.get("ticketId")
                item["date"] = datetime.fromisoformat(item["created_at"]).strftime("%b %d, %Y") if item.get("created_at") else ""
                item["user"] = item.get("user_name") or item.get("user")
                item["userEmail"] = item.get("user_email") or item.get("userEmail")
                item["userId"] = str(item.get("user_id") or item.get("userId") or "N/A")
                item["adminNotes"] = item.get("admin_notes", "")
                item["deviceMeta"] = item.get("device_meta", {})
                formatted.append(item)
            return formatted
        except Exception as e:
            handle_db_error(e)
            return []

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("feedback_tickets").select("*").eq("id", ticket_id).execute()
            if not res.data:
                res = self.client.table("feedback_tickets").select("*").eq("ticket_code", ticket_id).execute()
            if res.data:
                item = res.data[0]
                item["ticketId"] = item.get("ticket_code") or item.get("ticketId")
                item["date"] = datetime.fromisoformat(item["created_at"]).strftime("%b %d, %Y") if item.get("created_at") else ""
                item["user"] = item.get("user_name") or item.get("user")
                item["userEmail"] = item.get("user_email") or item.get("userEmail")
                item["userId"] = str(item.get("user_id") or item.get("userId") or "N/A")
                item["adminNotes"] = item.get("admin_notes", "")
                item["deviceMeta"] = item.get("device_meta", {})
                return item
            return None
        except Exception as e:
            handle_db_error(e)
            return None

    def create_ticket(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res_all = self.client.table("feedback_tickets").select("ticket_code").order("created_at", desc=True).limit(1).execute()
            last_code = 1000
            if res_all.data and len(res_all.data) > 0:
                try:
                    last_code = int(res_all.data[0]["ticket_code"].split("-")[1])
                except:
                    pass
            ticket_code = f"FB-{last_code + 1}"
            now_iso = datetime.utcnow().isoformat()
            payload = {
                "ticket_code": ticket_code,
                "user_id": data.get("user_id"),
                "user_name": data.get("user_name") or data.get("user", "Anonymous"),
                "user_email": data.get("user_email") or data.get("userEmail", "Not Provided"),
                "category": data.get("category", "Question"),
                "preview": data.get("preview") or data.get("fullMessage", "")[:40],
                "full_message": data.get("full_message") or data.get("fullMessage", ""),
                "status": data.get("status", "Open"),
                "device_meta": data.get("device_meta") or data.get("deviceMeta", {}),
                "admin_notes": data.get("admin_notes") or data.get("adminNotes", ""),
                "created_at": now_iso,
                "updated_at": now_iso
            }
            res = self.client.table("feedback_tickets").insert(payload).execute()
            created = res.data[0] if res.data else payload
            created["ticketId"] = created["ticket_code"]
            created["date"] = datetime.fromisoformat(now_iso).strftime("%b %d, %Y")
            created["user"] = created["user_name"]
            created["userEmail"] = created["user_email"]
            created["userId"] = str(created.get("user_id") or "N/A")
            created["fullMessage"] = created["full_message"]
            created["adminNotes"] = created["admin_notes"]
            created["deviceMeta"] = created["device_meta"]
            return created
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_ticket(self, ticket_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            db_payload = {}
            if "status" in data:
                db_payload["status"] = data["status"]
            if "adminNotes" in data:
                db_payload["admin_notes"] = data["adminNotes"]
            elif "admin_notes" in data:
                db_payload["admin_notes"] = data["admin_notes"]
            db_payload["updated_at"] = datetime.utcnow().isoformat()

            res = self.client.table("feedback_tickets").update(db_payload).eq("id", ticket_id).execute()
            if not res.data:
                res = self.client.table("feedback_tickets").update(db_payload).eq("ticket_code", ticket_id).execute()
            return self.get_ticket(ticket_id)
        except Exception as e:
            handle_db_error(e)
            return None
