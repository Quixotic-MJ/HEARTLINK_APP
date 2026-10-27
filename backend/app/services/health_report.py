"""
HL-085: the doctor-ready health report (Premium). A summary of the last 30 or 90 days for the patient to show at a
checkup: blood pressure (averages, highest and lowest, morning vs evening, reading categories), pulse, the heart score
from start to end, medicines, sodium against the patient's own limit, exercise, sleep, symptoms and health alerts.

It only summarises what the patient logged. Blood pressure categories follow the American Heart Association's chart
(the same thresholds the app uses everywhere); the report never diagnoses, and says so.
"""
import zoneinfo
from collections import Counter
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.utils.time import parse_utc, to_local_date, utc_now

REPORT_DAYS = (30, 90)
TZ = "Asia/Manila"
NO_SYMPTOM = "None (Feeling fine)"
DISCLAIMER = "For discussion with your doctor. HeartLink is a wellness tool, not a diagnosis."

# American Heart Association blood pressure categories, checked from the most urgent down
BP_CATEGORIES = (
    ("crisis", "Very high (180/120 or more)"),
    ("low", "Low (under 90/60)"),
    ("stage_2", "High, stage 2 (140/90 or more)"),
    ("stage_1", "High, stage 1 (130–139 or 80–89)"),
    ("elevated", "Elevated (120–129 and under 80)"),
    ("normal", "Normal (under 120/80)"),
)


def bp_category(systolic: float, diastolic: float) -> str:
    if systolic >= 180 or diastolic >= 120:
        return "crisis"
    if systolic < 90 or diastolic < 60:
        return "low"
    if systolic >= 140 or diastolic >= 90:
        return "stage_2"
    if systolic >= 130 or diastolic >= 80:
        return "stage_1"
    if systolic >= 120:
        return "elevated"
    return "normal"


def _local(value: Any) -> Optional[datetime]:
    dt = parse_utc(value)
    if not dt:
        return None
    try:
        return dt.astimezone(zoneinfo.ZoneInfo(TZ))
    except zoneinfo.ZoneInfoNotFoundError:
        return dt


def _day(value: Any) -> Optional[date]:
    dt = parse_utc(value)
    return to_local_date(dt, TZ) if dt else None


def _avg(values: List[float], digits: int = 0) -> Optional[float]:
    if not values:
        return None
    result = sum(values) / len(values)
    return round(result, digits) if digits else round(result)


