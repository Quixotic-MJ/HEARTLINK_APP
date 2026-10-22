"""HL-039 / HL-013 / HL-040: the care team's view of a patient in the web portal.

- Cardiologist dashboard: every patient's latest blood pressure, score and open alerts, and each patient's logs.
- Notes: Cardiologist guidance and the Dietitian / Physical Therapist message thread (app/services/patient_notes.py).
Who may do what is EXPERT_PERMISSIONS in app/utils/security.py.
"""
from typing import Any, Dict

from fastapi import APIRouter, Body, Depends

from app.services.patient_notes import add_note, delete_note, latest_guidance, list_notes
from app.services.patient_overview import list_patients, patient_logs
from app.utils.activity_helper import record_admin_activity
from app.utils.security import get_current_admin_user, require_permission

router = APIRouter(prefix="/api/admin/patients", tags=["Patient care"])


@router.get("")
def read_patients(current_user: dict = Depends(require_permission("vitals:read"))):
    return list_patients()


@router.get("/guidance/latest")
def read_latest_guidance(limit: int = 5, current_user: dict = Depends(get_current_admin_user)):
    return latest_guidance(current_user, limit)


@router.get("/{patient_id}/logs")
def read_patient_logs(patient_id: str, current_user: dict = Depends(require_permission("vitals:read"))):
    return patient_logs(patient_id, current_user)


@router.get("/{patient_id}/notes")
def read_patient_notes(patient_id: str, current_user: dict = Depends(get_current_admin_user)):
    return list_notes(patient_id, current_user)


@router.post("/{patient_id}/notes")
def post_patient_note(patient_id: str, payload: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_admin_user)):
    note = add_note(patient_id, payload.get("kind"), payload.get("body"), current_user)
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action="posted guidance" if note["kind"] == "guidance" else "posted a care-team message",
        target_type="patient",
        target_id=patient_id,
    )
    return note


@router.delete("/{patient_id}/notes/{note_id}")
def remove_patient_note(patient_id: str, note_id: str, current_user: dict = Depends(get_current_admin_user)):
    delete_note(patient_id, note_id, current_user)
    return {"status": "success"}
