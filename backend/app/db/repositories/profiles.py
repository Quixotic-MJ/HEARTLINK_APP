# backend/app/db/repositories/profiles.py
"""
Profile Repository Layer
Encapsulates all user profile operations across Mock and Supabase modes.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, date
import uuid
from app.db.repositories.base import handle_db_error, serialize_for_db
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.utils.phone import normalize_phone_for_storage


def _normalize_contact_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """Emails are stored lowercase and phones as +63.. so lookups can use exact matches."""
    out = dict(data)
    if isinstance(out.get("email"), str):
        out["email"] = out["email"].strip().lower()
    if "phone" in out:
        out["phone"] = normalize_phone_for_storage(out["phone"])
    return out

class ProfileRepository:
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def create_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.create(profile_data)

    def update(self, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def update_profile(self, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return self.update(user_id, data)

    def archive(self, user_id: str) -> bool:
        raise NotImplementedError

    def list_all(self, role_filter: Optional[str] = None, exclude_archived: bool = True) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def toggle_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class SupabaseProfileRepository(ProfileRepository):
    def __init__(self, client):
        self.client = client

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            try:
                uuid.UUID(str(user_id))
                res = self.client.table("profiles").select("*").eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except (ValueError, TypeError):
                pass

            res_legacy = self.client.table("profiles").select("*").eq("legacy_id", user_id).execute()
            if res_legacy.data and len(res_legacy.data) > 0:
                return res_legacy.data[0]
            return None
        except Exception as e:
            handle_db_error(e)
            return None

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        try:
            ident = identifier.strip()
            if "@" in ident:
                # Exact match: ilike would treat "_" and "%" in an email as wildcards
                res = self.client.table("profiles").select("*").eq("email", ident.lower()).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
                return None

            # Phones are stored as +63.. (migration 020); also try the raw input for anything older
            phone_variants = list(dict.fromkeys([normalize_phone_for_storage(ident), ident]))

            for pv in phone_variants:
                res = self.client.table("profiles").select("*").eq("phone", pv).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]

            return self.get_by_id(ident)
        except Exception as e:
            handle_db_error(e)
            return None

    def create(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            clean_data = serialize_for_db(_normalize_contact_fields({k: v for k, v in profile_data.items() if k not in ["password", "password_hash"]}))
            res = self.client.table("profiles").insert(clean_data).execute()
            return res.data[0] if res.data else clean_data
        except Exception as e:
            handle_db_error(e)
            return {}

    def update(self, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            clean_data = serialize_for_db(_normalize_contact_fields({k: v for k, v in data.items() if k not in ["password", "password_hash"]}))
            clean_data["updated_at"] = utc_now().isoformat()
            
            try:
                uuid.UUID(str(user_id))
                res = self.client.table("profiles").update(clean_data).eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except (ValueError, TypeError):
                pass

            res = self.client.table("profiles").update(clean_data).eq("legacy_id", user_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def archive(self, user_id: str) -> bool:
        try:
            from datetime import datetime, timezone
            update_data = {"account_status": "archived", "updated_at": utc_now().isoformat()}
            
            try:
                uuid.UUID(str(user_id))
                res = self.client.table("profiles").update(update_data).eq("id", user_id).select("id").execute()
                if res.data and len(res.data) > 0:
                    return True
            except (ValueError, TypeError):
                pass

            res = self.client.table("profiles").update(update_data).eq("legacy_id", user_id).select("id").execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_all(self, role_filter: Optional[str] = None, exclude_archived: bool = True) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("profiles").select("*")
            if role_filter:
                query = query.eq("role", role_filter)
            if exclude_archived:
                query = query.or_("account_status.neq.archived,account_status.is.null")
            res = query.order("created_at", desc=False).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def toggle_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        p = self.get_by_id(user_id)
        if not p:
            return None
        new_status = "disabled" if p.get("account_status", "active") == "active" else "active"
        return self.update(p["id"], {"account_status": new_status})