def _number(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None


def _live(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [r for r in rows if not r.get("deleted_at") and not r.get("is_deleted")]


def _blood_pressure(checkins: List[Dict[str, Any]]) -> Dict[str, Any]:
    readings: List[Tuple[datetime, float, float]] = []
    for c in checkins:
        sys_bp, dia_bp, when = _number(c.get("systolic_bp")), _number(c.get("diastolic_bp")), _local(c.get("logged_at"))
        if sys_bp and dia_bp and when:
            readings.append((when, sys_bp, dia_bp))
    if not readings:
        return {"readings": 0}

    def summary(rows):
        return {"systolic": _avg([r[1] for r in rows]), "diastolic": _avg([r[2] for r in rows]), "readings": len(rows)} if rows else None

    def reading(row):
        return {"systolic": round(row[1]), "diastolic": round(row[2]), "date": row[0].date().isoformat()}

    categories = Counter(bp_category(s, d) for _, s, d in readings)
    return {
        "readings": len(readings),
        "average": summary(readings),
        "highest": reading(max(readings, key=lambda r: (r[1], r[2]))),
        "lowest": reading(min(readings, key=lambda r: (r[1], r[2]))),
        "morning": summary([r for r in readings if 5 <= r[0].hour < 11]),
        "evening": summary([r for r in readings if 17 <= r[0].hour < 22]),
        "categories": [{"key": key, "label": label, "readings": categories.get(key, 0)} for key, label in BP_CATEGORIES],
    }


def _medicines(checkins: List[Dict[str, Any]]) -> Dict[str, Any]:
    # null means "I don't take any" (or left blank), so it's left out of the share
    answered = [c.get("medication_taken") for c in checkins if c.get("medication_taken") in (True, False)]
    taken = sum(1 for a in answered if a)
    return {"answered": len(answered), "taken": taken, "percent": round(100 * taken / len(answered)) if answered else None}


def _sodium(meals: List[Dict[str, Any]], limit_mg: Optional[float]) -> Dict[str, Any]:
    per_day: Dict[date, float] = {}
    for m in meals:
        day, mg = _day(m.get("logged_at")), _number(m.get("sodium_mg"))
        if day and mg is not None:
            per_day[day] = per_day.get(day, 0) + mg
    totals = list(per_day.values())
    return {
        "days_with_meals": len(totals),
        "average_mg": _avg(totals),
        "limit_mg": round(limit_mg) if limit_mg else None,
        "days_over_limit": sum(1 for t in totals if limit_mg and t > limit_mg),
    }


def build_report(user_id: str, days: int) -> Dict[str, Any]:
    from app.db.repositories import get_baseline_repo, get_exercises_repo, get_health_logs_repo, get_hss_repo, get_meals_repo, get_sleep_repo
    from app.services.health_logs import get_health_logs
    from app.services.nutrition_targets import targets_for_user

    now = utc_now()
    start = now - timedelta(days=days)
    cutoff = start.strftime("%Y-%m-%dT%H:%M:%SZ")

    checkins = _live(get_health_logs(user_id, cutoff=cutoff))
    meals = _live(get_meals_repo().list_user_meals(user_id, cutoff=cutoff))
    exercise = [e for e in _live(get_exercises_repo().list_user_logs(user_id, cutoff=cutoff)) if e.get("status") != "abandoned"]
    sleep = _live(get_sleep_repo().list_user_logs(user_id, cutoff=cutoff))
    scores = sorted(
        (s for s in get_hss_repo().list_hss_history(user_id, cutoff=cutoff) if _number(s.get("score")) is not None),
        key=lambda s: parse_utc(s.get("computed_at")) or start,
    )
    alerts = [a for a in get_health_logs_repo().list_alerts(user_id=user_id) if (parse_utc(a.get("created_at")) or start) >= start]
    targets = targets_for_user(user_id, get_baseline_repo().get_thresholds(user_id)) or {}

    logged_days = {d for d in (_day(r.get("logged_at")) for r in checkins + meals + exercise + sleep) if d}
    pulses = [p for p in (_number(c.get("heart_rate_bpm")) for c in checkins) if p]
    minutes = sum(_number(e.get("duration_minutes")) or 0 for e in exercise)
    hours = [h for h in (_number(s.get("duration_hours")) for s in sleep) if h]
    symptoms = Counter(
        s for c in checkins for s in (c.get("symptoms") or []) if s and s != NO_SYMPTOM
    )

    return {
        "days": days,
        "period": {"start": to_local_date(start, TZ).isoformat(), "end": to_local_date(now, TZ).isoformat()},
        "generated_at": now.isoformat(),
        "days_logged": len(logged_days),
        "blood_pressure": _blood_pressure(checkins),
        "pulse": {"average": _avg(pulses), "readings": len(pulses)},
        "score": {
            "start": round(_number(scores[0]["score"])) if scores else None,
            "end": round(_number(scores[-1]["score"])) if scores else None,
            "change": round(_number(scores[-1]["score"]) - _number(scores[0]["score"])) if len(scores) > 1 else None,
        },
        "medicines": _medicines(checkins),
        "sodium": _sodium(meals, (targets.get("sodium_mg") or {}).get("value")),
        "exercise": {"sessions": len(exercise), "minutes": round(minutes), "minutes_per_week": round(minutes * 7 / days)},
        "sleep": {"average_hours": _avg(hours, 1), "nights": len(hours)},
        "symptoms": [{"name": name, "times": n} for name, n in symptoms.most_common()],
        "alerts": [
            {"date": (_day(a.get("created_at")) or now.date()).isoformat(), "type": a.get("alert_type") or "Health alert"}
            for a in sorted(alerts, key=lambda a: parse_utc(a.get("created_at")) or start)
        ],
        "disclaimer": DISCLAIMER,
    }
