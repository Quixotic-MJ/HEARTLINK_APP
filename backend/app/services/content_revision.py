"""HL-136: shared rules for saving a recipe or an exercise from the portal.

- "Last changed" protection: a page that sends `expectedUpdatedAt` is refused (409) when someone else saved the item
  after it was opened, instead of quietly overwriting their work. Pages that don't send it save as before.
- A save from anyone but the approving expert that changes nothing except the status (publish, archive, restore) keeps
  the expert's approval. Any change to the content still sends it back for approval (HL-026 / HL-037).
"""
from typing import Any, Dict, Optional

from app.utils.time import parse_utc, utc_now

STALE_MESSAGE = "This changed after you opened it. Refresh first, then make your change again."


class ContentChanged(Exception):
    """Someone saved the item after this page opened it."""


def check_revision(current: Optional[Dict[str, Any]], data: Dict[str, Any]) -> None:
    expected = data.get("expectedUpdatedAt") or data.get("expected_updated_at")
    if not expected or not current:
        return
    if parse_utc(current.get("updated_at")) != parse_utc(expected):
        raise ContentChanged()


def only_status_changed(payload: Dict[str, Any], current: Optional[Dict[str, Any]]) -> bool:
    if not current:
        return False
    return all(current.get(key) == value for key, value in payload.items() if key != "status")


def mark_review(payload: Dict[str, Any], data: Dict[str, Any], expert_id: Optional[str], current: Optional[Dict[str, Any]]) -> None:
    """Only the matching expert approves. Their save keeps the switch as sent, records who and when, and may leave a
    note when sending it back; approving clears the note. Anyone else's save can't approve: it keeps the approval when
    only the status changes, and otherwise sends the item back to waiting, so the expert checks the version patients see."""
    if not expert_id:
        payload.pop("expert_validated", None)
        payload.pop("review_note", None)
        if only_status_changed(payload, current):
            return
        payload.update(expert_validated=False, reviewed_by=None, reviewed_at=None)
        return
    if "reviewNote" in data or "review_note" in data:
        note = str(data.get("reviewNote", data.get("review_note")) or "").strip()[:500]
        payload["review_note"] = note or None
    if "expert_validated" not in payload:
        return
    if payload["expert_validated"]:
        payload.update(reviewed_by=expert_id, reviewed_at=utc_now().isoformat(), review_note=None)
    else:
        payload.update(reviewed_by=None, reviewed_at=None)
