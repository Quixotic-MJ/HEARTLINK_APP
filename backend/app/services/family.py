"""
HL-087: family sharing (Premium for the patient).

A Premium patient makes a one-time invite code (6 characters, 24 hours). Whoever enters it follows the patient: a
read-only summary in the app (latest blood pressure and pulse, score, last check-in, 30-day charts, open alerts) and a
notification when the patient logs an emergency-level reading. Sharing pauses while the patient isn't Premium (the
links stay); removing a follower ends their access at once. The patient is told when someone starts following.

Notifying followers runs after the patient's own save has been answered, and a failure only logs, so it never delays
or changes the patient's save or emergency warning.
"""
import logging
import secrets
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.db.repositories import (
    get_family_repo,
    get_health_logs_repo,
    get_hss_repo,
    get_notification_repo,
    get_profile_repo,
)
from app.services.health_report import TZ, _day, _live, _local, _number
from app.services.premium import PREMIUM_REQUIRED, is_premium
from app.utils.time import parse_utc, to_local_date, utc_now

logger = logging.getLogger(__name__)

CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L: easy to read out over the phone
CODE_LENGTH = 6
INVITE_HOURS = 24
MAX_FOLLOWERS = 5
CHART_DAYS = 30
BAD_CODE = "That code didn't work. Check it, or ask for a new one."
ACCOUNT_KINDS = ("patient", "family")


# --- helpers ----------------------------------------------------------------------------------------------

def _patient_profile(user_id: str) -> Dict[str, Any]:
    profile = get_profile_repo().get_by_id(user_id)
    if not profile or profile.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    return profile


def display_name(profile: Optional[Dict[str, Any]]) -> str:
    """"Ana R." (first name and last initial), or "Your family member" when there's no name."""
    if not profile:
        return "Your family member"
    first = (profile.get("first_name") or "").strip()
    last = (profile.get("last_name") or "").strip()
    if not first:
        return "Your family member"
    return f"{first} {last[0]}." if last else first


def normalize_code(code: str) -> str:
    """What a person types ("k7m-q2p", "K7M Q2P") as stored ("K7MQ2P")."""
    return "".join(ch for ch in (code or "").upper() if ch.isalnum())


def _new_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def _invite_out(invite: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not invite:
        return None
    return {"code": invite["code"], "expires_at": invite["expires_at"]}


def _notify(user_id: str, title: str, message: str) -> None:
    get_notification_repo().create_notification(
        {"user_id": user_id, "type": "alert", "scope": "personal", "title": title, "message": message})


# --- the patient's side -----------------------------------------------------------------------------------

def sharing_status(user_id: str) -> Dict[str, Any]:
    """The Family sharing screen: the open invite (if any) and the followers."""
    profile = _patient_profile(user_id)
    now = utc_now().isoformat()
    repo = get_family_repo()
    return {
        "is_premium": is_premium(profile),
        "invite": _invite_out(repo.get_open_invite(profile["id"], now)),
        "followers": followers(profile["id"]),
        "max_followers": MAX_FOLLOWERS,
    }


def followers(patient_id: str) -> List[Dict[str, Any]]:
    profiles = get_profile_repo()
    return [
        {"id": link["follower_id"], "name": display_name(profiles.get_by_id(link["follower_id"])), "since": link["created_at"]}
        for link in get_family_repo().list_followers(patient_id)
    ]


def create_invite(user_id: str) -> Dict[str, Any]:
    profile = _patient_profile(user_id)
    if not is_premium(profile):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PREMIUM_REQUIRED)
    repo = get_family_repo()
    if len(repo.list_followers(profile["id"])) >= MAX_FOLLOWERS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"You can share with up to {MAX_FOLLOWERS} people. Remove someone first.")
    now = utc_now()
    repo.cancel_open_invites(profile["id"], now.isoformat())
    expires = (now + timedelta(hours=INVITE_HOURS)).isoformat()
    for _ in range(5):  # a clash with an existing code is very unlikely; try another
        invite = repo.create_invite(profile["id"], _new_code(), expires)
        if invite:
            return _invite_out(invite)
    raise HTTPException(status_code=500, detail="Couldn't make a code. Try again.")


