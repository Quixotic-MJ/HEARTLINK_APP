# backend/app/db/repositories/family.py
"""
Family sharing Repository Layer (HL-087): one-time invite codes and the links between a patient and the family members
who follow them. Ids here are profile UUIDs (app/services/family.py resolves them from the profile first).
"""
from typing import Any, Dict, List, Optional
import logging
from app.db.repositories.base import handle_db_error

logger = logging.getLogger(__name__)

INVITES_TABLE = "family_invites"
LINKS_TABLE = "family_links"


class FamilyRepository:
    def cancel_open_invites(self, patient_id: str, now: str) -> None:
        raise NotImplementedError

    def create_invite(self, patient_id: str, code: str, expires_at: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_open_invite(self, patient_id: str, now: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_invite_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def use_invite(self, invite_id: str, follower_id: str, now: str) -> bool:
        raise NotImplementedError

    def list_followers(self, patient_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_following(self, follower_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_link(self, patient_id: str, follower_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def add_link(self, patient_id: str, follower_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def delete_link(self, patient_id: str, follower_id: str) -> bool:
        raise NotImplementedError


class SupabaseFamilyRepository(FamilyRepository):
    def __init__(self, client):
        self.client = client

    def cancel_open_invites(self, patient_id: str, now: str) -> None:
        try:
            (self.client.table(INVITES_TABLE).update({"cancelled_at": now})
             .eq("patient_id", patient_id).is_("used_at", "null").is_("cancelled_at", "null").execute())
        except Exception as e:
            handle_db_error(e)

    def create_invite(self, patient_id: str, code: str, expires_at: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(INVITES_TABLE).insert(
                {"patient_id": patient_id, "code": code, "expires_at": expires_at}).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            # a clash with an existing code: the service tries another one
            logger.warning("Couldn't save a family invite (%s)", type(e).__name__)
            return None

    def get_open_invite(self, patient_id: str, now: str) -> Optional[Dict[str, Any]]:
        try:
            res = (self.client.table(INVITES_TABLE).select("*").eq("patient_id", patient_id)
                   .is_("used_at", "null").is_("cancelled_at", "null").gt("expires_at", now)
                   .order("created_at", desc=True).limit(1).execute())
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def get_invite_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(INVITES_TABLE).select("*").eq("code", code).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def use_invite(self, invite_id: str, follower_id: str, now: str) -> bool:
        """Marks the code used, only if nobody used it first (two people entering it at once get one link)."""
        try:
            res = (self.client.table(INVITES_TABLE).update({"used_at": now, "used_by": follower_id})
                   .eq("id", invite_id).is_("used_at", "null").is_("cancelled_at", "null").execute())
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def list_followers(self, patient_id: str) -> List[Dict[str, Any]]:
        try:
            res = (self.client.table(LINKS_TABLE).select("*").eq("patient_id", patient_id)
                   .order("created_at").execute())
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def list_following(self, follower_id: str) -> List[Dict[str, Any]]:
        try:
            res = (self.client.table(LINKS_TABLE).select("*").eq("follower_id", follower_id)
                   .order("created_at").execute())
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get_link(self, patient_id: str, follower_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = (self.client.table(LINKS_TABLE).select("*").eq("patient_id", patient_id)
                   .eq("follower_id", follower_id).limit(1).execute())
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def add_link(self, patient_id: str, follower_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(LINKS_TABLE).upsert(
                {"patient_id": patient_id, "follower_id": follower_id}, on_conflict="patient_id,follower_id").execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def delete_link(self, patient_id: str, follower_id: str) -> bool:
        try:
            res = (self.client.table(LINKS_TABLE).delete().eq("patient_id", patient_id)
                   .eq("follower_id", follower_id).execute())
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False
