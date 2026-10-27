# backend/app/services/admin_notifications.py
"""
Admin Notifications Service.
Routes notification creations to the admin repository layer.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from app.db.repositories import get_admin_repo
from app.db.repositories.base import resolve_uuid
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
import logging
import re

logger = logging.getLogger(__name__)

VALID_TYPES = {"feedback", "staff", "security", "system", "content", "notes"}
VALID_SEVERITIES = {"info", "warning"}
VALID_ROUTES = {"/feedbacks", "/users", "/settings", "/foods", "/exercises"}
PATIENT_ROUTE = re.compile(r"^/patients/[A-Za-z0-9-]+$")

# HL-082: medical experts get notifications too. recipient_roles names an expert type as "expert:<type>".
EXPERT_TYPES = ("Cardiologist", "Dietitian", "Physical Therapist")


def expert_recipient(expert_type: str) -> str:
    return f"expert:{expert_type}"


def recipient_keys(role: Optional[str], expert_type: Optional[str]) -> set:
    """What a signed-in staff member answers to in recipient_roles."""
    keys = {role} if role else set()
    if role == "medical_expert" and expert_type:
        keys.add(expert_recipient(expert_type))
    return keys

def create_admin_notification(
    type: str,
    title: str,
    message: str,
    severity: str,
    recipient_roles: List[str],
    route: str,
    target_id: Optional[str] = None,
    read_by: Optional[List[str]] = None,
    actor_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Safely creates and persists an administrative notification via get_admin_repo().
    Never throws exceptions to the caller.
    """
    try:
        if type not in VALID_TYPES:
            return None
        if severity not in VALID_SEVERITIES:
            return None
        if route not in VALID_ROUTES and not PATIENT_ROUTE.match(route):
            return None

        data = {
            "recipient_roles": list(recipient_roles),
            "type": type,
            "title": title,
            "message": message,
            "severity": severity,
            "route": route,
            "target_id": str(target_id) if target_id is not None else None,
            "read_by": list(read_by) if read_by else []
        }
        if resolve_uuid(actor_id):  # only a real profile id fits the column (not "admin" or a legacy id)
            data["actor_id"] = resolve_uuid(actor_id)

        created = get_admin_repo().create_admin_notification(data)
        # HL-041: open portal tabs refresh their bell straight away
        from app.services import live_events
        live_events.publish("notifications")
        return created
    except Exception as e:
        logger.error(f"Error creating admin notification: {e}")
        return None


def notify_experts(
    expert_types: List[str], type: str, title: str, message: str, route: str,
    actor_id: Optional[str] = None, target_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """HL-082: a notification for medical experts of these types. The person who caused it never sees it.
    Never raises, so it can't break the save that triggered it."""
    types = [t for t in expert_types if t in EXPERT_TYPES]
    if not types:
        return None
    return create_admin_notification(
        type=type, title=title, message=message, severity="info",
        recipient_roles=[expert_recipient(t) for t in types], route=route, target_id=target_id, actor_id=actor_id,
    )


def notify_waiting_content(kind: str, item: Optional[Dict[str, Any]], approver_id: Optional[str], actor_id: Optional[str]) -> None:
    """HL-082: a recipe or exercise saved by someone other than its approving expert waits for their approval
    (recipes.py / exercises.py _mark_review), so tell the Dietitians or Physical Therapists."""
    if not item or approver_id or item.get("expert_validated") or item.get("status") == "archived":
        return
    name = item.get("name") or item.get("title") or "Untitled"
    if kind == "recipe":
        notify_experts(["Dietitian"], "content", "Recipe waiting for approval",
                       f"\"{name}\" was added or changed and needs a Dietitian's approval before patients see it.",
                       "/foods", actor_id=actor_id, target_id=item.get("id"))
    else:
        notify_experts(["Physical Therapist"], "content", "Exercise waiting for approval",
                       f"\"{name}\" was added or changed and needs a Physical Therapist's approval before patients see it.",
                       "/exercises", actor_id=actor_id, target_id=item.get("id"))
