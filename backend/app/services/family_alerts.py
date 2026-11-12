"""
HL-154: family alerts (Premium for the patient, like family sharing itself).

Every hour the backend checks each family link:
- **No check-in nudge.** When the patient hasn't logged a blood pressure reading for 2 days (counted from their last
  reading, or from when the follow started if that's later), each follower is told once. Nothing more is sent until the
  patient logs a reading again. The patient can turn this off (profiles.family_nudges_enabled).
- **Weekly summary.** On Sunday from 7 PM Manila time, each follower gets the patient's week in plain words: readings,
  average and highest blood pressure, days logged and medicine taken.

Each message is "claimed" on the link first (last_nudge_at / last_digest_at), so two servers sharing the database (staging
and live) never send it twice. Emergency alerts are separate (family.notify_followers) and unchanged. Nothing here
diagnoses: it only repeats what the patient logged.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.db.repositories import get_family_repo, get_health_logs_repo, get_notification_repo, get_profile_repo
from app.services.family import display_name
from app.services.health_report import _live, _local, _number
from app.services.premium import is_premium
from app.utils.time import parse_utc, utc_now

logger = logging.getLogger(__name__)

NUDGE_AFTER_HOURS = 48
DIGEST_WEEKDAY = 6  # Sunday (Monday is 0)
DIGEST_HOUR = 19  # 7 PM, Manila time
DIGEST_EVERY_DAYS = 6  # a digest isn't sent again within 6 days
RUN_EVERY_SECONDS = 60 * 60
WEEK_DAYS = 7


def _iso(dt: datetime) -> str:
    """A timestamp the database filter reads safely (UTC, no "+")."""
    return dt.astimezone(utc_now().tzinfo).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _has_bp(log: Dict[str, Any]) -> bool:
    return bool(_number(log.get("systolic_bp")) and _number(log.get("diastolic_bp")))


def _when_label(dt: datetime, now: datetime) -> str:
    """"Monday" within the last week, otherwise "Nov 3"."""
    local, today = _local(dt.isoformat()), _local(now.isoformat())
    if not local or not today:
        return "a while ago"
    if (today.date() - local.date()).days < WEEK_DAYS:
        return local.strftime("%A")
    return f"{local.strftime('%b')} {local.day}"


def nudge_message(name: str, last_bp: Optional[datetime], now: datetime) -> str:
    if last_bp:
        return f"{name} hasn't logged a blood pressure reading since {_when_label(last_bp, now)}. You might check in with them."
    return f"{name} hasn't logged a blood pressure reading since you started following. You might check in with them."


def digest_message(name: str, week_logs: List[Dict[str, Any]]) -> str:
    """The week in plain words, only from what was logged."""
    if not week_logs:
        return f"{name} didn't log anything this week."
    readings = [l for l in week_logs if _has_bp(l)]
    days = {(_local(l.get("logged_at")) or utc_now()).date() for l in week_logs}
    parts: List[str] = []
    if readings:
        sys_avg = round(sum(_number(r["systolic_bp"]) for r in readings) / len(readings))
        dia_avg = round(sum(_number(r["diastolic_bp"]) for r in readings) / len(readings))
        top = max(readings, key=lambda r: (_number(r["systolic_bp"]), _number(r["diastolic_bp"])))
        top_day = (_local(top.get("logged_at")) or utc_now()).strftime("%A")
        count = "1 reading" if len(readings) == 1 else f"{len(readings)} readings"
        parts.append(f"{count}, average {sys_avg}/{dia_avg}, highest {round(_number(top['systolic_bp']))}/"
                     f"{round(_number(top['diastolic_bp']))} on {top_day}")
    else:
        parts.append("no blood pressure readings")
    parts.append(f"logged on {len(days)} of 7 days")
    answered = [l.get("medication_taken") for l in week_logs if l.get("medication_taken") in (True, False)]
    if answered:
        parts.append(f"medicine taken at {sum(1 for a in answered if a)} of {len(answered)} check-ins")
    text = "; ".join(parts)
    return f"{name}'s week: {text[0].upper()}{text[1:]}."


def is_digest_time(now: datetime) -> bool:
    local = _local(now.isoformat())
    return bool(local and local.weekday() == DIGEST_WEEKDAY and local.hour >= DIGEST_HOUR)


def _notify(user_id: str, title: str, message: str) -> None:
    get_notification_repo().create_notification(
        {"user_id": user_id, "type": "info", "scope": "personal", "title": title, "message": message})


def run_once(now: Optional[datetime] = None) -> Dict[str, int]:
    """One pass over every family link. Returns how many nudges and digests were sent."""
    now = now or utc_now()
    repo, profiles, logs_repo = get_family_repo(), get_profile_repo(), get_health_logs_repo()
    sent = {"nudges": 0, "digests": 0}
    by_patient: Dict[str, List[Dict[str, Any]]] = {}
    for link in repo.list_all_links():
        by_patient.setdefault(str(link["patient_id"]), []).append(link)
    digest_now = is_digest_time(now)

    for patient_id, links in by_patient.items():
        try:
            patient = profiles.get_by_id(patient_id)
            if not patient or not is_premium(patient, now):
                continue
            name = display_name(patient)
            recent = _live(logs_repo.list_user_logs(patient_id, limit=60))
            bp_times = [parse_utc(l.get("logged_at")) for l in recent if _has_bp(l)]
            last_bp = max((t for t in bp_times if t), default=None)

            if patient.get("family_nudges_enabled") is not False:
                for link in links:
                    known = [t for t in (last_bp, parse_utc(link.get("created_at"))) if t]
                    since = max(known) if known else None
                    if since and now - since >= timedelta(hours=NUDGE_AFTER_HOURS):
                        # Claimed only if no nudge was sent since that reading (or since the follow started)
                        if repo.claim(link["id"], "last_nudge_at", _iso(since), _iso(now)):
                            _notify(link["follower_id"], "No check-in for 2 days", nudge_message(name, last_bp, now))
                            sent["nudges"] += 1

            if digest_now:
                week_start = now - timedelta(days=WEEK_DAYS)
                week = [l for l in recent if (parse_utc(l.get("logged_at")) or week_start) > week_start]
                message = digest_message(name, week)
                for link in links:
                    if repo.claim(link["id"], "last_digest_at", _iso(now - timedelta(days=DIGEST_EVERY_DAYS)), _iso(now)):
                        _notify(link["follower_id"], f"{name}'s week", message)
                        sent["digests"] += 1
        except Exception as e:  # one patient's problem never stops the others
            logger.warning("Family alerts skipped a patient (%s)", type(e).__name__)
    return sent


async def run_family_alerts_job() -> None:
    """Runs for as long as the backend does: now, then every hour. A failed run is logged and retried."""
    while True:
        try:
            sent = await asyncio.to_thread(run_once)
            if any(sent.values()):
                logger.info("Family alerts sent: %s", sent)
        except Exception as e:
            logger.warning("Family alerts run failed: %s", type(e).__name__)
        await asyncio.sleep(RUN_EVERY_SECONDS)
