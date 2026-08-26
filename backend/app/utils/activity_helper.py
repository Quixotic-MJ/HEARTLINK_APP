# backend/app/utils/activity_helper.py
"""
Audit Activity Logging Helper.
Persists admin activity logs to Supabase admin_activity_logs.
"""
import uuid
import logging
from datetime import datetime
from app.db.repositories import get_admin_repo, get_profile_repo

logger = logging.getLogger(__name__)

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
