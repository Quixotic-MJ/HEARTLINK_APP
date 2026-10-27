# backend/app/db/repositories/premium.py
"""
Premium Repository Layer (HL-084): the plan settings (one row) and the history of Premium changes.
A patient's own plan lives on their profile (plan, premium_until, ...), written through the profile repository.
"""
from typing import Any, Dict, List, Optional
import logging
from app.db.repositories.base import handle_db_error

logger = logging.getLogger(__name__)

CONFIG_TABLE = "premium_config"
EVENTS_TABLE = "premium_events"

# Used when the settings row can't be read, so the pricing screen still has numbers (same as the migration's defaults)
DEFAULT_CONFIG = {"monthly_price_php": 99, "yearly_price_php": 899, "trial_days": 7, "checkout_enabled": True}


class PremiumRepository:
    def get_config(self) -> Dict[str, Any]:
        raise NotImplementedError

    def update_config(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def add_event(self, event: Dict[str, Any]) -> None:
        raise NotImplementedError

    def list_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        raise NotImplementedError


class SupabasePremiumRepository(PremiumRepository):
    def __init__(self, client):
        self.client = client

    def get_config(self) -> Dict[str, Any]:
        try:
            res = self.client.table(CONFIG_TABLE).select("*").eq("id", 1).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            handle_db_error(e)
        return dict(DEFAULT_CONFIG)

    def update_config(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(CONFIG_TABLE).upsert({"id": 1, **data}, on_conflict="id").execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def add_event(self, event: Dict[str, Any]) -> None:
        try:
            self.client.table(EVENTS_TABLE).insert(event).execute()
        except Exception as e:
            handle_db_error(e)

    def list_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            res = (self.client.table(EVENTS_TABLE).select("*")
                   .order("created_at", desc=True).limit(limit).execute())
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []
