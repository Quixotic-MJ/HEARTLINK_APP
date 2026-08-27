# backend/app/db/repositories/baseline.py
"""
Baseline, Thresholds, Reminders & Care Team Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error, resolve_uuid, serialize_for_db

logger = logging.getLogger(__name__)

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
    def __init__(self):
        self._baselines: List[Dict[str, Any]] = []
        self._thresholds: List[Dict[str, Any]] = []
        self._reminders: List[Dict[str, Any]] = []
        self._care_team: List[Dict[str, Any]] = []

    def get_baseline(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next((o for o in self._baselines if o.get("user_id") == user_id), None)

    def save_baseline(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for entry in self._baselines:
            if entry.get("user_id") == user_id:
                entry.update(data)
                entry["updated_at"] = datetime.utcnow()
                return entry

        new_entry = {
            "id": f"onb-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        self._baselines.append(new_entry)
        return new_entry

    def get_thresholds(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next((t for t in self._thresholds if t.get("user_id") == user_id), None)

    def update_thresholds(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for t in self._thresholds:
            if t.get("user_id") == user_id:
                t.update(data)
                t["updated_at"] = datetime.utcnow()
                return t
        new_thresh = {
            "id": f"thresh-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "updated_at": datetime.utcnow()
        }
        self._thresholds.append(new_thresh)
        return new_thresh

    def get_reminders(self, user_id: str) -> Dict[str, Any]:
        for r in self._reminders:
            if r.get("user_id") == user_id:
                return r
        default = {
            "user_id": user_id,
            "morning": {"enabled": True, "time": "08:00"},
            "evening": {"enabled": False, "time": "20:00"},
            "activity": {"enabled": False, "time": "17:00"}
        }
        self._reminders.append(default)
        return default

    def update_reminders(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        for r in self._reminders:
            if r.get("user_id") == user_id:
                r["morning"] = data["morning"]
                r["evening"] = data["evening"]
                r["activity"] = data["activity"]
                return r
        new_r = {"user_id": user_id, **data}
        self._reminders.append(new_r)
        return new_r

    def list_care_team(self, user_id: str) -> List[Dict[str, Any]]:
        return [c for c in self._care_team if c.get("user_id") == user_id]

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
        self._care_team.append(new_c)
        return new_c

    def update_care_team_contact(self, user_id: str, contact_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for c in self._care_team:
            if c.get("id") == contact_id and c.get("user_id") == user_id:
                c.update(data)
                return c
        return None

    def delete_care_team_contact(self, user_id: str, contact_id: str) -> bool:
        initial = len(self._care_team)
        self._care_team[:] = [c for c in self._care_team if not (c.get("id") == contact_id and c.get("user_id") == user_id)]
        return len(self._care_team) < initial


class SupabaseBaselineRepository(BaselineRepository):
    def __init__(self, client):
        self.client = client

    def _resolve_user_uuid(self, user_id: str) -> Optional[str]:
        valid_uuid = resolve_uuid(user_id)
        if valid_uuid:
            return valid_uuid
        try:
            from app.db.repositories import get_profile_repo
            profile = get_profile_repo().get_by_id(user_id)
            if profile and profile.get("id"):
                return resolve_uuid(profile["id"])
        except Exception:
            pass
        return None

    def get_baseline(self, user_id: str) -> Optional[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return None
        try:
            res = self.client.table("baseline_onboarding").select("*").eq("user_id", uuid_val).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.warning(f"Error reading baseline for {user_id}: {e}")
            return None

    def save_baseline(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot save baseline: invalid or unknown user '{user_id}'")
        try:
            payload = serialize_for_db({**data, "user_id": uuid_val, "updated_at": datetime.utcnow().isoformat()})
            existing = self.get_baseline(uuid_val)
            if existing:
                res = self.client.table("baseline_onboarding").update(payload).eq("user_id", uuid_val).execute()
            else:
                payload["created_at"] = datetime.utcnow().isoformat()
                res = self.client.table("baseline_onboarding").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_thresholds(self, user_id: str) -> Optional[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return None
        try:
            res = self.client.table("user_thresholds").select("*").eq("user_id", uuid_val).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.warning(f"Error reading thresholds for {user_id}: {e}")
            return None

    def update_thresholds(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot update thresholds: invalid or unknown user '{user_id}'")
        try:
            payload = serialize_for_db({**data, "user_id": uuid_val, "updated_at": datetime.utcnow().isoformat()})
            existing = self.get_thresholds(uuid_val)
            if existing:
                res = self.client.table("user_thresholds").update(payload).eq("user_id", uuid_val).execute()
            else:
                res = self.client.table("user_thresholds").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_reminders(self, user_id: str) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        default = {
            "user_id": user_id,
            "morning": {"enabled": True, "time": "08:00"},
            "evening": {"enabled": False, "time": "20:00"},
            "activity": {"enabled": False, "time": "17:00"}
        }
        if not uuid_val:
            return default
        try:
            res = self.client.table("user_reminders").select("*").eq("user_id", uuid_val).execute()
            if res.data and len(res.data) > 0:
                row = res.data[0]
                return {
                    "user_id": user_id,
                    "morning": row.get("morning") or default["morning"],
                    "evening": row.get("evening") or default["evening"],
                    "activity": row.get("activity") or default["activity"]
                }
            return default
        except Exception as e:
            logger.warning(f"Error reading reminders for {user_id}: {e}")
            return default

    def update_reminders(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot update reminders: invalid or unknown user '{user_id}'")
        try:
            payload = {
                "user_id": uuid_val,
                "morning": data.get("morning"),
                "evening": data.get("evening"),
                "activity": data.get("activity"),
                "updated_at": datetime.utcnow().isoformat()
            }
            existing = self.client.table("user_reminders").select("id").eq("user_id", uuid_val).execute()
            if existing.data and len(existing.data) > 0:
                res = self.client.table("user_reminders").update(payload).eq("user_id", uuid_val).execute()
            else:
                res = self.client.table("user_reminders").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_care_team(self, user_id: str) -> List[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            return []
        try:
            res = self.client.table("care_team_contacts").select("*").eq("user_id", uuid_val).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Error reading care team for {user_id}: {e}")
            return []

    def add_care_team_contact(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        uuid_val = self._resolve_user_uuid(user_id)
        if not uuid_val:
            raise ValueError(f"Cannot add care team contact: invalid or unknown user '{user_id}'")
        try:
            payload = {
                "user_id": uuid_val,
                "contact_type": data.get("contact_type", "doctor"),
                "name": data.get("name", ""),
                "role_title": data.get("role_title", ""),
                "phone": data.get("phone", ""),
                "created_at": datetime.utcnow().isoformat()
            }
            res = self.client.table("care_team_contacts").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_care_team_contact(self, user_id: str, contact_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        uuid_val = self._resolve_user_uuid(user_id)
        valid_c_id = resolve_uuid(contact_id)
        if not uuid_val or not valid_c_id:
            return None
        try:
            payload = {k: v for k, v in data.items() if k not in ["id", "user_id", "created_at"]}
            res = self.client.table("care_team_contacts").update(payload).eq("id", valid_c_id).eq("user_id", uuid_val).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_care_team_contact(self, user_id: str, contact_id: str) -> bool:
        uuid_val = self._resolve_user_uuid(user_id)
        valid_c_id = resolve_uuid(contact_id)
        if not uuid_val or not valid_c_id:
            return False
        try:
            res = self.client.table("care_team_contacts").delete().eq("id", valid_c_id).eq("user_id", uuid_val).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
