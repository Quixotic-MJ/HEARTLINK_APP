# backend/app/db/repositories/profiles.py
"""
Profile Repository Layer
Encapsulates all user profile operations across Mock and Supabase modes.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, date
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error, serialize_for_db

class ProfileRepository:
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update(self, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def delete(self, user_id: str) -> bool:
        raise NotImplementedError

    def list_all(self, role_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def toggle_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class MockProfileRepository(ProfileRepository):
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next((p for p in mock_db.profiles if p.get("id") == user_id or p.get("legacy_id") == user_id), None)

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        import re
        ident = identifier.strip()
        if "@" in ident:
            return next((p for p in mock_db.profiles if p.get("email", "").lower() == ident.lower()), None)
        
        # Phone normalization
        cleaned_phone = re.sub(r"[\s\-\(\)\.]", "", ident)
        phone_variants = {ident, cleaned_phone}
        if cleaned_phone.startswith("+63"):
            phone_variants.add(cleaned_phone[1:])  # 639...
            phone_variants.add("0" + cleaned_phone[3:])  # 09...
        elif cleaned_phone.startswith("63"):
            phone_variants.add("+" + cleaned_phone)
            phone_variants.add("0" + cleaned_phone[2:])
        elif cleaned_phone.startswith("09"):
            phone_variants.add("+63" + cleaned_phone[1:])
            phone_variants.add("63" + cleaned_phone[1:])

        for p in mock_db.profiles:
            p_phone = re.sub(r"[\s\-\(\)\.]", "", p.get("phone", "") or "")
            if p.get("email", "").lower() == ident.lower() or p.get("id") == ident or p.get("legacy_id") == ident:
                return p
            if p_phone and p_phone in phone_variants:
                return p
        return None

    def create(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        mock_db.profiles.append(profile_data)
        mock_db.save_profiles()
        return profile_data

    def update(self, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for p in mock_db.profiles:
            if p.get("id") == user_id or p.get("legacy_id") == user_id:
                p.update(data)
                p["updated_at"] = datetime.utcnow()
                mock_db.save_profiles()
                return p
        return None

    def delete(self, user_id: str) -> bool:
        initial = len(mock_db.profiles)
        mock_db.profiles[:] = [p for p in mock_db.profiles if not (p.get("id") == user_id or p.get("legacy_id") == user_id)]
        if len(mock_db.profiles) < initial:
            mock_db.save_profiles()
            return True
        return False

    def list_all(self, role_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        if role_filter:
            return [p for p in mock_db.profiles if p.get("role") == role_filter]
        return list(mock_db.profiles)

    def toggle_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        p = self.get_by_id(user_id)
        if not p:
            return None
        new_status = "disabled" if p.get("account_status", "active") == "active" else "active"
        p["account_status"] = new_status
        p["updated_at"] = datetime.utcnow()
        mock_db.save_profiles()
        return p


class SupabaseProfileRepository(ProfileRepository):
    def __init__(self, client):
        self.client = client

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        import uuid
        try:
            # Only query id if user_id is a valid UUID
            try:
                uuid.UUID(str(user_id))
                res = self.client.table("profiles").select("*").eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except (ValueError, TypeError):
                pass

            # Fallback check legacy_id
            res_legacy = self.client.table("profiles").select("*").eq("legacy_id", user_id).execute()
            if res_legacy.data and len(res_legacy.data) > 0:
                return res_legacy.data[0]
            return None
        except Exception as e:
            handle_db_error(e)
            return None

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        import re
        try:
            ident = identifier.strip()
            if "@" in ident:
                res = self.client.table("profiles").select("*").ilike("email", ident).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
                return None

            # Phone normalization
            cleaned_phone = re.sub(r"[\s\-\(\)\.]", "", ident)
            phone_variants = [ident, cleaned_phone]
            if cleaned_phone.startswith("+63"):
                phone_variants.append(cleaned_phone[1:])  # 639...
                phone_variants.append("0" + cleaned_phone[3:])  # 09...
            elif cleaned_phone.startswith("63"):
                phone_variants.append("+" + cleaned_phone)
                phone_variants.append("0" + cleaned_phone[2:])
            elif cleaned_phone.startswith("09"):
                phone_variants.append("+63" + cleaned_phone[1:])
                phone_variants.append("63" + cleaned_phone[1:])

            for pv in phone_variants:
                res = self.client.table("profiles").select("*").eq("phone", pv).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]

            # Fallback UUID / legacy_id check
            return self.get_by_id(ident)
        except Exception as e:
            handle_db_error(e)
            return None

    def create(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            from app.db.repositories.base import serialize_for_db
            clean_data = serialize_for_db({k: v for k, v in profile_data.items() if k not in ["password", "password_hash"]})
            res = self.client.table("profiles").insert(clean_data).execute()
            return res.data[0] if res.data else clean_data
        except Exception as e:
            handle_db_error(e)
            return {}

    def update(self, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            from app.db.repositories.base import serialize_for_db
            clean_data = serialize_for_db({k: v for k, v in data.items() if k not in ["password", "password_hash"]})
            clean_data["updated_at"] = datetime.utcnow().isoformat()
            
            # Check if user_id is a valid UUID
            try:
                uuid.UUID(str(user_id))
                res = self.client.table("profiles").update(clean_data).eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except (ValueError, TypeError):
                pass

            # Try update by legacy_id
            res = self.client.table("profiles").update(clean_data).eq("legacy_id", user_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete(self, user_id: str) -> bool:
        try:
            res = self.client.table("profiles").delete().eq("id", user_id).execute()
            if not res.data:
                res = self.client.table("profiles").delete().eq("legacy_id", user_id).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_all(self, role_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("profiles").select("*")
            if role_filter:
                query = query.eq("role", role_filter)
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