def remove_follower(user_id: str, follower_id: str) -> None:
    profile = _patient_profile(user_id)
    if not get_family_repo().delete_link(profile["id"], follower_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That person isn't following you.")


# --- the follower's side ----------------------------------------------------------------------------------

def follow(user_id: str, code: str) -> Dict[str, Any]:
    me = _patient_profile(user_id)
    repo = get_family_repo()
    invite = repo.get_invite_by_code(normalize_code(code))
    now = utc_now()
    expires = parse_utc(invite.get("expires_at")) if invite else None
    if not invite or invite.get("used_at") or invite.get("cancelled_at") or not expires or expires <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=BAD_CODE)
    patient_id = invite["patient_id"]
    if patient_id == me["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That's your own code. Send it to a family member.")
    if repo.get_link(patient_id, me["id"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already follow this person.")
    if len(repo.list_followers(patient_id)) >= MAX_FOLLOWERS or not repo.use_invite(invite["id"], me["id"], now.isoformat()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=BAD_CODE)
    if not repo.add_link(patient_id, me["id"]):
        raise HTTPException(status_code=500, detail="Couldn't start following. Try again.")
    patient = get_profile_repo().get_by_id(patient_id)
    try:
        _notify(patient_id, "Someone is following your readings",
                f"{display_name(me)} can now see your readings and will be told about an emergency-level reading. "
                "You can remove them in Settings › Family sharing.")
    except Exception as e:
        logger.warning("Couldn't tell the patient about a new follower (%s)", type(e).__name__)
    return {"id": patient_id, "name": display_name(patient)}


def following(user_id: str) -> List[Dict[str, Any]]:
    me = _patient_profile(user_id)
    profiles = get_profile_repo()
    out = []
    for link in get_family_repo().list_following(me["id"]):
        patient = profiles.get_by_id(link["patient_id"])
        out.append({"id": link["patient_id"], "name": display_name(patient), "since": link["created_at"],
                    "paused": not is_premium(patient)})
    return out


def stop_following(user_id: str, patient_id: str) -> None:
    me = _patient_profile(user_id)
    if not get_family_repo().delete_link(patient_id, me["id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You don't follow this person.")


def set_account_kind(user_id: str, kind: str) -> Dict[str, Any]:
    profile = _patient_profile(user_id)
    if kind not in ACCOUNT_KINDS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose patient or family.")
    if not get_profile_repo().update(profile["id"], {"account_kind": kind}):
        raise HTTPException(status_code=500, detail="Couldn't save that. Try again.")
    return {"account_kind": kind}


def summary(user_id: str, patient_id: str) -> Dict[str, Any]:
    """What a follower sees. Only with a link; only while the patient is Premium."""
    me = _patient_profile(user_id)
    if not get_family_repo().get_link(patient_id, me["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't follow this person.")
    patient = get_profile_repo().get_by_id(patient_id)
    name = display_name(patient)
    if not is_premium(patient):
        return {"id": patient_id, "name": name, "paused": True}

    today = to_local_date(utc_now(), TZ)
    start = today - timedelta(days=CHART_DAYS - 1)
    cutoff = f"{(start - timedelta(days=1)).isoformat()}T00:00:00Z"
    logs = sorted(_live(get_health_logs_repo().list_user_logs(patient_id, cutoff=cutoff)),
                  key=lambda r: parse_utc(r.get("logged_at")) or utc_now())
    scores = sorted(get_hss_repo().list_hss_history(patient_id, cutoff=cutoff),
                    key=lambda r: parse_utc(r.get("computed_at")) or utc_now())
    # the last check-in may be older than the charts; deleted ones don't count
    latest_log = logs[-1] if logs else (_live(get_health_logs_repo().list_user_logs(patient_id, limit=20)) or [None])[0]
    latest_score = (get_hss_repo().list_hss_history(patient_id, limit=1) or [None])[0]

    readings = [r for r in logs if _number(r.get("systolic_bp")) and _number(r.get("diastolic_bp"))]
    latest_bp = readings[-1] if readings else None
    pulses = [r for r in logs if _number(r.get("heart_rate_bpm"))]

    by_day: Dict[date, Dict[str, Any]] = {start + timedelta(days=i): {} for i in range(CHART_DAYS)}
    for r in readings:  # oldest first, so each day keeps its last reading
        d = _day(r.get("logged_at"))
        if d in by_day:
            by_day[d]["systolic"], by_day[d]["diastolic"] = round(_number(r["systolic_bp"])), round(_number(r["diastolic_bp"]))
    for s in scores:
        d, value = _day(s.get("computed_at")), _number(s.get("score"))
        if d in by_day and value:
            by_day[d]["score"] = round(value)

    alerts = get_health_logs_repo().list_alerts(user_id=patient_id, status_filter="active")
    return {
        "id": patient_id,
        "name": name,
        "paused": False,
        "latest_bp": {
            "systolic": round(_number(latest_bp["systolic_bp"])),
            "diastolic": round(_number(latest_bp["diastolic_bp"])),
            "at": latest_bp.get("logged_at"),
        } if latest_bp else None,
        "latest_pulse": {"bpm": round(_number(pulses[-1]["heart_rate_bpm"])), "at": pulses[-1].get("logged_at")} if pulses else None,
        "score": {"value": round(_number(latest_score["score"])), "at": latest_score.get("computed_at")}
        if latest_score and _number(latest_score.get("score")) else None,
        "last_check_in": latest_log.get("logged_at") if latest_log else None,
        "days": [{"date": d.isoformat(), "systolic": v.get("systolic"), "diastolic": v.get("diastolic"), "score": v.get("score")}
                 for d, v in by_day.items()],
        "open_alerts": [
            {"type": a.get("alert_type") or "Health alert", "severity": a.get("severity"), "at": a.get("created_at")}
            for a in alerts[:5]
        ],
    }


# --- emergency readings -----------------------------------------------------------------------------------

def is_emergency(data: Dict[str, Any]) -> bool:
    """The app's emergency rules (log-symptoms.tsx, companionService.ts), unchanged: blood pressure at 180/120 or
    more, or under 90/60; chest discomfort rated 7 or more; shortness of breath while resting."""
    sys_bp, dia_bp = _number(data.get("systolic_bp")), _number(data.get("diastolic_bp"))
    if sys_bp is not None and dia_bp is not None and (sys_bp >= 180 or dia_bp >= 120 or sys_bp < 90 or dia_bp < 60):
        return True
    symptoms = data.get("symptoms") or []
    severity = data.get("severity_map") or {}
    chest = "Chest Discomfort / Tightness" in symptoms and (_number(severity.get("Chest Discomfort / Tightness")) or 1) >= 7
    breath = "Shortness of Breath" in symptoms and data.get("context") == "resting"
    return bool(chest or breath)


def _what(data: Dict[str, Any]) -> str:
    sys_bp, dia_bp = _number(data.get("systolic_bp")), _number(data.get("diastolic_bp"))
    when = _local(data.get("logged_at")) or _local(utc_now())
    at = when.strftime("%I:%M %p").lstrip("0") if when else ""
    if sys_bp and dia_bp and (sys_bp >= 180 or dia_bp >= 120 or sys_bp < 90 or dia_bp < 60):
        return f"a reading at an emergency level ({round(sys_bp)}/{round(dia_bp)} at {at})"
    return f"symptoms at an emergency level (at {at})"


def notify_followers(patient_id: str, data: Dict[str, Any]) -> int:
    """Runs after the patient's save was answered. Returns how many followers were told; never raises."""
    try:
        patient = get_profile_repo().get_by_id(patient_id)
        if not patient or not is_premium(patient):
            return 0
        links = get_family_repo().list_followers(patient["id"])
        message = (f"{display_name(patient)} logged {_what(data)}. Check on them; if they need help now, call 911.")
        for link in links:
            try:
                _notify(link["follower_id"], "Emergency-level reading", message)
            except Exception as e:
                logger.warning("Couldn't notify a follower (%s)", type(e).__name__)
        return len(links)
    except Exception as e:
        logger.warning("Couldn't notify followers (%s)", type(e).__name__)
        return 0
