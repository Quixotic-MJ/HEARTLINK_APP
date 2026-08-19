from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import uuid
import app.mock_db as mock_db

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
    Safely creates and persists an administrative notification in mock_db.admin_notifications.
    Never throws exceptions to the caller.
    """
    try:
        # Validate type
        if type not in VALID_TYPES:
            print(f"Warning: Invalid admin notification type: {type}")
            return None

        # Validate severity
        if severity not in VALID_SEVERITIES:
            print(f"Warning: Invalid admin notification severity: {severity}")
            return None

        # Validate route
        if route not in VALID_ROUTES:
            print(f"Warning: Invalid admin notification route: {route}")
            return None

        # Deduplication check for feedback tickets
        if type == "feedback" and target_id:
            existing = next(
                (n for n in mock_db.admin_notifications if n.get("type") == "feedback" and n.get("target_id") == str(target_id)),
                None
            )
            if existing:
                return existing

        # Deduplication check for security lockout (prevent spam if lockout notification created within 15m)
        if type == "security" and title == "Rate Limit Lockout":
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=15)
            existing_sec = next(
                (n for n in mock_db.admin_notifications 
                 if n.get("type") == "security" 
                 and n.get("title") == "Rate Limit Lockout"
                 and isinstance(n.get("created_at"), datetime)
                 and n["created_at"] >= cutoff),
                None
            )
            if existing_sec:
                return existing_sec

        # Construct notification record
        now = datetime.utcnow()
        record = {
            "id": f"anotif-{uuid.uuid4().hex[:8]}",
            "recipient_roles": list(recipient_roles),
            "type": type,
            "title": title,
            "message": message,
            "severity": severity,
            "read_by": list(read_by) if read_by else [],
            "route": route,
            "target_id": str(target_id) if target_id is not None else None,
            "created_at": now,
        }

        mock_db.admin_notifications.append(record)
        mock_db.save_logs()
        return record
    except Exception as e:
        print(f"Error creating admin notification: {e}")
        return None
