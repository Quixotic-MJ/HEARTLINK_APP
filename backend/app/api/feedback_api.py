from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# Import the mock data
from app.mock_db import feedback_tickets

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

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

@router.get("/")
def get_feedback_tickets():
    return feedback_tickets

@router.post("/")
def create_feedback_ticket(ticket: TicketCreate):
    # Generate a new ID and Ticket ID
    new_id = max([t["id"] for t in feedback_tickets]) + 1 if feedback_tickets else 1
    # Example logic to get FB-1043 etc
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
    
    new_ticket = {
        "id": new_id,
        "ticketId": ticket_id,
        "date": date_str,
        "user": ticket.user,
        "userEmail": ticket.userEmail,
        "userId": ticket.userId,
        "category": ticket.category,
        "preview": preview,
        "fullMessage": ticket.fullMessage,
        "status": "Open",
        "deviceMeta": ticket.deviceMeta or {"os": "Unknown", "model": "Unknown", "appVersion": "Unknown"},
        "adminNotes": ""
    }
    
    feedback_tickets.insert(0, new_ticket) # Add to beginning for newest first by default
    return new_ticket

@router.put("/{ticket_id}")
def update_feedback_ticket(ticket_id: int, ticket_update: TicketUpdate):
    for t in feedback_tickets:
        if t["id"] == ticket_id:
            if ticket_update.status is not None:
                t["status"] = ticket_update.status
            if ticket_update.adminNotes is not None:
                t["adminNotes"] = ticket_update.adminNotes
            return t
            
    raise HTTPException(status_code=404, detail="Ticket not found")
