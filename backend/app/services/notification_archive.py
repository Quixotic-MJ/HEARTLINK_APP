"""HL-019: notifications archive 72 hours after they're sent.

An hourly job marks old patient and portal notifications as archived. Lists also treat anything older
than 72 hours as archived, so a late or skipped job never shows an old one. Archived notifications are
left out of default lists and unread counts, and can still be listed on request.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.utils.time import parse_utc, utc_now

logger = logging.getLogger(__name__)

ARCHIVE_AFTER = timedelta(hours=72)
RUN_EVERY_SECONDS = 60 * 60
TABLES = ("patient_notifications", "admin_notifications")


def is_archived(notification: Dict[str, Any], now: Optional[datetime] = None) -> bool:
    if notification.get("archived_at"):
        return True
    created = parse_utc(notification.get("created_at"))
    return bool(created) and created < (now or utc_now()) - ARCHIVE_AFTER


def keep_active(notifications: List[Dict[str, Any]], include_archived: bool = False) -> List[Dict[str, Any]]:
    """Each notification marked with `archived`; archived ones dropped unless asked for."""
    now = utc_now()
    marked = [{**n, "archived": is_archived(n, now)} for n in notifications]
    return marked if include_archived else [n for n in marked if not n["archived"]]


def archive_old_notifications(client=None) -> Dict[str, int]:
    """Marks notifications older than 72 hours as archived. Returns how many per table."""
    if client is None:
        from app.db.client import get_supabase_client
        client = get_supabase_client()
    now = utc_now()
    cutoff = (now - ARCHIVE_AFTER).isoformat()
    done: Dict[str, int] = {}
    for table in TABLES:
        res = (
            client.table(table)
            .update({"archived_at": now.isoformat()})
            .is_("archived_at", "null")
            .lt("created_at", cutoff)
            .execute()
        )
        done[table] = len(res.data or [])
    return done


async def run_archive_job() -> None:
    """Runs for as long as the backend does: archive now, then every hour. A failed run is logged and retried."""
    while True:
        try:
            done = await asyncio.to_thread(archive_old_notifications)
            if any(done.values()):
                logger.info("Archived notifications: %s", done)
        except Exception as e:
            logger.warning("Notification archive run failed: %s", type(e).__name__)
        await asyncio.sleep(RUN_EVERY_SECONDS)
