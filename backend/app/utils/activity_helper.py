# backend/app/utils/activity_helper.py
import app.mock_db as mock_db
from datetime import datetime
import uuid

def record_admin_activity(
    admin_user_id: str,
    action: str,
    target_type: str,
    target_id: str = None,
    target_name: str = None
):
    try:
        # Resolve admin name from mock_db profiles
        admin_name = "System Admin"
        if admin_user_id:
            profile = next((p for p in mock_db.profiles if p.get("id") == admin_user_id), None)
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

        # Format record
        event = {
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "admin_user_id": admin_user_id,
            "admin_name": admin_name,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "target_name": target_name,
            "created_at": datetime.now()
        }

        # Keep the latest 100 events
        mock_db.admin_activity.append(event)
        if len(mock_db.admin_activity) > 100:
            mock_db.admin_activity[:] = mock_db.admin_activity[-100:]

        # Save to mock_logs.json
        mock_db.save_logs()
        return event
    except Exception as e:
        # Fail-safe print but do not propagate
        print(f"Error logging admin activity: {e}")
        return None
