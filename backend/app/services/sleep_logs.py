from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from app.db.repositories import get_sleep_repo
from app.utils.time import parse_utc

LOCAL_TZ = "Asia/Manila"
RECENT_LOGS = 50  # the overlap check only needs the last few nights


def get_sleep_logs(user_id: str) -> List[Dict[str, Any]]:
    return get_sleep_repo().list_user_logs(user_id)

def delete_sleep_log(user_id: str, log_id: str) -> bool:
    return get_sleep_repo().delete_log(user_id, log_id)

def create_sleep_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return get_sleep_repo().create_log(user_id, data)


# ── 2026-11-19: the same night can't be logged twice ──────────────────────────────────────────────────────────────
# Sleep logs on one day add up, so a nap counts. Logging the same night again counted it twice (7.5 hours became 15,
# scored as too much sleep), and the app has no way to delete a sleep log yet. A log whose times overlap one already
# saved is refused; a nap at another time still adds up.


def overlapping_log(bedtime: Any, wake_time: Any, existing: Iterable[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The saved log whose sleep overlaps bedtime to wake_time, or None. Logs without both times are skipped, and
    sleep that only touches (one ends as the other starts) doesn't count as overlapping."""
    start, end = parse_utc(bedtime), parse_utc(wake_time)
    if not start or not end or end <= start:
        return None
    for log in existing:
        if log.get("is_deleted"):
            continue
        s, e = parse_utc(log.get("bedtime")), parse_utc(log.get("wake_time"))
        if s and e and start < e and s < end:
            return log
    return None


def _clock(dt: datetime) -> str:
    import zoneinfo

    local = dt.astimezone(zoneinfo.ZoneInfo(LOCAL_TZ))
    return local.strftime("%I:%M %p").lstrip("0")


def overlap_message(log: Dict[str, Any]) -> str:
    """What the patient reads when a new log overlaps a saved one."""
    start, end = parse_utc(log.get("bedtime")), parse_utc(log.get("wake_time"))
    if start and end:
        return f"You already logged sleep from {_clock(start)} to {_clock(end)}. A nap at another time can still be added."
    return "You already logged sleep for this time."


def find_overlap(user_id: str, bedtime: Any, wake_time: Any) -> Optional[Dict[str, Any]]:
    return overlapping_log(bedtime, wake_time, get_sleep_repo().list_user_logs(user_id, limit=RECENT_LOGS))
