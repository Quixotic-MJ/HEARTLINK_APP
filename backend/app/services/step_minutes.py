"""HL-163: movement minutes from the phone's step counts (Health Connect).

The Habit score's activity area follows the AHA Life's Essential 8 table, which scores minutes of moderate or vigorous
activity a week, not steps. So the day's step total is only shown, and only brisk walking counts: a stretch walked at
100 or more steps a minute counts as moderate-intensity minutes (Tudor-Locke et al., CADENCE-Adults, 2019-2020: about
100 steps a minute is the moderate-intensity threshold for adults).

The phone works out which stretches were brisk and sends them as [start, end] periods (stepTracker.ts). Here they become
minutes per day, leaving out any part that overlaps an exercise logged in the app, so a logged walk is never counted twice.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple

from app.utils.time import parse_utc

BRISK_STEPS_PER_MINUTE = 100
DAY_MINUTES_CAP = 1440

Span = Tuple[datetime, datetime]


def _alive(row: Dict[str, Any]) -> bool:
    return not row.get("deleted_at") and not row.get("is_deleted", False)


def _merge(spans: Iterable[Span]) -> List[Span]:
    """Joins overlapping spans, so a stretch counted by both a phone and a watch is counted once."""
    merged: List[Span] = []
    for start, end in sorted(s for s in spans if s[1] > s[0]):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


def exercise_spans(exercise_logs: List[Dict[str, Any]]) -> List[Span]:
    """When each logged exercise ran. `logged_at` is saved when the session ends, so it runs back from there."""
    spans = []
    for e in exercise_logs:
        if not _alive(e) or e.get("status", "completed") == "abandoned":
            continue
        end = parse_utc(e.get("logged_at"))
        minutes = e.get("duration_minutes") or (e.get("duration_seconds") or 0) / 60
        if end and minutes:
            spans.append((end - timedelta(minutes=float(minutes)), end))
    return _merge(spans)


def brisk_periods(row: Dict[str, Any]) -> List[Span]:
    """A day's brisk periods as times; anything that can't be read is left out."""
    spans = []
    for period in row.get("brisk_periods") or []:
        if not isinstance(period, (list, tuple)) or len(period) != 2:
            continue
        start, end = parse_utc(period[0]), parse_utc(period[1])
        if start and end:
            spans.append((start, end))
    return _merge(spans)


def _overlap_minutes(span: Span, others: List[Span]) -> float:
    start, end = span
    total = 0.0
    for o_start, o_end in others:
        lo, hi = max(start, o_start), min(end, o_end)
        if hi > lo:
            total += (hi - lo).total_seconds() / 60
    return total


def _day_of(row: Dict[str, Any]) -> Optional[date]:
    value = row.get("day")
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def brisk_minutes_by_day(step_days: List[Dict[str, Any]], exercise_logs: List[Dict[str, Any]]) -> Dict[date, float]:
    """Brisk minutes for each day the phone sent, minus the time already logged as an exercise."""
    logged = exercise_spans(exercise_logs or [])
    result: Dict[date, float] = {}
    for row in step_days or []:
        day = _day_of(row)
        if day is None:
            continue
        minutes = 0.0
        for span in brisk_periods(row):
            length = (span[1] - span[0]).total_seconds() / 60
            minutes += max(0.0, length - _overlap_minutes(span, logged))
        result[day] = min(result.get(day, 0.0) + minutes, DAY_MINUTES_CAP)
    return result


def steps_by_day(step_days: List[Dict[str, Any]]) -> Dict[date, int]:
    result: Dict[date, int] = {}
    for row in step_days or []:
        day = _day_of(row)
        if day is not None:
            result[day] = int(row.get("steps") or 0)
    return result


def load_step_days(user_id: str, days: int = 8) -> List[Dict[str, Any]]:
    """The last few days of steps. If they can't be read (or the table isn't there yet), the rest still works."""
    import logging

    from app.db.repositories import get_step_days_repo
    from app.utils.time import to_local_date, utc_now

    today = to_local_date(utc_now())
    try:
        return get_step_days_repo().list(user_id, (today - timedelta(days=days)).isoformat(), today.isoformat())
    except Exception as e:
        logging.getLogger(__name__).warning("Step days unavailable (%s)", type(e).__name__)
        return []
