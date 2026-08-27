from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import verify_token
from app.utils.activity_helper import record_admin_activity
from app.db.repositories import get_feedback_repo, get_profile_repo

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])
security = HTTPBearer(auto_error=False)

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    adminNotes: Optional[str] = None

class TicketCreate(BaseModel):
    category: str
    fullMessage: str
    deviceMeta: Optional[Dict[str, Any]] = None
    user: Optional[str] = "Anonymous User"
    userEmail: Optional[str] = "Not Provided"
    userId: Optional[str] = "N/A"

def get_feedback_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims")
        
    user = get_profile_repo().get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if user.get("account_status") != "active":
        raise HTTPException(status_code=403, detail="Access Denied: Account is disabled or archived")
        
    return user

def require_admin_or_super_admin(current_user: dict = Depends(get_feedback_user)):
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access Denied: Admin or Super Admin only")
    return current_user

@router.get("/")
def get_feedback_tickets(current_user: dict = Depends(require_admin_or_super_admin)):
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
            recipient_roles=["admin", "super_admin"],
            route="/feedbacks",
            target_id=str(new_ticket.get("id") or ticket_code),
        )
    except Exception as e:
        print(f"Failed to create admin notification for feedback: {e}")

    return new_ticket

@router.put("/{ticket_id}")
def update_feedback_ticket(
    ticket_id: str,
    ticket_update: TicketUpdate,
    current_user: dict = Depends(require_admin_or_super_admin)
):
    # Validate status if provided
    if ticket_update.status is not None:
        if ticket_update.status not in ["Open", "In Progress", "Resolved", "Archived"]:
            raise HTTPException(status_code=400, detail=f"Invalid status: {ticket_update.status}")

    repo = get_feedback_repo()
    existing = repo.get_ticket(ticket_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = existing.get("status")
    update_data = {}
    if ticket_update.status is not None:
        update_data["status"] = ticket_update.status
    if ticket_update.adminNotes is not None:
        update_data["adminNotes"] = ticket_update.adminNotes

    updated = repo.update_ticket(ticket_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket update failed")

    # Log admin activity
    action = "updated"
    if ticket_update.status is not None and ticket_update.status != old_status:
        if ticket_update.status == "Archived":
            action = "archived"
        elif old_status == "Archived":
            action = "restored"
            
    record_admin_activity(
        admin_user_id=current_user["id"],
        action=action,
        target_type="feedback",
        target_id=str(ticket_id),
        target_name=existing.get("ticketId") or existing.get("ticket_code")
    )
    return updated
