# backend/app/db/repositories/pending_registrations.py
"""
Pending Registrations Repository Layer (HL-046).
Sign-ups waiting for their verification code. Only a bcrypt hash of the password is stored, and
(HL-052) only a keyed hash of the one-time code, with a count of the tries made with it.
"""
from typing import Optional, Dict, Any
import logging
from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

TABLE = "pending_registrations"


class PendingRegistrationRepository:
    def save(self, phone: str, email: str, password_hash: str, expires_at: str, code_hash: str) -> None:
        raise NotImplementedError

    def get(self, phone: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def replace_code(self, phone: str, code_hash: str, expires_at: str) -> None:
        raise NotImplementedError

    def claim_attempt(self, phone: str, seen_attempts: int) -> bool:
        raise NotImplementedError

    def consume_code(self, phone: str, code_hash: str) -> bool:
        raise NotImplementedError

    def restore_code(self, phone: str, code_hash: str) -> None:
        raise NotImplementedError

    def delete(self, phone: str) -> None:
        raise NotImplementedError

    def delete_expired(self) -> None:
        raise NotImplementedError


class SupabasePendingRegistrationRepository(PendingRegistrationRepository):
    def __init__(self, client):
        self.client = client

    def save(self, phone: str, email: str, password_hash: str, expires_at: str, code_hash: str) -> None:
        # A new "Send code" for the same number replaces the old pending sign-up and its code
        try:
            self.client.table(TABLE).upsert({
                "phone": phone,
                "email": email,
                "password_hash": password_hash,
                "code_hash": code_hash,
                "attempts": 0,
                "expires_at": expires_at,
                "created_at": utc_now().isoformat(),
            }, on_conflict="phone").execute()
        except Exception as e:
            handle_db_error(e)

    def get(self, phone: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).select("*").eq("phone", phone).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def replace_code(self, phone: str, code_hash: str, expires_at: str) -> None:
        # HL-052: a resent code replaces the old one, which stops working, and the tries start again
        try:
            self.client.table(TABLE).update({
                "code_hash": code_hash,
                "attempts": 0,
                "expires_at": expires_at,
            }).eq("phone", phone).execute()
        except Exception as e:
            handle_db_error(e)

    def claim_attempt(self, phone: str, seen_attempts: int) -> bool:
        # Counts one try, only if nobody else counted one since it was read, so parallel requests
        # can't get more tries than allowed. False means another try got there first.
        try:
            res = self.client.table(TABLE).update({"attempts": seen_attempts + 1}) \
                .eq("phone", phone).eq("attempts", seen_attempts).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def consume_code(self, phone: str, code_hash: str) -> bool:
        # Marks the code used. Only one request can do this, so a code completes one sign-up at most.
        try:
            res = self.client.table(TABLE).update({"code_hash": None}) \
                .eq("phone", phone).eq("code_hash", code_hash).execute()
            return bool(res.data)
        except Exception as e:
            handle_db_error(e)
            return False

    def restore_code(self, phone: str, code_hash: str) -> None:
        # Creating the login failed in a way worth retrying, so the same code works once more
        try:
            self.client.table(TABLE).update({"code_hash": code_hash}) \
                .eq("phone", phone).is_("code_hash", "null").execute()
        except Exception as e:
            handle_db_error(e)

    def delete(self, phone: str) -> None:
        try:
            self.client.table(TABLE).delete().eq("phone", phone).execute()
        except Exception as e:
            handle_db_error(e)

    def delete_expired(self) -> None:
        # Housekeeping only: a failure here must never block a sign-up
        try:
            self.client.table(TABLE).delete().lt("expires_at", utc_now().isoformat()).execute()
        except Exception as e:
            logger.warning("Could not clean up expired pending sign-ups (%s)", type(e).__name__)
