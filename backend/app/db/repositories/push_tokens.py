# backend/app/db/repositories/push_tokens.py
"""
Push Tokens Repository Layer (HL-018): each phone's Expo push token.
"""
from typing import Dict, Iterable, List
import logging
from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

TABLE = "push_tokens"


class PushTokenRepository:
    def save(self, user_id: str, token: str, platform: str) -> None:
        raise NotImplementedError

    def disable(self, tokens: Iterable[str]) -> None:
        raise NotImplementedError

    def disable_for_user(self, user_id: str, token: str) -> None:
        raise NotImplementedError

    def list_active(self, user_ids: Iterable[str]) -> List[Dict[str, str]]:
        raise NotImplementedError


class SupabasePushTokenRepository(PushTokenRepository):
    def __init__(self, client):
        self.client = client

    def save(self, user_id: str, token: str, platform: str) -> None:
        """Saves or refreshes a token; a phone that signs in as someone else moves to that account."""
        try:
            now = utc_now().isoformat()
            self.client.table(TABLE).upsert(
                {"user_id": user_id, "token": token, "platform": platform, "last_seen_at": now, "disabled_at": None},
                on_conflict="token",
            ).execute()
        except Exception as e:
            handle_db_error(e)

    def disable(self, tokens: Iterable[str]) -> None:
        tokens = list(tokens)
        if not tokens:
            return
        try:
            self.client.table(TABLE).update({"disabled_at": utc_now().isoformat()}).in_("token", tokens).execute()
        except Exception as e:
            handle_db_error(e)

    def disable_for_user(self, user_id: str, token: str) -> None:
        """Sign-out: only the signed-in account can switch its own phone off."""
        try:
            (self.client.table(TABLE).update({"disabled_at": utc_now().isoformat()})
             .eq("user_id", user_id).eq("token", token).execute())
        except Exception as e:
            handle_db_error(e)

    def list_active(self, user_ids: Iterable[str]) -> List[Dict[str, str]]:
        user_ids = list(user_ids)
        if not user_ids:
            return []
        try:
            res = (self.client.table(TABLE).select("user_id, token")
                   .in_("user_id", user_ids).is_("disabled_at", "null").execute())
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []
