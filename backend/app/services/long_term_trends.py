"""
HL-086: long-term Trends (Premium). The last 90 days by week or the last year by month, this month against the one
before, blood pressure by time of day, and pattern notes ("on average, your top number the next day was ...").

Like the report (app/services/health_report.py) it only summarises what the patient logged, in Manila time. Pattern
notes need at least PATTERN_MIN_DAYS days in each group, are worded "on average" and never claim a cause or a diagnosis.
"""
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.services.health_report import TZ, _avg, _day, _live, _local, _number
from app.utils.time import to_local_date, utc_now

LONG_TERM_DAYS = (90, 365)
WEEKS = 13  # 90 days by week: 13 weeks ending today
MONTHS = 12  # a year by month: this month and the 11 before
PATTERN_MIN_DAYS = 5
SAME = 3  # a difference this small (mmHg) is "about the same"
DISCLAIMER = "Patterns show what tends to happen together in your logs, not what causes it. They aren't a diagnosis."

TIMES_OF_DAY = (
    ("morning", "Morning", "5 to 11 AM", 5, 11),
    ("afternoon", "Afternoon", "11 AM to 5 PM", 11, 17),
    ("evening", "Evening", "5 to 10 PM", 17, 22),
    ("night", "Night", "10 PM to 5 AM", 22, 5),
)

Reading = Tuple[datetime, float, float]


def _buckets(today: date, days: int) -> List[Tuple[str, date, date]]:
    """(label, first day, last day), oldest first: weeks ending today for 90 days, calendar months for a year."""
    if days == 90:
        out = []
        for i in range(WEEKS - 1, -1, -1):
            end = today - timedelta(days=7 * i)
            start = end - timedelta(days=6)
            out.append((f"{start.strftime('%b')} {start.day}", start, end))
        return out
    out = []
    year, month = today.year, today.month
    for _ in range(MONTHS):
        start = date(year, month, 1)
        nxt = date(year + (month == 12), month % 12 + 1, 1)
        out.append((start.strftime("%b"), start, min(nxt - timedelta(days=1), today)))
        year, month = (year - 1, 12) if month == 1 else (year, month - 1)
    return out[::-1]


def _readings(checkins: List[Dict[str, Any]]) -> List[Reading]:
    out = []
    for c in checkins:
        sys_bp, dia_bp, when = _number(c.get("systolic_bp")), _number(c.get("diastolic_bp")), _local(c.get("logged_at"))
        if sys_bp and dia_bp and when:
            out.append((when, sys_bp, dia_bp))
    return sorted(out)


def _pressure(rows: List[Reading]) -> Dict[str, Any]:
    return {"systolic": _avg([r[1] for r in rows]), "diastolic": _avg([r[2] for r in rows]), "readings": len(rows)}


def _sodium_by_day(meals: List[Dict[str, Any]]) -> Dict[date, float]:
    per_day: Dict[date, float] = {}
    for m in meals:
        day, mg = _day(m.get("logged_at")), _number(m.get("sodium_mg"))
        if day and mg is not None:
            per_day[day] = per_day.get(day, 0) + mg
    return per_day


def _in(day: Optional[date], start: date, end: date) -> bool:
    return day is not None and start <= day <= end


def _period(start: date, end: date, data: Dict[str, Any], limit_mg: Optional[float]) -> Dict[str, Any]:
    """The averages for one stretch of days (a week, a month, or 30 days for the month comparison)."""
    readings = [r for r in data["readings"] if start <= r[0].date() <= end]
    pulses = [p for c in data["checkins"] if _in(_day(c.get("logged_at")), start, end) for p in [_number(c.get("heart_rate_bpm"))] if p]
    scores = [s for h in data["scores"] if _in(_day(h.get("computed_at")), start, end) for s in [_number(h.get("score"))] if s]
    sodium = [mg for day, mg in data["sodium"].items() if start <= day <= end]
    span = (end - start).days + 1
    minutes = sum(_number(e.get("duration_minutes")) or 0 for e in data["exercise"] if _in(_day(e.get("logged_at")), start, end))
    hours = [h for s in data["sleep"] if _in(_day(s.get("logged_at")), start, end) for h in [_number(s.get("duration_hours"))] if h]
    meds = [c.get("medication_taken") for c in data["checkins"]
            if c.get("medication_taken") in (True, False) and _in(_day(c.get("logged_at")), start, end)]
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "score": _avg(scores),
        **_pressure(readings),
        "pulse": _avg(pulses),
        "sodium_mg": _avg(sodium),
        "sodium_days": len(sodium),
        "days_over_limit": sum(1 for mg in sodium if limit_mg and mg > limit_mg),
        "exercise_minutes_per_week": round(minutes * 7 / span),
        "sleep_hours": _avg(hours, 1),
        "medicines_percent": round(100 * sum(1 for m in meds if m) / len(meds)) if meds else None,
    }


def _times_of_day(readings: List[Reading]) -> List[Dict[str, Any]]:
    out = []
    for key, label, hours, start, end in TIMES_OF_DAY:
        # night runs past midnight, so it is the hours outside 5 AM to 10 PM
        rows = [r for r in readings if (start <= r[0].hour < end if start < end else r[0].hour >= start or r[0].hour < end)]
        out.append({"key": key, "label": label, "hours": hours, **_pressure(rows)})
    return out


def _next_day_top_number(readings: List[Reading]) -> Dict[date, float]:
    """For each day, the top number of the first reading on the day after it."""
    first: Dict[date, float] = {}
    for when, sys_bp, _ in readings:
        first.setdefault(when.date(), sys_bp)
    return {day - timedelta(days=1): sys_bp for day, sys_bp in first.items()}


def _note(key: str, with_label: str, without_label: str, a: List[float], b: List[float], wording) -> Optional[Dict[str, Any]]:
    if len(a) < PATTERN_MIN_DAYS or len(b) < PATTERN_MIN_DAYS:
        return None
    avg_a, avg_b = _avg(a), _avg(b)
    diff = avg_a - avg_b
    return {
        "key": key,
        "with": {"label": with_label, "systolic": avg_a, "days": len(a)},
        "without": {"label": without_label, "systolic": avg_b, "days": len(b)},
        "difference": diff,
        "text": wording(diff, avg_a, avg_b),
    }


def _patterns(data: Dict[str, Any], start: date, limit_mg: Optional[float]) -> List[Dict[str, Any]]:
    readings = data["readings"]
    next_day = _next_day_top_number(readings)

    def compare(what: str, other: str):
        def wording(diff, a, b):
            if abs(diff) < SAME:
                return f"On average, your top number the next day was about the same after {what} as after {other} ({a} and {b})."
            return (f"On average, your top number the next day was {abs(diff)} {'higher' if diff > 0 else 'lower'} "
                    f"after {what} than after {other} ({a} and {b}).")
        return wording

    notes = []
    if limit_mg:
        over = [next_day[d] for d, mg in data["sodium"].items() if d >= start and d in next_day and mg > limit_mg]
        under = [next_day[d] for d, mg in data["sodium"].items() if d >= start and d in next_day and mg <= limit_mg]
        notes.append(_note("sodium", "Over your limit", "Under your limit", over, under,
                           compare("days over your sodium limit", "days under it")))

    exercised = {d for d in (_day(e.get("logged_at")) for e in data["exercise"]) if d}
    # a rest day is one with something else logged but no exercise, so a day the app wasn't opened doesn't count
    logged = {d for d in (_day(r.get("logged_at")) for r in data["checkins"] + data["meals"] + data["sleep"]) if d}
    moved = [next_day[d] for d in exercised if d >= start and d in next_day]
    rested = [next_day[d] for d in logged - exercised if d >= start and d in next_day]
    notes.append(_note("exercise", "Exercise days", "Rest days", moved, rested, compare("days you exercised", "rest days")))

    taken: Dict[date, List[float]] = {}
    missed: Dict[date, List[float]] = {}
    for c in data["checkins"]:
        when, sys_bp = _local(c.get("logged_at")), _number(c.get("systolic_bp"))
        if when and sys_bp and c.get("medication_taken") in (True, False) and when.date() >= start:
            (taken if c["medication_taken"] else missed).setdefault(when.date(), []).append(sys_bp)

    def same_day(diff, a, b):
        if abs(diff) < SAME:
            return f"On average, your top number was about the same on days you took your medicines as on days you missed them ({a} and {b})."
        return (f"On average, your top number was {abs(diff)} {'higher' if diff > 0 else 'lower'} on days you took your "
                f"medicines than on days you missed them ({a} and {b}).")

    notes.append(_note("medicines", "Taken", "Missed", [sum(v) / len(v) for v in taken.values()],
                       [sum(v) / len(v) for v in missed.values()], same_day))
    return [n for n in notes if n]


def build_long_term(user_id: str, days: int) -> Dict[str, Any]:
    from app.db.repositories import get_baseline_repo, get_exercises_repo, get_hss_repo, get_meals_repo, get_sleep_repo
    from app.services.health_logs import get_health_logs
    from app.services.nutrition_targets import targets_for_user

    now = utc_now()
    today = to_local_date(now, TZ)
    buckets = _buckets(today, days)
    start = buckets[0][1]
    # a day before the start (in UTC) so the first Manila morning is in; the 60 days of the month comparison too
    first = min(start, today - timedelta(days=59)) - timedelta(days=1)
    cutoff = f"{first.isoformat()}T00:00:00Z"

    checkins = _live(get_health_logs(user_id, cutoff=cutoff))
    meals = _live(get_meals_repo().list_user_meals(user_id, cutoff=cutoff))
    exercise = [e for e in _live(get_exercises_repo().list_user_logs(user_id, cutoff=cutoff)) if e.get("status") != "abandoned"]
    sleep = _live(get_sleep_repo().list_user_logs(user_id, cutoff=cutoff))
    scores = get_hss_repo().list_hss_history(user_id, cutoff=cutoff)
    targets = targets_for_user(user_id, get_baseline_repo().get_thresholds(user_id)) or {}
    limit_mg = _number((targets.get("sodium_mg") or {}).get("value"))

    data = {
        "checkins": checkins, "meals": meals, "exercise": exercise, "sleep": sleep, "scores": scores,
        "readings": _readings(checkins), "sodium": _sodium_by_day(meals),
    }
    in_period = [r for r in data["readings"] if r[0].date() >= start]
    return {
        "days": days,
        "bucket": "week" if days == 90 else "month",
        "period": {"start": start.isoformat(), "end": today.isoformat()},
        "sodium_limit_mg": round(limit_mg) if limit_mg else None,
        "buckets": [{"label": label, **_period(a, b, data, limit_mg)} for label, a, b in buckets],
        "month_compare": {
            "this": _period(today - timedelta(days=29), today, data, limit_mg),
            "last": _period(today - timedelta(days=59), today - timedelta(days=30), data, limit_mg),
        },
        "time_of_day": _times_of_day(in_period),
        "patterns": _patterns(data, start, limit_mg),
        "pattern_min_days": PATTERN_MIN_DAYS,
        "disclaimer": DISCLAIMER,
    }
