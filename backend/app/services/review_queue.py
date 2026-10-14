"""
HL-054: the case review queue.

A patient enters as a review round (review_cases) through one of three lanes:
- urgent:   the rules in review_rules.py (app level Critical, a crisis or low BP reading, a severe symptom)
- rereview: the app's level changed since their last completed round
- sample:   a random pick across all levels, drawn by an admin

Each round stores what the app said at that moment and the 37 inputs the baseline model reads,
so later comparisons and datasets use exactly what the reviewers saw.
"""
import json
import logging
import random
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.db.repositories import (
    get_baseline_repo,
    get_case_review_repo,
    get_health_logs_repo,
    get_hss_repo,
    get_profile_repo,
)
from app.services import review_rules as rules
from app.services.cases import get_deterministic_case_id
from app.utils.time import parse_utc, to_local_date, utc_now

logger = logging.getLogger(__name__)

SCORERS = ("baseline_model", "bp_rules", "lifestyle_points", "unknown")
SECTIONS = ("cardiology", "nutrition", "exercise")
_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def _day(value: Any) -> str:
    dt = parse_utc(value)
    if not dt:
        return "recently"
    d = to_local_date(dt)
    return f"{_MONTHS[d.month - 1]} {d.day}"


def _json_safe(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


def _eligible_patients() -> List[Dict[str, Any]]:
    profiles = get_profile_repo().list_all(exclude_archived=True)
    return [
        p for p in profiles
        if p.get("role") == "patient"
        and p.get("onboarding_status") == "complete"
        and p.get("account_status", "active") == "active"
    ]


def current_app_status(user_id: str) -> Dict[str, Any]:
    """The level, score and scorer the patient currently sees in the app."""
    history = get_hss_repo().list_hss_history(user_id, limit=1)
    if history:
        latest = history[0]
        source = latest.get("source")
        factors = latest.get("contributing_factors") or {}
        if source == "baseline":
            scorer = "baseline_model"
        elif source == "telemetry" and factors.get("source") == "lifestyle_composite":
            scorer = "lifestyle_points"
        elif source == "telemetry":
            scorer = "bp_rules"
        else:
            scorer = "unknown"
        return {"score": latest.get("score"), "tier": latest.get("tier"), "scorer": scorer}
    return {"score": None, "tier": None, "scorer": "unknown"}


def urgent_reason(user_id: str, status: Dict[str, Any], now=None) -> Optional[str]:
    """Why this patient belongs in the urgent lane, or None. The newest trigger wins."""
    now = now or utc_now()
    if status.get("tier") in rules.URGENT_TIERS:
        return f"App level is {status['tier']}"

    cutoff = (now - timedelta(days=rules.SYMPTOM_WINDOW_DAYS)).isoformat()
    for log in get_health_logs_repo().list_user_logs(user_id, cutoff=cutoff):
        sys_bp, dia_bp = log.get("systolic_bp"), log.get("diastolic_bp")
        when = _day(log.get("logged_at"))
        if (sys_bp and sys_bp >= rules.CRISIS_SYSTOLIC) or (dia_bp and dia_bp >= rules.CRISIS_DIASTOLIC):
            return f"BP {sys_bp}/{dia_bp} logged {when}"
        if (sys_bp and sys_bp < rules.LOW_SYSTOLIC) or (dia_bp and dia_bp < rules.LOW_DIASTOLIC):
            return f"Low BP {sys_bp}/{dia_bp} logged {when}"
        symptoms = log.get("symptoms") or []
        severity = (log.get("severity_map") or {}).get(rules.CHEST_SYMPTOM) or 0
        if rules.CHEST_SYMPTOM in symptoms and severity >= rules.CHEST_SEVERITY_AT_LEAST:
            return f"Chest discomfort, severity {severity}, logged {when}"
        if rules.BREATH_SYMPTOM in symptoms and log.get("context") in rules.BREATH_URGENT_CONTEXTS:
            return f"Shortness of breath at rest logged {when}"
    return None


def rereview_reason(user_id: str, status: Dict[str, Any]) -> Optional[str]:
    """A re-review is due when the app's level changed since the last completed round."""
    rounds = get_case_review_repo().list_patient_cases(user_id)
    last = next((r for r in rounds if r.get("status") == "complete"), None)
    if last and last.get("app_tier") and status.get("tier") and last["app_tier"] != status["tier"]:
        return "App level changed since the last review"
    return None


def build_snapshot(profile: Dict[str, Any]) -> Dict[str, Any]:
    """The 37 model inputs plus everything the reviewers are shown, frozen at round opening."""
    from app.services.clinical import get_clinical_baseline_data, get_model_metadata, get_recent_telemetry_timeline
    from app.services.feature_transform import transform_to_model_features

    user_id = profile["id"]
    onboarding = get_baseline_repo().get_baseline(user_id) or {}
    model_features: Dict[str, Any] = {}
    if onboarding:
        try:
            frame = transform_to_model_features(onboarding, profile)
            model_features = {k: (v.item() if hasattr(v, "item") else v) for k, v in frame.iloc[0].to_dict().items()}
        except Exception as e:
            logger.warning("Model features unavailable for a review round: %s", type(e).__name__)

    meta = get_model_metadata()
    onboarding_shown = {k: v for k, v in onboarding.items() if k not in ("id", "user_id", "created_at", "updated_at")}
    input_snapshot = {
        "sex": profile.get("sex"),
        "date_of_birth": profile.get("date_of_birth"),
        "height_cm": profile.get("height_cm"),
        "weight_kg": profile.get("weight_kg"),
        "onboarding": onboarding_shown,
        "clinical": get_clinical_baseline_data(user_id),
        "timeline": get_recent_telemetry_timeline(user_id),
    }
    return {
        "model_features": _json_safe(model_features),
        "input_snapshot": _json_safe(input_snapshot),
        "model_version": meta.get("model_identifier"),
        "model_hash": meta.get("model_hash"),
    }


def open_round(profile: Dict[str, Any], lane: str, reason: str, status: Dict[str, Any],
               created_by: Optional[str] = None) -> Optional[Dict[str, Any]]:
    repo = get_case_review_repo()
    if repo.get_open_case_for_patient(profile["id"]):
        return None
    record = {
        "patient_id": profile["id"],
        "case_code": get_deterministic_case_id(profile["id"]),
        "lane": lane,
        "reason": reason,
        "status": "open",
        "app_score": status.get("score"),
        "app_tier": status.get("tier"),
        "app_scorer": status.get("scorer") if status.get("scorer") in SCORERS else "unknown",
        "created_by": created_by,
        **build_snapshot(profile),
    }
    return repo.create_review_case(record)


def refresh_queue(now=None) -> Dict[str, List[str]]:
    """Opens urgent and re-review rounds; an open sample round that turns urgent moves lanes."""
    repo = get_case_review_repo()
    opened, upgraded = [], []
    for profile in _eligible_patients():
        status = current_app_status(profile["id"])
        reason = urgent_reason(profile["id"], status, now)
        existing = repo.get_open_case_for_patient(profile["id"])
        if existing:
            if reason and existing.get("lane") != "urgent":
                repo.update_review_case(existing["id"], {"lane": "urgent", "reason": reason})
                upgraded.append(existing["id"])
            continue
        lane = "urgent" if reason else None
        if not reason:
            reason = rereview_reason(profile["id"], status)
            lane = "rereview" if reason else None
        if lane:
            created = open_round(profile, lane, reason, status)
            if created:
                opened.append(created.get("id"))
    return {"opened": opened, "upgraded": upgraded}


def draw_sample(created_by: Optional[str], now=None, rng: Optional[random.Random] = None) -> List[Dict[str, Any]]:
    """Random pick across all four levels, Stable included, skipping anyone reviewed recently."""
    now = now or utc_now()
    rng = rng or random.SystemRandom()
    repo = get_case_review_repo()
    cooldown = now - timedelta(days=rules.SAMPLE_COOLDOWN_DAYS)

    by_tier: Dict[str, List] = {tier: [] for tier in rules.TIERS}
    for profile in _eligible_patients():
        rounds = repo.list_patient_cases(profile["id"])
        if any(r.get("status") == "open" for r in rounds):
            continue
        if any((parse_utc(r.get("created_at")) or cooldown) > cooldown for r in rounds):
            continue
        status = current_app_status(profile["id"])
        if status.get("tier") in by_tier:
            by_tier[status["tier"]].append((profile, status))

    opened = []
    for tier in rules.TIERS:
        pool = by_tier[tier]
        for profile, status in rng.sample(pool, min(rules.SAMPLE_PER_TIER, len(pool))):
            created = open_round(profile, "sample", "Weekly random sample", status, created_by)
            if created:
                opened.append(created)
    return opened


def _age(dob: Any, now) -> Optional[int]:
    born = parse_utc(dob) if isinstance(dob, str) else None
    if not born:
        return None
    today = to_local_date(now)
    b = born.date()
    return today.year - b.year - ((today.month, today.day) < (b.month, b.day))


def list_queue(now=None) -> List[Dict[str, Any]]:
    """Open rounds in review order, with each expert section's progress. The app's level is left out."""
    now = now or utc_now()
    repo = get_case_review_repo()
    profiles = get_profile_repo()
    items = []
    for rc in repo.list_review_cases(status="open"):
        done = {s.get("section") for s in repo.list_sections(review_case_id=rc["id"])}
        opened_at = parse_utc(rc.get("created_at")) or now
        hours = max(0, int((now - opened_at).total_seconds() // 3600))
        patient = profiles.get_by_id(rc["patient_id"]) or {}
        items.append({
            "id": rc["id"],
            "case_code": rc.get("case_code"),
            "lane": rc.get("lane"),
            "reason": rc.get("reason"),
            "opened_at": rc.get("created_at"),
            "waiting_hours": hours,
            "overdue": rc.get("lane") == "urgent" and hours > rules.URGENT_REVIEW_HOURS,
            "age": _age(patient.get("date_of_birth"), now),
            "sex": patient.get("sex"),
            "sections": {section: section in done for section in SECTIONS},
        })
    items.sort(key=lambda i: (rules.LANE_ORDER.get(i["lane"], 9), i["opened_at"] or ""))
    return items
