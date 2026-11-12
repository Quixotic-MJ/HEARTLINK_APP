"""HL-122 to HL-124: the PAR-Q+ screening, which decides which exercises a person may do and nothing else. It never changes
the score.

Since 2026-11-12 (owner's choice, permission requested from the PAR-Q+ Collaboration) the whole PAR-Q+ is asked inside the
app and every answer is saved (`save_form`): page 1's 7 questions, then the 10 condition sections and their follow-ups. The
server works out what the form shows. The form's wording is never stored here: the app shows the official text from
constants/parqWording.ts, which the team copies in unchanged. Older app builds still send only the result the person read
off the PDF (`save_answers`). HeartLink adds an extra check and a delay check in its own words. Results:

- eligible: all NO on page 1, so every approved exercise
- caution: cleared through the follow-up questions, so beginner exercises and breathing [HeartLink proposal]
- delayed: pregnant or ill right now, so breathing only until they screen again
- locked: a follow-up YES, or HeartLink's extra check, so breathing only until a professional clears them
- needed: never done, the old 5-question check, over 12 months old, or a severe symptom logged since, so breathing only
  and a prompt to do it

Breathing exercises are open in every state. It is a screening, not a diagnosis.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.utils.time import parse_utc, utc_now

logger = logging.getLogger(__name__)

FORM_VERSION = "PAR-Q+ 2025"
RULES_VERSION = "heartlink-parq-2"
# The PAR-Q+ 2025's question numbers (no wording): page 1 has 7, and pages 2-3 have 10 condition sections. Each section's
# first question asks whether the condition is present; its follow-ups (a, b, ...) are answered only when it is.
PAGE_ONE = tuple(f"q{i}" for i in range(1, 8))
SECTIONS = {"1": "abc", "2": "ab", "3": "abcd", "4": "ab", "5": "abcde", "6": "ab", "7": "abcd", "8": "abc", "9": "abc", "10": "abc"}
# HeartLink's extra check, now read straight from page 1: chest pain (2), dizziness or losing consciousness (3), and a
# doctor saying only medically supervised activity (7) [HeartLink proposal]
EXTRA_CHECK_QUESTIONS = ("q2", "q3", "q7")
NOTE_FIELDS = ("p1.q4_list", "p1.q5_list", "p1.q6_list", "conditions_list")
VALID_DAYS = 365
RESULTS = ("all_no", "cleared_by_follow_ups", "follow_up_yes")
OPEN_STATES = ("eligible", "caution")
BEGINNER = "Beginner"


def _repo():
    from app.db.repositories import get_exercise_screening_repo

    return get_exercise_screening_repo()


def decide(parq_result: str, extra_check_yes: bool, pregnant: bool, unwell: bool) -> str:
    """The result from the person's answers. Delayed wins, then locked."""
    if pregnant or unwell:
        return "delayed"
    if parq_result == "follow_up_yes" or (parq_result != "all_no" and extra_check_yes):
        return "locked"
    if parq_result == "all_no":
        return "eligible"
    return "caution"


def _needed(reason: str) -> Dict[str, Any]:
    return {
        "answered": False, "state": "needed", "reason": reason, "beginner_only": False, "needs_assessment": False,
        "cleared": False, "paused": False, "expires_at": None,
    }


def status_of(row: Optional[Dict[str, Any]], severe_symptom_at: Optional[datetime] = None, now: Optional[datetime] = None) -> Dict[str, Any]:
    """What the screening allows today. `paused` and `needs_assessment` keep their old meaning for older app builds."""
    if not row:
        return _needed("not_done")
    if not row.get("state"):
        return _needed("old_check")
    now = now or utc_now()
    expires = parse_utc(row.get("expires_at"))
    if expires and expires <= now:
        return _needed("expired")
    declared = parse_utc(row.get("declared_at"))
    if severe_symptom_at and declared and severe_symptom_at > declared:
        return _needed("symptom_since")
    state = row["state"]
    cleared = state == "locked" and bool(row.get("cleared_at"))
    if cleared:
        state = "caution"  # a professional's OK starts them on beginner exercises [HeartLink proposal]
    return {
        "answered": True,
        "state": state,
        "reason": "cleared" if cleared else None,
        "beginner_only": state == "caution",
        "needs_assessment": row["state"] == "locked",
        "cleared": cleared,
        "paused": state in ("locked", "delayed"),
        "expires_at": row.get("expires_at"),
    }


def status_for(user_id: str, severe_symptom_at: Optional[datetime] = None) -> Dict[str, Any]:
    """For the dashboard. A failure to read it never breaks the dashboard; the screening is simply asked again."""
    try:
        return status_of(_repo().get(user_id), severe_symptom_at)
    except Exception as e:
        logger.warning(f"Could not read the exercise screening for {user_id}: {e}")
        return _needed("not_done")


def expert_view(user_id: str, severe_symptom_at: Optional[datetime] = None) -> Dict[str, Any]:
    """2026-11-12: the result for an expert's patient page (read-only): what it allows today and when it was answered."""
    try:
        row = _repo().get(user_id)
    except Exception as e:
        logger.warning(f"Could not read the exercise screening for {user_id}: {e}")
        row = None
    s = status_of(row, severe_symptom_at)
    return {
        "state": s["state"],
        "reason": s.get("reason"),
        "cleared": s.get("cleared", False),
        "answered_at": (row or {}).get("declared_at"),
        "expires_at": s.get("expires_at"),
    }


