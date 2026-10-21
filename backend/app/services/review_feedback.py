"""HL-057: what a patient sees from a finished case review — a checkup reminder and hidden items.

Everything here sits behind PATIENT_REVIEW_FEEDBACK_ENABLED, which stays off until the adviser approves the
wording below. While it is off, nothing reaches the patient: no notification, no dashboard banner, and
recommendations are not filtered. Items an expert marked not suitable are still recorded (HL-056) so they
take effect as soon as the setting is switched on.
"""
import logging
import os
from datetime import timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from app.db.repositories import get_case_review_repo, get_notification_repo
from app.utils.time import parse_utc, utc_now

logger = logging.getLogger(__name__)

REMIND_FOR = ("within_2_weeks", "asap")
# The dashboard banner shows for this long after the review is finished.
BANNER_DAYS = 14

# PENDING ADVISER APPROVAL: do not switch the setting on until this wording is approved.
WORDING = {
    "within_2_weeks": {
        "title": "Time for a checkup",
        "message": "A clinician who looked at your recent logs suggests an in-person checkup within the next 2 weeks. "
                   "Tap Find a clinic to see clinics near you.",
    },
    "asap": {
        "title": "Please book a checkup soon",
        "message": "A clinician who looked at your recent logs suggests seeing a doctor in person as soon as you can. "
                   "Tap Find a clinic to see clinics near you.",
    },
}


def is_enabled() -> bool:
    return os.environ.get("PATIENT_REVIEW_FEEDBACK_ENABLED", "off").strip().lower() in ("1", "true", "on", "yes")


def record_not_suitable(rc: Dict[str, Any], verdicts: List[Dict[str, Any]]) -> None:
    """Records each item an expert marked not suitable for this patient (verdict "no")."""
    patient_id = rc.get("patient_id")
    if not patient_id:
        return
    repo = get_case_review_repo()
    for v in verdicts:
        if v.get("verdict") == "no":
            repo.hide_recommendation(patient_id, v["item_type"], v["item_id"], rc.get("id"))


def notify_checkup(rc: Dict[str, Any], checkup_flag: Optional[str]) -> None:
    """Sends the patient a checkup reminder when the cardiologist asked for one (setting on only)."""
    if not is_enabled() or checkup_flag not in REMIND_FOR or not rc.get("patient_id"):
        return
    try:
        get_notification_repo().create_notification({
            "user_id": rc["patient_id"],
            "type": "reminder",
            "scope": "personal",
            **WORDING[checkup_flag],
        })
    except Exception as e:  # the review is saved either way
        logger.warning("Checkup reminder not sent: %s", type(e).__name__)


def checkup_reminder(patient_id: str) -> Optional[Dict[str, Any]]:
    """The dashboard banner: the latest finished review that asked for a checkup, for 14 days after it."""
    if not is_enabled():
        return None
    repo = get_case_review_repo()
    finished = [c for c in repo.list_patient_cases(patient_id) if c.get("status") == "complete"]
    if not finished:
        return None
    latest = max(finished, key=lambda c: c.get("completed_at") or "")
    done_at = parse_utc(latest.get("completed_at"))
    if not done_at or utc_now() - done_at > timedelta(days=BANNER_DAYS):
        return None
    cardiology = repo.list_sections(review_case_id=latest["id"], section="cardiology")
    flag = (cardiology[0] if cardiology else {}).get("checkup_flag")
    if flag not in REMIND_FOR:
        return None
    return {"urgency": flag, **WORDING[flag], "review_completed_at": latest.get("completed_at")}


def hidden_items(patient_id: str) -> Set[Tuple[str, str]]:
    """(item_type, item_id) pairs to leave out of this patient's recommendations (setting on only)."""
    if not is_enabled():
        return set()
    return {(h["item_type"], str(h["item_id"])) for h in get_case_review_repo().list_hidden_recommendations(patient_id)}
