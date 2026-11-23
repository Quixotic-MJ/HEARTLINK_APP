"""HL-163: a patient's steps from the phone (Health Connect): saving the week the app sends, the week for the Steps card,
and removing it all when step tracking is turned off. How brisk periods become minutes is in step_minutes.py."""
from __future__ import annotations

import zoneinfo
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List

from fastapi import HTTPException, status

from app.services import step_minutes
from app.utils.time import to_local_date, utc_now

LOCAL_TZ = zoneinfo.ZoneInfo("Asia/Manila")
OLDEST_DAYS = 14  # the app sends the last 7 days; older days are refused
WEEK_DAYS = 7
DEFAULT_GOAL = 7000


def _bad(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _day_bounds(day: date):
    start = datetime.combine(day, time.min, tzinfo=LOCAL_TZ)
    return start, start + timedelta(days=1)


def _clean_day(item: Dict[str, Any], today: date) -> Dict[str, Any]:
    day: date = item["day"]
    if day > today:
        raise _bad(f"{day} is in the future.")
    if day < today - timedelta(days=OLDEST_DAYS):
        raise _bad(f"{day} is too long ago.")
    day_start, day_end = _day_bounds(day)
    periods = []
    for start, end in item.get("brisk_periods") or []:
        if start.tzinfo is None or end.tzinfo is None:
            raise _bad("Each time needs its time zone.")
        if end <= start:
            raise _bad("A brisk period ends before it starts.")
        if start < day_start or end > day_end:
            raise _bad(f"A brisk period isn't on {day}.")
        periods.append([start.isoformat(), end.isoformat()])
    return {
        "day": day.isoformat(),
        "steps": int(item["steps"]),
        "brisk_periods": periods,
        "source": "health_connect",
        "synced_at": utc_now().isoformat(),
    }


def save_days(user_id: str, days: List[Dict[str, Any]]) -> None:
    """Replaces the days the app sent, then updates the Habit score."""
    from app.db.repositories import get_step_days_repo
    from app.services.heart_score import try_recalculate

    today = to_local_date(utc_now())
    seen = set()
    rows = []
    for item in days:
        row = _clean_day(item, today)
        if row["day"] in seen:
            raise _bad(f"{row['day']} was sent twice.")
        seen.add(row["day"])
        rows.append(row)
    get_step_days_repo().save_days(user_id, rows)
    try_recalculate(user_id, "steps")


def delete_all(user_id: str) -> None:
    """Step tracking turned off: the steps go, and the score goes back to logged exercise only."""
    from app.db.repositories import get_step_days_repo
    from app.services.heart_score import try_recalculate

    get_step_days_repo().delete_all(user_id)
    try_recalculate(user_id, "steps_removed")


def week_for(user_id: str) -> Dict[str, Any]:
    """The last 7 days for the Steps card: steps, and brisk minutes as the score counts them."""
    from app.db.repositories import get_baseline_repo, get_exercises_repo

    today = to_local_date(utc_now())
    rows = step_minutes.load_step_days(user_id, days=WEEK_DAYS)
    exercise_logs = get_exercises_repo().list_user_logs(user_id) if rows else []
    brisk = step_minutes.brisk_minutes_by_day(rows, exercise_logs)
    steps = step_minutes.steps_by_day(rows)

    thresholds = get_baseline_repo().get_thresholds(user_id) or {}
    synced = [r.get("synced_at") for r in rows if r.get("synced_at")]
    days = []
    for i in range(WEEK_DAYS - 1, -1, -1):
        day = today - timedelta(days=i)
        days.append({
            "day": day.isoformat(),
            "steps": steps.get(day, 0),
            "brisk_minutes": round(brisk.get(day, 0.0)),
            "synced": day in steps,
        })
    return {
        "days": days,
        "goal": thresholds.get("daily_steps_goal") or DEFAULT_GOAL,
        "last_synced_at": max(synced) if synced else None,
    }
