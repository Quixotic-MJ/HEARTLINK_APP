"""HL-138: optional lab results for the Heart score.

People who have a recent blood test can add it: a lipid profile (total cholesterol and HDL) for the cholesterol area,
and fasting blood sugar or HbA1c for the blood sugar area. Each counts in the score for 12 months from the test date
(heart_score.LAB_VALID_DAYS). Values are mg/dL (the app converts mmol/L) and HbA1c is a percent. Self-reported, not a
diagnosis: results outside the healthy range only bring a gentle note to share them with a doctor.
"""
from datetime import date, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.services.heart_score import LAB_VALID_DAYS
from app.utils.time import to_local_date, utc_now

KINDS = ("cholesterol", "blood_sugar")
OLDEST_DAYS = 730  # older results can't be entered; they'd never count anyway
DOCTOR_NOTE = "Share this result with your doctor at your next checkup."


def _repo():
    from app.db.repositories import get_lab_results_repo

    return get_lab_results_repo()


def _today() -> date:
    return to_local_date(utc_now())


def _check_date(test_date: date) -> None:
    today = _today()
    if test_date > today:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The test date can't be in the future.")
    if (today - test_date).days > OLDEST_DAYS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use a result from the last 2 years.")


def doctor_note(kind: str, row: Dict[str, Any]) -> Optional[str]:
    """A gentle note for results outside the healthy range. Never an emergency."""
    if kind == "cholesterol":
        total, hdl = row.get("total_cholesterol"), row.get("hdl")
        if total is not None and hdl is not None and float(total) - float(hdl) >= 190:
            return DOCTOR_NOTE
        return None
    if row.get("has_diabetes"):
        return None
    fasting, hba1c = row.get("fasting_glucose"), row.get("hba1c")
    if (fasting is not None and float(fasting) >= 126) or (hba1c is not None and float(hba1c) >= 6.5):
        return DOCTOR_NOTE
    return None


def view(kind: str, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """What the app shows for one kind: the values, whether it still counts and until when, and any note."""
    if not row:
        return None
    tested = row.get("test_date")
    tested_date = date.fromisoformat(str(tested)[:10]) if tested else None
    counts_until = tested_date + timedelta(days=LAB_VALID_DAYS) if tested_date else None
    keep = ("test_date", "total_cholesterol", "hdl", "cholesterol_medicine", "fasting_glucose", "hba1c", "has_diabetes")
    shown = {k: row.get(k) for k in keep if row.get(k) is not None}
    return {
        **shown,
        "kind": kind,
        "counts": bool(counts_until and counts_until > _today()),
        "counts_until": counts_until.isoformat() if counts_until else None,
        "note": doctor_note(kind, row),
    }


def results_for(user_id: str) -> Dict[str, Optional[Dict[str, Any]]]:
    rows = {r.get("kind"): r for r in _repo().list(user_id)}
    return {kind: view(kind, rows.get(kind)) for kind in KINDS}


def save(user_id: str, kind: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if kind not in KINDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown lab result.")
    _check_date(data["test_date"])
    row = {**data, "test_date": data["test_date"].isoformat(), "saved_at": utc_now().isoformat()}
    _repo().save(user_id, kind, row)
    return view(kind, row)


def remove(user_id: str, kind: str) -> None:
    if kind not in KINDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown lab result.")
    _repo().delete(user_id, kind)
