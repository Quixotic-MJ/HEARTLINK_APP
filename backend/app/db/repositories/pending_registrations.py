# backend/app/db/repositories/pending_registrations.py
"""
Pending Registrations Repository Layer (HL-046).
Sign-ups waiting for their verification code. Only a bcrypt hash of the password is stored.
"""
from typing import Optional, Dict, Any
import logging
from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

TABLE = "pending_registrations"


class PendingRegistrationRepository:
    def save(self, phone: str, email: str, password_hash: str, expires_at: str) -> None:
        raise NotImplementedError

    def get(self, phone: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def extend(self, phone: str, expires_at: str) -> None:
        raise NotImplementedError

    def delete(self, phone: str) -> None:
        raise NotImplementedError

    def delete_expired(self) -> None:
        raise NotImplementedError


class SupabasePendingRegistrationRepository(PendingRegistrationRepository):
    def __init__(self, client):
        self.client = client

    def save(self, phone: str, email: str, password_hash: str, expires_at: str) -> None:
        # A new "Send code" for the same number replaces the old pending sign-up
        try:
            self.client.table(TABLE).upsert({
                "phone": phone,
                "email": email,
                "password_hash": password_hash,
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

    def extend(self, phone: str, expires_at: str) -> None:
        try:
            self.client.table(TABLE).update({"expires_at": expires_at}).eq("phone", phone).execute()
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
