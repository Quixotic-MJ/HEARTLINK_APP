"""HL-039 / HL-013 / HL-040: care-team notes on a patient.

Two kinds share one table. A Cardiologist writes `guidance` (overall feedback) that Dietitians and Physical
Therapists read while approving recipes and exercises. Dietitians and PTs write `message`s to a shared thread.
Every expert type and the admins read both; only medical experts write, and only the author removes a note.
"""
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.db.repositories import get_patient_notes_repo, get_profile_repo
from app.utils.security import has_permission
from app.utils.time import utc_now

NOTE_KINDS = ("guidance", "message")
MAX_BODY_LENGTH = 4000


def _forbidden(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def get_patient_or_404(patient_id: str) -> Dict[str, Any]:
    patient = get_profile_repo().get_by_id(patient_id)
    if not patient or patient.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    return patient


def _author_names(notes: List[Dict[str, Any]]) -> Dict[str, str]:
    names: Dict[str, str] = {}
    profile_repo = get_profile_repo()
    for author_id in {n.get("author_id") for n in notes if n.get("author_id")}:
        profile = profile_repo.get_by_id(author_id) or {}
        names[author_id] = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip() or "Former staff member"
    return names


def _serialize(notes: List[Dict[str, Any]], caller_id: Optional[str]) -> List[Dict[str, Any]]:
    names = _author_names(notes)
    return [{
        "id": n.get("id"),
        "patient_id": n.get("patient_id"),
        "kind": n.get("kind"),
        "body": n.get("body"),
        "author_id": n.get("author_id"),
        "author_name": names.get(n.get("author_id"), "Former staff member"),
        "author_expert_type": n.get("author_expert_type"),
        "created_at": n.get("created_at"),
        "is_mine": bool(caller_id) and n.get("author_id") == caller_id,
    } for n in notes]


def list_notes(patient_id: str, current_user: dict) -> Dict[str, List[Dict[str, Any]]]:
    if not has_permission(current_user, "notes:read"):
        raise _forbidden("Access Denied: your expert type does not cover this.")
    get_patient_or_404(patient_id)
    notes = _serialize(get_patient_notes_repo().list_for_patient(patient_id, list(NOTE_KINDS)), current_user.get("user_id"))
    return {
        "guidance": [n for n in notes if n["kind"] == "guidance"],
        "messages": [n for n in notes if n["kind"] == "message"],
    }


def latest_guidance(current_user: dict, limit: int = 5) -> List[Dict[str, Any]]:
    """The newest Cardiologist guidance across patients, for the recipe and exercise approval panels."""
    if not has_permission(current_user, "notes:read"):
        raise _forbidden("Access Denied: your expert type does not cover this.")
    limit = max(1, min(limit, 20))
    return _serialize(get_patient_notes_repo().list_latest_guidance(limit), current_user.get("user_id"))


def add_note(patient_id: str, kind: Any, body: Any, current_user: dict) -> Dict[str, Any]:
    if kind not in NOTE_KINDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="kind must be 'guidance' or 'message'.")
    text = body.strip() if isinstance(body, str) else ""
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Write something before posting.")
    if len(text) > MAX_BODY_LENGTH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Notes can be up to {MAX_BODY_LENGTH} characters.")

    # Notes are signed by an expert; admins read them but don't post (they have no expert type to sign with).
    if current_user.get("role") != "medical_expert" or not has_permission(current_user, f"notes:{kind}"):
        who = "a Cardiologist" if kind == "guidance" else "a Dietitian or Physical Therapist"
        raise _forbidden(f"Only {who} can post this.")

    get_patient_or_404(patient_id)
    author = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    created = get_patient_notes_repo().create({
        "patient_id": patient_id,
        "author_id": current_user.get("user_id"),
        "author_expert_type": author.get("expert_type"),
        "kind": kind,
        "body": text,
        "created_at": utc_now().isoformat(),
    })
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save the note.")
    return _serialize([created], current_user.get("user_id"))[0]


def delete_note(patient_id: str, note_id: str, current_user: dict) -> None:
    repo = get_patient_notes_repo()
    note = repo.get(note_id)
    if not note or note.get("deleted_at") or note.get("patient_id") != patient_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    if note.get("author_id") != current_user.get("user_id"):
        raise _forbidden("Only the person who wrote a note can remove it.")
    if not repo.soft_delete(note_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
