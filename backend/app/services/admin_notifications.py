# backend/app/services/admin_notifications.py
"""
Admin Notifications Service.
Routes notification creations to the admin repository layer.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from app.db.repositories import get_admin_repo

VALID_TYPES = {"feedback", "staff", "security", "system"}
VALID_SEVERITIES = {"info", "warning"}
VALID_ROUTES = {"/feedbacks", "/users", "/settings"}

def create_admin_notification(
    type: str,
    title: str,
    message: str,
    severity: str,
    recipient_roles: List[str],
    route: str,
    target_id: Optional[str] = None,
    read_by: Optional[List[str]] = None,
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
        if route not in VALID_ROUTES:
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

        return get_admin_repo().create_admin_notification(data)
    except Exception as e:
        print(f"Error creating admin notification: {e}")
        return None
