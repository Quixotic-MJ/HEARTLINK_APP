# backend/app/db/repositories/password_resets.py
"""
Password reset codes (migration 052): one live code per account, stored only as a keyed hash, with a count of
wrong tries. Works like pending_registrations (the sign-up code).
"""
from typing import Optional, Dict, Any
import logging
from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

TABLE = "password_resets"


class PasswordResetRepository:
    def save(self, user_id: str, code_hash: str, expires_at: str) -> None:
        raise NotImplementedError

    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def claim_attempt(self, user_id: str, seen_attempts: int) -> bool:
        raise NotImplementedError

    def consume_code(self, user_id: str, code_hash: str) -> bool:
        raise NotImplementedError

    def restore_code(self, user_id: str, code_hash: str) -> None:
        raise NotImplementedError

    def delete(self, user_id: str) -> None:
        raise NotImplementedError

    def delete_expired(self) -> None:
        raise NotImplementedError


class SupabasePasswordResetRepository(PasswordResetRepository):
    def __init__(self, client):
        self.client = client

    def save(self, user_id: str, code_hash: str, expires_at: str) -> None:
        # A new code replaces the old one, which stops working, and the tries start again
        try:
            self.client.table(TABLE).upsert({
                "user_id": user_id,
                "code_hash": code_hash,
                "attempts": 0,
                "expires_at": expires_at,
                "created_at": utc_now().isoformat(),
            }, on_conflict="user_id").execute()
        except Exception as e:
            handle_db_error(e)

    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).select("*").eq("user_id", user_id).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def claim_attempt(self, user_id: str, seen_attempts: int) -> bool:
        # Counts one try, only if nobody else counted one since it was read, so parallel requests
        # can't get more tries than allowed
        try:
            res = self.client.table(TABLE).update({"attempts": seen_attempts + 1}) \
                .eq("user_id", user_id).eq("attempts", seen_attempts).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def consume_code(self, user_id: str, code_hash: str) -> bool:
        # Marks the code used. Only one request can do this, so a code changes the password once at most.
        try:
            res = self.client.table(TABLE).update({"code_hash": None}) \
                .eq("user_id", user_id).eq("code_hash", code_hash).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def restore_code(self, user_id: str, code_hash: str) -> None:
        # Changing the password failed, so the same code works once more
        try:
            self.client.table(TABLE).update({"code_hash": code_hash}) \
                .eq("user_id", user_id).is_("code_hash", "null").execute()
        except Exception as e:
            handle_db_error(e)

    def delete(self, user_id: str) -> None:
        try:
            self.client.table(TABLE).delete().eq("user_id", user_id).execute()
        except Exception as e:
            handle_db_error(e)

    def delete_expired(self) -> None:
        # Housekeeping only: a failure here must never block a reset
        try:
            self.client.table(TABLE).delete().lt("expires_at", utc_now().isoformat()).execute()
        except Exception as e:
            logger.warning("Could not clean up expired password reset codes (%s)", type(e).__name__)
