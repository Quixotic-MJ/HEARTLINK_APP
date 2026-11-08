from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any
from app.utils.security import get_current_user, get_current_admin_only
from app.utils.time import parse_utc
from app.utils.activity_helper import record_admin_activity
from app.db.repositories import get_feedback_repo, get_profile_repo
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

class TicketUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    expected_updated_at: str = Field(alias="expectedUpdatedAt", min_length=1)
    status: Optional[str] = None
    adminNotes: Optional[str] = Field(default=None, max_length=4000)

class TicketCreate(BaseModel):
    category: str
    fullMessage: str
    deviceMeta: Optional[Dict[str, Any]] = None
    user: Optional[str] = "Anonymous User"
    userEmail: Optional[str] = "Not Provided"
    userId: Optional[str] = "N/A"

def get_feedback_user(current_user: dict = Depends(get_current_user)):
    user = get_profile_repo().get_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user

def require_admin(current_user: dict = Depends(get_current_admin_only)):
    return current_user

@router.get("/")
def get_feedback_tickets(current_user: dict = Depends(require_admin)):
    return get_feedback_repo().list_tickets()

@router.post("/")
def create_feedback_ticket(
    ticket: TicketCreate,
    current_user: dict = Depends(get_feedback_user)
):
    # Validate category
    if not ticket.category or ticket.category not in ["Bug Report", "UI/UX Suggestion", "Account Issue", "Question"]:
        raise HTTPException(status_code=400, detail="Invalid or empty category")
        
    # Validate fullMessage
    if not ticket.fullMessage or not ticket.fullMessage.strip():
        raise HTTPException(status_code=400, detail="fullMessage cannot be empty or whitespace-only")
        
    # Prevent impersonation
    if ticket.userId and ticket.userId != "N/A" and ticket.userId != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot submit feedback for another user's account")

    # Derive user info from authenticated current_user
    user_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
    if not user_name:
        user_name = current_user.get("email") or "Authenticated User"
    user_email = current_user.get("email") or "Not Provided"
    user_id = current_user["id"]
    
    new_ticket_data = {
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "category": ticket.category,
        "full_message": ticket.fullMessage,
        "status": "Open",
        "device_meta": ticket.deviceMeta or {"os": "Unknown", "model": "Unknown", "appVersion": "Unknown"},
        "admin_notes": ""
    }
    
    new_ticket = get_feedback_repo().create_ticket(new_ticket_data)

    # Trigger Admin Notification (safe, non-blocking)
    try:
        from app.services.admin_notifications import create_admin_notification
        severity = "warning" if ticket.category in ["Bug Report", "Account Issue"] else "info"
        ticket_code = new_ticket.get("ticketId") or new_ticket.get("ticket_code", "FB-Ticket")
        safe_msg = f"{ticket_code} ({ticket.category}) submitted for review."
        create_admin_notification(
            type="feedback",
            title="New Feedback Received",
            message=safe_msg,
            severity=severity,
            recipient_roles=["admin"],
            route="/feedbacks",
            target_id=str(new_ticket.get("id") or ticket_code),
        )
    except Exception as e:
        logger.warning(f"Failed to create admin notification for feedback: {e}")

    return new_ticket

@router.put("/{ticket_id}")
def update_feedback_ticket(
    ticket_id: str,
    ticket_update: TicketUpdate,
    current_user: dict = Depends(require_admin)
):
    # Validate status if provided
    if ticket_update.status is not None:
        if ticket_update.status not in ["Open", "In Progress", "Resolved", "Archived"]:
            raise HTTPException(status_code=400, detail=f"Invalid status: {ticket_update.status}")

    repo = get_feedback_repo()
    existing = repo.get_ticket(ticket_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Ticket not found")

    revision = parse_utc(ticket_update.expected_updated_at)
    if not revision:
        raise HTTPException(status_code=400, detail="A valid ticket revision is required")
    if parse_utc(existing.get("updated_at")) != revision:
        raise HTTPException(status_code=409, detail="This ticket changed. Reopen the latest version before saving.")

    old_status = existing.get("status")
    update_data = {}
    if ticket_update.status is not None:
        update_data["status"] = ticket_update.status
    if ticket_update.adminNotes is not None:
        update_data["adminNotes"] = ticket_update.adminNotes

    if not update_data:
        raise HTTPException(status_code=400, detail="No ticket changes supplied")
    updated = repo.update_ticket(existing["id"], update_data, ticket_update.expected_updated_at)
    if not updated:
        raise HTTPException(status_code=409, detail="This ticket changed. Reopen the latest version before saving.")

    # Log admin activity
    action = "updated"
    if ticket_update.status is not None and ticket_update.status != old_status:
        if ticket_update.status == "Archived":
            action = "archived"
        elif old_status == "Archived":
            action = "restored"
            
    record_admin_activity(
        admin_user_id=current_user["user_id"],
        action=action,
        target_type="feedback",
        target_id=str(ticket_id),
        target_name=existing.get("ticketId") or existing.get("ticket_code")
    )
    return updated
