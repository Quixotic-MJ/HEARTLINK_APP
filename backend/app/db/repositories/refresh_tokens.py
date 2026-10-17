# backend/app/db/repositories/refresh_tokens.py
"""
Refresh Tokens Repository Layer (HL-047).
Only SHA-256 hashes of refresh tokens are stored.
"""
from typing import Optional, Dict, Any
import logging
from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

TABLE = "refresh_tokens"


class RefreshTokenRepository:
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_by_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def revoke(self, token_id: str, reason: str) -> None:
        raise NotImplementedError

    def revoke_all_for_user(self, user_id: str, reason: str) -> None:
        raise NotImplementedError

    def delete_expired(self) -> None:
        raise NotImplementedError


class SupabaseRefreshTokenRepository(RefreshTokenRepository):
    def __init__(self, client):
        self.client = client

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.client.table(TABLE).insert(data).execute()
            return res.data[0] if res.data else data
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_by_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(TABLE).select("*").eq("token_hash", token_hash).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def revoke(self, token_id: str, reason: str) -> None:
        try:
            self.client.table(TABLE).update({
                "revoked_at": utc_now().isoformat(),
                "revoked_reason": reason,
            }).eq("id", token_id).is_("revoked_at", "null").execute()
        except Exception as e:
            handle_db_error(e)

    def revoke_all_for_user(self, user_id: str, reason: str) -> None:
        try:
            self.client.table(TABLE).update({
                "revoked_at": utc_now().isoformat(),
                "revoked_reason": reason,
            }).eq("user_id", user_id).is_("revoked_at", "null").execute()
        except Exception as e:
            handle_db_error(e)

    def delete_expired(self) -> None:
        # Housekeeping only: a failure here must never block a login
        try:
            self.client.table(TABLE).delete().lt("expires_at", utc_now().isoformat()).execute()
        except Exception as e:
            logger.warning("Could not clean up expired refresh tokens (%s)", type(e).__name__)
