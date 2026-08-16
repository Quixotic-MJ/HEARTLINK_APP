from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import app.mock_db as mock_db
from app.utils.security import verify_token
from app.utils.activity_helper import record_admin_activity

# Import the mock data
from app.mock_db import feedback_tickets

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
    # Try decoding as JWT (for Admin/Super Admin/Expert)
    try:
        payload = verify_token(token)
        user_id = payload.get("user_id")
        role = payload.get("role")
        if user_id and role:
            user = next((p for p in mock_db.profiles if p["id"] == user_id), None)
            if user:
                return user
    except Exception:
        # Fall back to raw user ID (for Patients)
        user = next((p for p in mock_db.profiles if p["id"] == token), None)
        if user:
            return user
            
    raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_admin_or_super_admin(current_user: dict = Depends(get_feedback_user)):
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access Denied: Admin or Super Admin only")
    return current_user

@router.get("/")
def get_feedback_tickets(current_user: dict = Depends(require_admin_or_super_admin)):
    return feedback_tickets

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
        
    # Verify profile exists in DB
    user_profile = next((p for p in mock_db.profiles if p["id"] == current_user["id"]), None)
    if not user_profile:
        raise HTTPException(status_code=400, detail="User profile not found")

    # Prevent impersonation
    if ticket.userId and ticket.userId != "N/A" and ticket.userId != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot submit feedback for another user's account")

    # Generate a new ID and Ticket ID
    new_id = max([t["id"] for t in feedback_tickets]) + 1 if feedback_tickets else 1
    last_fb_id = 1000
    for t in feedback_tickets:
        try:
            num = int(t.get("ticketId", "").split("-")[1])
            if num > last_fb_id:
                last_fb_id = num
        except:
            pass
            
    ticket_id = f"FB-{last_fb_id + 1}"
    date_str = datetime.now().strftime("%b %d, %Y")
    
    # Generate preview
    preview = ticket.fullMessage[:40] + "..." if len(ticket.fullMessage) > 40 else ticket.fullMessage
    
    # Derive user info from authenticated current_user
    user_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
    if not user_name:
        user_name = current_user.get("email") or "Authenticated User"
    user_email = current_user.get("email") or "Not Provided"
    user_id = current_user["id"]
    
    new_ticket = {
        "id": new_id,
        "ticketId": ticket_id,
        "date": date_str,
        "user": user_name,
        "userEmail": user_email,
        "userId": user_id,
        "category": ticket.category,
        "preview": preview,
        "fullMessage": ticket.fullMessage,
        "status": "Open",
        "deviceMeta": ticket.deviceMeta or {"os": "Unknown", "model": "Unknown", "appVersion": "Unknown"},
        "adminNotes": ""
    }
    
    feedback_tickets.insert(0, new_ticket)
    mock_db.save_logs()
    return new_ticket

@router.put("/{ticket_id}")
def update_feedback_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    current_user: dict = Depends(require_admin_or_super_admin)
):
    # Validate status if provided
    if ticket_update.status is not None:
        if ticket_update.status not in ["Open", "In Progress", "Resolved", "Archived"]:
            raise HTTPException(status_code=400, detail=f"Invalid status: {ticket_update.status}")

    for t in feedback_tickets:
        if t["id"] == ticket_id:
            old_status = t.get("status")
            
            if ticket_update.status is not None:
                t["status"] = ticket_update.status
            if ticket_update.adminNotes is not None:
                t["adminNotes"] = ticket_update.adminNotes
                
            mock_db.save_logs()
            
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
                target_id=str(t["id"]),
                target_name=t["ticketId"]
            )
            return t
            
    raise HTTPException(status_code=404, detail="Ticket not found")
