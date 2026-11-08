"""Feedback ticket storage and the staff support projection."""
from typing import Optional, Dict, Any, List

from app.db.repositories.base import handle_db_error, resolve_uuid, list_projected_rows
from app.utils.time import utc_now, parse_utc, to_local_date


TICKET_COLUMNS = (
    "id,ticket_code,user_id,user_name,user_email,category,preview,full_message,"
    "status,device_meta,admin_notes,created_at,updated_at"
)


def _ticket(row: Dict[str, Any]) -> Dict[str, Any]:
    created = parse_utc(row.get("created_at"))
    metadata = row.get("device_meta") or {}
    return {
        "id": row.get("id"),
        "ticketId": row.get("ticket_code"),
        "user": row.get("user_name"),
        "userEmail": row.get("user_email"),
        "userId": str(row.get("user_id") or "N/A"),
        "category": row.get("category"),
        "preview": row.get("preview"),
        "fullMessage": row.get("full_message") or "",
        "status": "Archived" if row.get("status") == "Closed" else row.get("status"),
        "adminNotes": row.get("admin_notes") or "",
        "deviceMeta": {key: metadata[key] for key in ("os", "model", "appVersion")
                       if isinstance(metadata, dict) and isinstance(metadata.get(key), str)},
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "date": to_local_date(created).strftime("%b %d, %Y") if created else "",
    }


class FeedbackRepository:
    def list_tickets(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create_ticket(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_ticket(self, ticket_id: str, data: Dict[str, Any], expected_updated_at: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class SupabaseFeedbackRepository(FeedbackRepository):
    def __init__(self, client):
        self.client = client

    def list_tickets(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            # shortcut: the small support inbox is client-paginated; move search/detail reads server-side before large-volume use.
            rows = list_projected_rows(self.client, "feedback_tickets", TICKET_COLUMNS)
            tickets = [_ticket(row) for row in rows]
            return [item for item in tickets if not status_filter or item["status"] == status_filter]
        except Exception as error:
            handle_db_error(error)

    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        try:
            column = "id" if resolve_uuid(ticket_id) else "ticket_code"
            response = self.client.table("feedback_tickets").select(TICKET_COLUMNS).eq(column, ticket_id).execute()
            if getattr(response, "error", None) or response.data is None:
                raise RuntimeError("Ticket unavailable")
            return _ticket(response.data[0]) if response.data else None
        except Exception as error:
            handle_db_error(error)

    def create_ticket(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            latest = self.client.table("feedback_tickets").select("ticket_code").order("created_at", desc=True).limit(1).execute()
            if getattr(latest, "error", None) or not isinstance(latest.data, list):
                raise RuntimeError("Ticket sequence unavailable")
            last_code = 1000
            if latest.data:
                try:
                    last_code = int(latest.data[0]["ticket_code"].split("-")[1])
                except (ValueError, KeyError, IndexError, TypeError):
                    pass
            now = utc_now().isoformat()
            message = data.get("full_message") or data.get("fullMessage", "")
            payload = {
                "ticket_code": f"FB-{last_code + 1}",
                "user_id": data.get("user_id"),
                "user_name": data.get("user_name") or data.get("user", "Anonymous"),
                "user_email": data.get("user_email") or data.get("userEmail", "Not Provided"),
                "category": data.get("category", "Question"),
                "preview": data.get("preview") or message[:40],
                "full_message": message,
                "status": "Open",
                "device_meta": data.get("device_meta") or data.get("deviceMeta", {}),
                "admin_notes": "",
                "created_at": now,
                "updated_at": now,
            }
            response = self.client.table("feedback_tickets").insert(payload).execute()
            if getattr(response, "error", None) or not response.data:
                raise RuntimeError("Ticket was not saved")
            return _ticket(response.data[0])
        except Exception as error:
            handle_db_error(error)

    def update_ticket(self, ticket_id: str, data: Dict[str, Any], expected_updated_at: str) -> Optional[Dict[str, Any]]:
        try:
            payload = {"updated_at": utc_now().isoformat()}
            if "status" in data:
                payload["status"] = "Closed" if data["status"] == "Archived" else data["status"]
            if "adminNotes" in data:
                payload["admin_notes"] = data["adminNotes"]
            response = (self.client.table("feedback_tickets").update(payload).eq("id", ticket_id)
                        .eq("updated_at", expected_updated_at).execute())
            if getattr(response, "error", None) or response.data is None:
                raise RuntimeError("Ticket update unavailable")
            return _ticket(response.data[0]) if response.data else None
        except Exception as error:
            handle_db_error(error)
