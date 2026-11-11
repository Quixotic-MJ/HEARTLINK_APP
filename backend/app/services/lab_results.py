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

KINDS = ("cholesterol", "blood_sugar", "kidney")  # kidney: HL-141, for the Heart risk
LOW_EGFR = 60  # under 60 brings the gentle doctor note (the usual cut-off for reduced kidney function, KDIGO)
# HL-140: a lab result's answer also updates the setup answer the Heart risk uses, so the two never disagree
SHARED_ANSWERS = {"cholesterol": ("cholesterol_medicine", "cholesterol_medicine"), "blood_sugar": ("has_diabetes", "has_diabetes")}
OLDEST_DAYS = 730  # older results can't be entered; they'd never count anyway
DOCTOR_NOTE = "Share this result with your doctor at your next checkup."


def _repo():
    from app.db.repositories import get_lab_results_repo

    return get_lab_results_repo()


def _baseline_repo():
    from app.db.repositories import get_baseline_repo

    return get_baseline_repo()


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
    if kind == "kidney":
        egfr = row.get("egfr")
        return DOCTOR_NOTE if egfr is not None and float(egfr) < LOW_EGFR else None
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
    keep = ("test_date", "total_cholesterol", "hdl", "cholesterol_medicine", "fasting_glucose", "hba1c", "has_diabetes",
            "creatinine", "egfr")
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
    if kind == "kidney":
        row = _with_egfr(user_id, row)
    _repo().save(user_id, kind, row)
    _share_answer(user_id, kind, row)
    return view(kind, row)


def _with_egfr(user_id: str, row: Dict[str, Any]) -> Dict[str, Any]:
    """HL-141: works out eGFR from creatinine (CKD-EPI 2021, using age on the test date and sex) when the report didn't
    print it."""
    if row.get("egfr") is not None or row.get("creatinine") is None:
        return row
    from app.db.repositories import get_profile_repo
    from app.services.feature_transform import _age
    from app.services.heart_risk import egfr_from_creatinine

    profile = get_profile_repo().get_by_id(user_id) or {}
    sex = str(profile.get("sex") or "").lower()
    age = _age(profile.get("date_of_birth"), date.fromisoformat(row["test_date"][:10]))
    if sex not in ("female", "male") or age is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Add your date of birth and sex in your profile first, or enter the eGFR from the report.")
    return {**row, "egfr": round(egfr_from_creatinine(float(row["creatinine"]), age, sex), 1)}


def _share_answer(user_id: str, kind: str, row: Dict[str, Any]) -> None:
    if kind not in SHARED_ANSWERS:
        return
    lab_key, answer_key = SHARED_ANSWERS[kind]
    try:
        repo = _baseline_repo()
        if row.get(lab_key) is not None and repo.get_baseline(user_id):
            repo.save_baseline(user_id, {answer_key: bool(row[lab_key])})
    except Exception as e:  # the lab result is saved either way
        import logging
        logging.getLogger(__name__).warning("Couldn't update the matching setup answer (%s)", type(e).__name__)


def remove(user_id: str, kind: str) -> None:
    if kind not in KINDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown lab result.")
    _repo().delete(user_id, kind)