def is_breathing(exercise: Dict[str, Any]) -> bool:
    return "breath" in str(exercise.get("type") or "").lower()


def allows(screening: Dict[str, Any], exercise: Dict[str, Any]) -> bool:
    """Whether the screening result allows this exercise. Breathing is always open."""
    if is_breathing(exercise):
        return True
    if screening.get("state") == "eligible":
        return True
    if screening.get("state") == "caution":
        return (exercise.get("difficulty_level") or "") == BEGINNER
    return False


def _bools(answers: Any, keys) -> bool:
    return isinstance(answers, dict) and set(answers) == set(keys) and all(isinstance(v, bool) for v in answers.values())


def result_from_form(form: Dict[str, Any]) -> tuple:
    """(what the PAR-Q+ shows, HeartLink's extra check) from every answer in the form, as the form itself decides: all NO
    on page 1 clears the person; otherwise any follow-up YES means further advice is needed."""
    page1 = form.get("page1") if isinstance(form, dict) else None
    if not _bools(page1, PAGE_ONE):
        raise HTTPException(status_code=422, detail="Please answer every question on page 1.")
    if not any(page1.values()):
        return "all_no", False
    extra = any(page1[q] for q in EXTRA_CHECK_QUESTIONS)
    sections = form.get("sections") or {}
    follow_up_yes = False
    for number, letters in SECTIONS.items():
        section = sections.get(number) if isinstance(sections, dict) else None
        present = section.get("present") if isinstance(section, dict) else None
        if not isinstance(present, bool):
            raise HTTPException(status_code=422, detail="Please answer every condition question on pages 2 and 3.")
        if present:
            follow_ups = section.get("answers")
            if not _bools(follow_ups, letters):
                raise HTTPException(status_code=422, detail="Please answer every follow-up question.")
            follow_up_yes = follow_up_yes or any(follow_ups.values())
    return ("follow_up_yes" if follow_up_yes else "cleared_by_follow_ups"), extra


def save_form(user_id: str, form: Dict[str, Any], pregnant: bool, unwell: bool, declared: bool) -> Dict[str, Any]:
    """The whole PAR-Q+ answered in the app: the server decides the result, and every answer is kept."""
    parq_result, extra = result_from_form(form)
    clean = {"page1": form["page1"], "sections": {n: s for n, s in (form.get("sections") or {}).items() if n in SECTIONS}}
    # The form's optional "list your condition(s) and medications" boxes, kept short
    notes = form.get("notes") if isinstance(form.get("notes"), dict) else {}
    clean["notes"] = {k: v.strip()[:300] for k, v in notes.items() if k in NOTE_FIELDS and isinstance(v, str) and v.strip()}
    return save_answers(user_id, parq_result, None if parq_result == "all_no" else extra, pregnant, unwell, declared, form=clean)


def save_answers(user_id: str, parq_result: str, extra_check_yes: Optional[bool], pregnant: bool, unwell: bool, declared: bool,
                 form: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if parq_result not in RESULTS:
        raise HTTPException(status_code=422, detail="Please choose what your PAR-Q+ showed.")
    if parq_result != "all_no" and extra_check_yes is None:
        raise HTTPException(status_code=422, detail="Please answer every question.")
    if not declared:
        raise HTTPException(status_code=422, detail="Please confirm the declaration.")
    now = utc_now()
    state = decide(parq_result, bool(extra_check_yes), pregnant, unwell)
    answers = {"extra_check_yes": bool(extra_check_yes) if parq_result != "all_no" else None, "pregnant": pregnant, "unwell": unwell}
    if form is not None:
        answers.update(form=form, entered_in_app=True)
    row = {
        "answers": answers,
        "parq_result": parq_result,
        "state": state,
        "needs_assessment": state == "locked",
        "cleared_at": None,  # new answers need their own clearance
        "answered_at": now.isoformat(),
        "declared_at": now.isoformat(),
        "expires_at": (now + timedelta(days=VALID_DAYS)).isoformat(),
        "form_version": FORM_VERSION,
        "rules_version": RULES_VERSION,
    }
    _repo().save(user_id, row)
    return status_of(row, now=now)


def save_old_answers(user_id: str, answers: Dict[str, bool]) -> Dict[str, Any]:
    """Older app builds still send the 5-question check. It's kept as they expect, and counts as needing the new screening."""
    if len(answers) != 5 or not all(isinstance(v, bool) for v in answers.values()):
        raise HTTPException(status_code=422, detail="Please answer every question.")
    row = {"answers": answers, "needs_assessment": any(answers.values()), "cleared_at": None, "answered_at": utc_now().isoformat()}
    _repo().save(user_id, row)
    needs = row["needs_assessment"]
    return {**_needed("old_check"), "answered": True, "needs_assessment": needs, "paused": needs}


def clear(user_id: str) -> Dict[str, Any]:
    """The person says a professional cleared them; the answers stay on record."""
    row = _repo().get(user_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No safety check answers yet.")
    now = utc_now().isoformat()
    updated = {k: v for k, v in row.items() if k != "user_id"}
    updated["cleared_at"] = now
    updated.setdefault("answered_at", now)
    _repo().save(user_id, updated)
    return status_of(updated)
