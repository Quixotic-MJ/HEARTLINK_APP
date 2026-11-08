# backend/app/utils/activity_helper.py
"""
Audit Activity Logging Helper.
Persists admin activity logs to Supabase admin_activity_logs.
"""
import uuid
import logging
from datetime import datetime
from app.db.repositories import get_admin_repo, get_profile_repo
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN

logger = logging.getLogger(__name__)

PORTAL_ACTIVITY_TYPES = {"user", "staff", "account", "recipe", "exercise", "broadcast", "feedback", "premium", "system"}
PORTAL_ACTIVITY_FIELDS = ("id", "admin_user_id", "admin_name", "action", "target_type", "target_id", "target_name", "created_at")


def portal_activity(entry: dict):
    """Project known operational events; never echo historical free-text clinical actions."""
    category = entry.get("target_type")
    if category not in PORTAL_ACTIVITY_TYPES:
        return None
    raw = str(entry.get("action") or "").strip().lower()
    action = raw if raw in {"created", "updated", "published", "unpublished", "archived", "restored", "approved", "changes_requested", "deleted", "submitted", "reviewed", "changed password", "deleted account", "removed premium"} else None
    if category in {"user", "staff", "account"}:
        for prefix, label in (("created ", "created account"), ("disabled ", "disabled account"), ("activated ", "activated account"), ("enabled ", "enabled account"), ("changed staff role ", "changed staff role"), ("deleted ", "deleted account"), ("gave premium for ", "changed Premium access")):
            if raw.startswith(prefix):
                action = label
                break
    elif category == "system" and raw.startswith("exported the activity log"):
        action = "exported activity log"
    elif category == "premium" and raw.startswith("updated premium settings"):
        action = "updated Premium settings"
    elif category == "broadcast" and raw == "published an announcement":
        action = "published"
    if not action:
        return None
    return {**{field: entry.get(field) for field in PORTAL_ACTIVITY_FIELDS}, "action": action}

def record_admin_activity(
    admin_user_id: str,
    action: str,
    target_type: str,
    target_id: str = None,
    target_name: str = None
):
    try:
        admin_name = "System Admin"
        if admin_user_id:
            profile = get_profile_repo().get_by_id(admin_user_id)
            if profile:
                first = profile.get("first_name", "")
                last = profile.get("last_name", "")
                full_name = f"{first} {last}".strip()
                if full_name:
                    admin_name = full_name
                else:
                    admin_name = profile.get("email") or admin_user_id
            else:
                admin_name = admin_user_id

        event = {
            "admin_user_id": admin_user_id,
            "admin_name": admin_name,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "target_name": target_name
        }

        return get_admin_repo().record_activity(event)
    except Exception as e:
        logger.warning(f"Error logging admin activity: {e}")
        return None
