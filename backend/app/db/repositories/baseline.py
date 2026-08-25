# backend/app/db/repositories/baseline.py
"""
Baseline, Thresholds, Reminders & Care Team Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

class BaselineRepository:
    def get_baseline(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def save_baseline(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_thresholds(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def update_thresholds(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_reminders(self, user_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    def update_reminders(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_care_team(self, user_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def add_care_team_contact(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_care_team_contact(self, user_id: str, contact_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def delete_care_team_contact(self, user_id: str, contact_id: str) -> bool:
        raise NotImplementedError


class MockBaselineRepository(BaselineRepository):
    def get_baseline(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next((o for o in getattr(mock_db, 'baseline_onboarding', []) if o.get("user_id") == user_id), None)

    def save_baseline(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for entry in getattr(mock_db, 'baseline_onboarding', []):
            if entry.get("user_id") == user_id:
                entry.update(data)
                entry["updated_at"] = datetime.utcnow()
                mock_db.save_profiles()
                return entry

        new_entry = {
            "id": f"onb-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        mock_db.baseline_onboarding.append(new_entry)
        mock_db.save_profiles()
        return new_entry

    def get_thresholds(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next((t for t in getattr(mock_db, 'user_thresholds', []) if t.get("user_id") == user_id), None)

    def update_thresholds(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for t in getattr(mock_db, 'user_thresholds', []):
            if t.get("user_id") == user_id:
                t.update(data)
                t["updated_at"] = datetime.utcnow()
                mock_db.save_profiles()
                return t
        new_thresh = {
            "id": f"thresh-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "updated_at": datetime.utcnow()
        }
        mock_db.user_thresholds.append(new_thresh)
        mock_db.save_profiles()
        return new_thresh

    def get_reminders(self, user_id: str) -> Dict[str, Any]:
        for r in getattr(mock_db, 'user_reminders', []):
            if r.get("user_id") == user_id:
                return r
        default = {
            "user_id": user_id,
            "morning": {"enabled": True, "time": "08:00"},
            "evening": {"enabled": False, "time": "20:00"},
            "activity": {"enabled": False, "time": "17:00"}
        }
        mock_db.user_reminders.append(default)
        mock_db.save_profiles()
        return default

    def update_reminders(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for r in getattr(mock_db, 'user_reminders', []):
            if r.get("user_id") == user_id:
                r["morning"] = data["morning"]
                r["evening"] = data["evening"]
                r["activity"] = data["activity"]
                mock_db.save_profiles()
                return r
        new_r = {"user_id": user_id, **data}
        mock_db.user_reminders.append(new_r)
        mock_db.save_profiles()
        return new_r

    def list_care_team(self, user_id: str) -> List[Dict[str, Any]]:
        return [c for c in getattr(mock_db, 'care_team_contacts', []) if c.get("user_id") == user_id]

    def add_care_team_contact(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        new_c = {
            "id": f"team-contacts-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "contact_type": data.get("contact_type", "doctor"),
            "name": data.get("name", ""),
            "role_title": data.get("role_title", ""),
            "phone": data.get("phone", ""),
            "created_at": datetime.utcnow()
        }
        mock_db.care_team_contacts.append(new_c)
        mock_db.save_profiles()
        return new_c

    def update_care_team_contact(self, user_id: str, contact_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for c in getattr(mock_db, 'care_team_contacts', []):
            if c.get("id") == contact_id and c.get("user_id") == user_id:
                c.update(data)
                mock_db.save_profiles()
                return c
        return None

    def delete_care_team_contact(self, user_id: str, contact_id: str) -> bool:
        initial = len(mock_db.care_team_contacts)
        mock_db.care_team_contacts[:] = [c for c in mock_db.care_team_contacts if not (c.get("id") == contact_id and c.get("user_id") == user_id)]
        if len(mock_db.care_team_contacts) < initial:
            mock_db.save_profiles()
            return True
        return False


class SupabaseBaselineRepository(BaselineRepository):
    def __init__(self, client):
        self.client = client

    def get_baseline(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("baseline_onboarding").select("*").eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def save_baseline(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            from app.db.repositories.base import serialize_for_db
            payload = serialize_for_db({**data, "user_id": user_id, "updated_at": datetime.utcnow().isoformat()})
            existing = self.get_baseline(user_id)
            if existing:
                res = self.client.table("baseline_onboarding").update(payload).eq("user_id", user_id).execute()
            else:
                payload["created_at"] = datetime.utcnow().isoformat()
                res = self.client.table("baseline_onboarding").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_thresholds(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("user_thresholds").select("*").eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def update_thresholds(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {**data, "user_id": user_id, "updated_at": datetime.utcnow().isoformat()}
            existing = self.get_thresholds(user_id)
            if existing:
                res = self.client.table("user_thresholds").update(payload).eq("user_id", user_id).execute()
            else:
                res = self.client.table("user_thresholds").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_reminders(self, user_id: str) -> Dict[str, Any]:
        try:
            res = self.client.table("user_reminders").select("*").eq("user_id", user_id).execute()
            if res.data:
                return res.data[0]
            default = {
                "user_id": user_id,
                "morning": {"enabled": True, "time": "08:00"},
                "evening": {"enabled": False, "time": "20:00"},
                "activity": {"enabled": False, "time": "17:00"}
            }
            self.client.table("user_reminders").insert(default).execute()
            return default
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_reminders(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {**data, "user_id": user_id, "updated_at": datetime.utcnow().isoformat()}
            res = self.client.table("user_reminders").update(payload).eq("user_id", user_id).execute()
            if not res.data:
                res = self.client.table("user_reminders").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_care_team(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("care_team_contacts").select("*").eq("user_id", user_id).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def add_care_team_contact(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {**data, "user_id": user_id, "created_at": datetime.utcnow().isoformat()}
            res = self.client.table("care_team_contacts").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_care_team_contact(self, user_id: str, contact_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("care_team_contacts").update(data).eq("id", contact_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_care_team_contact(self, user_id: str, contact_id: str) -> bool:
        try:
            res = self.client.table("care_team_contacts").delete().eq("id", contact_id).eq("user_id", user_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
