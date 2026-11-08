"""HL-093: the pre-exercise safety check. Any "yes" pauses active workouts and exercise suggestions and advises a
professional assessment; logging, Trends, meals and emergency guidance are untouched. It is a screening, not a
diagnosis. The question wording lives in the app (constants/exerciseScreening.ts), with these same ids."""
import logging
from typing import Any, Dict

from fastapi import HTTPException, status

from app.utils.time import utc_now

logger = logging.getLogger(__name__)

QUESTION_IDS = ("heart_condition", "chest_pain", "fainting", "doctor_limit", "joint_problem")
NOT_ANSWERED = {"answered": False, "needs_assessment": False, "cleared": False, "paused": False}


def _repo():
    from app.db.repositories import get_exercise_screening_repo

    return get_exercise_screening_repo()


def status_of(row: Dict[str, Any] | None) -> Dict[str, bool]:
    if not row:
        return dict(NOT_ANSWERED)
    needs = bool(row.get("needs_assessment"))
    cleared = bool(row.get("cleared_at"))
    return {"answered": True, "needs_assessment": needs, "cleared": cleared, "paused": needs and not cleared}


def status_for(user_id: str) -> Dict[str, bool]:
    """For the dashboard. A failure to read it never breaks the dashboard; the check is simply asked again."""
    try:
        return status_of(_repo().get(user_id))
    except Exception as e:
        logger.warning(f"Could not read the exercise safety check for {user_id}: {e}")
        return dict(NOT_ANSWERED)


def save_answers(user_id: str, answers: Dict[str, bool]) -> Dict[str, bool]:
    if set(answers) != set(QUESTION_IDS):
        raise HTTPException(status_code=422, detail="Please answer every question.")
    row = {
        "answers": answers,
        "needs_assessment": any(answers.values()),
        "cleared_at": None,  # new answers need their own clearance
        "answered_at": utc_now().isoformat(),
    }
    _repo().save(user_id, row)
    return status_of(row)


def clear(user_id: str) -> Dict[str, bool]:
    """The patient says a professional cleared them; the answers stay on record."""
    row = _repo().get(user_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No safety check answers yet.")
    now = utc_now().isoformat()
    _repo().save(
        user_id,
        {
            "answers": row.get("answers") or {},
            "needs_assessment": bool(row.get("needs_assessment")),
            "cleared_at": now,
            "answered_at": row.get("answered_at") or now,
        },
    )
    return status_of({**row, "cleared_at": now})
