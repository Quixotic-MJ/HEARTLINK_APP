"""HL-039: the patient list and patient logs behind the Cardiologist dashboard.

The list shows every patient's latest blood pressure, score and open alerts. A patient's page returns the
logs the caller's expert type may read (HL-012): a Cardiologist and the admins get all of them, a Dietitian
adds meals to the vitals, a Physical Therapist adds exercise.
"""
from typing import Any, Dict, List

from app.db.repositories import (
    get_exercises_repo,
    get_health_logs_repo,
    get_hss_repo,
    get_meals_repo,
    get_profile_repo,
    get_sleep_repo,
)
from app.services.patient_notes import get_patient_or_404
from app.utils.security import has_permission
from app.utils.time import UTC_MIN, parse_utc

OPEN_ALERT_STATUS = "Under Review"
LOG_LIMIT = 100


def _latest_by_user(rows: List[Dict[str, Any]], time_key: str, keep=lambda r: True) -> Dict[str, Dict[str, Any]]:
    latest: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        user_id = str(row.get("user_id"))
        if not keep(row):
            continue
        current = latest.get(user_id)
        if current is None or (parse_utc(row.get(time_key)) or UTC_MIN) > (parse_utc(current.get(time_key)) or UTC_MIN):
            latest[user_id] = row
    return latest


def _has_bp(log: Dict[str, Any]) -> bool:
    return log.get("systolic_bp") is not None and log.get("diastolic_bp") is not None


def list_patients() -> List[Dict[str, Any]]:
    patients = get_profile_repo().list_all(role_filter="patient")
    health_repo = get_health_logs_repo()
    latest_bp = _latest_by_user(health_repo.list_all_logs(), "logged_at", _has_bp)
    latest_score = _latest_by_user(get_hss_repo().list_all_hss_records(), "computed_at")
    open_alerts: Dict[str, int] = {}
    for alert in health_repo.list_alerts(status_filter=OPEN_ALERT_STATUS):
        key = str(alert.get("user_id"))
        open_alerts[key] = open_alerts.get(key, 0) + 1

    items = []
    for p in patients:
        pid = str(p.get("id"))
        bp = latest_bp.get(pid)
        score = latest_score.get(pid)
        items.append({
            "id": pid,
            "account_status": p.get("account_status", "active"),
            "created_at": p.get("created_at"),
            "latest_bp": {
                "systolic": bp.get("systolic_bp"),
                "diastolic": bp.get("diastolic_bp"),
                "heart_rate": bp.get("heart_rate_bpm"),
                "logged_at": bp.get("logged_at"),
            } if bp else None,
            "score": score.get("score") if score else None,
            "tier": score.get("tier") if score else None,
            "score_at": score.get("computed_at") if score else None,
            "open_alerts": open_alerts.get(pid, 0),
        })

    # Patients with open alerts first, then the most recently active
    def sort_key(item):
        last = item["latest_bp"]["logged_at"] if item["latest_bp"] else item["score_at"]
        return (-item["open_alerts"], -((parse_utc(last) or UTC_MIN).timestamp()))
    items.sort(key=sort_key)
    return items


def patient_logs(patient_id: str, current_user: dict) -> Dict[str, Any]:
    patient = get_patient_or_404(patient_id)
    result: Dict[str, Any] = {
        "patient": {
            "id": patient.get("id"),
            "account_status": patient.get("account_status", "active"),
            "created_at": patient.get("created_at"),
            "sex": patient.get("sex"),
            "date_of_birth": patient.get("date_of_birth"),
        },
        # Which sections this caller may see, so the page can explain a missing one
        "sections": [],
    }

    if has_permission(current_user, "vitals:read"):
        health_repo = get_health_logs_repo()
        result["health"] = [
            log for log in health_repo.list_user_logs(patient_id, limit=LOG_LIMIT)
            if log.get("context") != "symptom_lock_cleared"
        ]
        result["sleep"] = [s for s in get_sleep_repo().list_user_logs(patient_id, limit=LOG_LIMIT) if not s.get("is_deleted")]
        result["scores"] = get_hss_repo().list_hss_history(patient_id, limit=LOG_LIMIT)
        result["alerts"] = health_repo.list_alerts(user_id=patient_id)
        result["sections"] += ["health", "sleep", "scores", "alerts"]
    if has_permission(current_user, "meal_logs:read"):
        result["meals"] = get_meals_repo().list_user_meals(patient_id, limit=LOG_LIMIT)
        result["sections"].append("meals")
    if has_permission(current_user, "exercise_logs:read"):
        result["exercise"] = get_exercises_repo().list_user_logs(patient_id, limit=LOG_LIMIT)
        result["sections"].append("exercise")
    return result
