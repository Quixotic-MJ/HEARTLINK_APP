"""
HL-054: the case review queue.

HL-168 (panel revision, 2026-11-24): one clear flow. An admin picks this week's random sample (draw_sample), and every
case then goes through three steps:
- check:   the Cardiologist, the Dietitian and the Physical Therapist each answer their part;
- approve: every part is in, and the Cardiologist approves it for the dataset or leaves it out;
- done:    approved, left out, or a practice review (which can't be used).
Nobody monitors users, so nothing opens a case by itself any more: the urgent and re-review lanes were removed. Older
cases from those lanes stay and are marked as older.

Each round stores what the app said at that moment and the 37 inputs the baseline model reads,
so later comparisons and datasets use exactly what the reviewers saw.
"""
import json
import logging
import math
import random
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.db.repositories import (
    get_baseline_repo,
    get_case_review_repo,
    get_hss_repo,
    get_lab_results_repo,
    get_profile_repo,
)
from app.services import review_rules as rules
from app.services.cases import get_deterministic_case_id
from app.utils.time import parse_utc, to_local_date, utc_now

logger = logging.getLogger(__name__)

SCORERS = ("heart_score", "baseline_model", "bp_rules", "lifestyle_points", "unknown")
SECTIONS = ("cardiology", "nutrition", "exercise")
OLDER_LANES = ("urgent", "rereview")


def _json_safe(value: Any) -> Any:
    """Plain JSON for the database: dates become strings, and NaN or infinity (an unanswered model input) becomes null."""
    def clean(v):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        if isinstance(v, dict):
            return {k: clean(x) for k, x in v.items()}
        if isinstance(v, (list, tuple)):
            return [clean(x) for x in v]
        return v
    return json.loads(json.dumps(clean(json.loads(json.dumps(value, default=str))), allow_nan=False))


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
        if factors.get("source") == "heart_score":
            scorer = "heart_score"
        elif source == "baseline":
            scorer = "baseline_model"
        elif source == "telemetry" and factors.get("source") == "lifestyle_composite":
            scorer = "lifestyle_points"
        elif source == "telemetry":
            scorer = "bp_rules"
        else:
            scorer = "unknown"
        # HL-139: the Heart risk saved with the same record, shown to the expert as extra information
        risk = factors.get("risk") if isinstance(factors.get("risk"), dict) else None
        return {"score": latest.get("score"), "tier": latest.get("tier"), "scorer": scorer,
                "heart_risk": risk if risk and risk.get("available") else None}
    return {"score": None, "tier": None, "scorer": "unknown", "heart_risk": None}


def risk_band_of(status: Dict[str, Any]) -> Optional[str]:
    """HL-153: the app's Heart risk band now, or None (under 30, over 79, or not worked out yet)."""
    band = (status.get("heart_risk") or {}).get("band")
    return band if band in rules.RISK_BANDS else None


LAB_FIELDS = ("kind", "test_date", "total_cholesterol", "hdl", "ldl", "egfr", "creatinine", "fasting_glucose", "hba1c",
              "has_diabetes", "cholesterol_medicine")


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
    try:
        labs = get_lab_results_repo().list(user_id)
    except Exception as e:
        logger.warning("Lab results unavailable for a review round: %s", type(e).__name__)
        labs = []
    input_snapshot = {
        "sex": profile.get("sex"),
        "date_of_birth": profile.get("date_of_birth"),
        "height_cm": profile.get("height_cm"),
        "weight_kg": profile.get("weight_kg"),
        "onboarding": onboarding_shown,
        "clinical": get_clinical_baseline_data(user_id),
        "timeline": get_recent_telemetry_timeline(user_id),
        # HL-168: when setup was done (the health check is only asked since 2026-11-23) and the lab results, so the
        # Cardiologist sees everything the Heart risk uses
        "setup_at": onboarding.get("created_at"),
        "labs": [{k: lab.get(k) for k in LAB_FIELDS if lab.get(k) is not None} for lab in labs],
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
        # HL-153: the Heart risk is what the Cardiologist's answer is compared with
        "app_risk_band": risk_band_of(status),
        "app_risk_percent": (status.get("heart_risk") or {}).get("ascvd_10") if risk_band_of(status) else None,
        "app_risk_kind": (status.get("heart_risk") or {}).get("kind") if risk_band_of(status) else None,
        "created_by": created_by,
        **build_snapshot(profile),
    }
    if status.get("heart_risk"):
        # HL-139: the expert sees the Heart risk next to the habits score; it doesn't change what they're asked
        record["input_snapshot"] = {**record["input_snapshot"], "heart_risk": _json_safe(status["heart_risk"])}
    return repo.create_review_case(record)


def draw_sample(created_by: Optional[str], now=None, rng: Optional[random.Random] = None) -> List[Dict[str, Any]]:
    """HL-153: a random pick across the four Heart risk bands, Low included, skipping anyone reviewed recently
    (archived rounds don't count).
    Patients without a Heart risk (under 30, over 79) have nothing to compare, so they aren't sampled."""
    now = now or utc_now()
    rng = rng or random.SystemRandom()
    repo = get_case_review_repo()
    cooldown = now - timedelta(days=rules.SAMPLE_COOLDOWN_DAYS)

    by_band: Dict[str, List] = {band: [] for band in rules.RISK_BANDS}
    for profile in _eligible_patients():
        # An archived round was taken out of the review (a test case, or one opened before HL-153), so it doesn't
        # count as a recent review (2026-11-18)
        rounds = [r for r in repo.list_patient_cases(profile["id"]) if r.get("status") != "archived"]
        if any(r.get("status") == "open" for r in rounds):
            continue
        if any((parse_utc(r.get("created_at")) or cooldown) > cooldown for r in rounds):
            continue
        status = current_app_status(profile["id"])
        band = risk_band_of(status)
        if band:
            by_band[band].append((profile, status))

    opened = []
    for band in rules.RISK_BANDS:
        pool = by_band[band]
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


def section_progress(rc: Dict[str, Any], done: set, recommendations: Dict[str, List]) -> Dict[str, str]:
    """done / waiting / not_needed per section. A food or exercise check with nothing recommended is not needed."""
    progress = {}
    for section in SECTIONS:
        if section in done:
            progress[section] = "done"
        elif section == "nutrition" and not recommendations.get("recipes"):
            progress[section] = "not_needed"
        elif section == "exercise" and not recommendations.get("exercises"):
            progress[section] = "not_needed"
        else:
            progress[section] = "waiting"
    return progress


def case_stage(rc: Dict[str, Any], sections: Dict[str, Dict[str, Any]], progress: Dict[str, str]) -> Dict[str, Any]:
    """HL-168: which step a case is at, and for a finished one, what happened to it."""
    if rc.get("status") == "open" or "waiting" in progress.values():
        return {"stage": "check", "outcome": None}
    if not (sections.get("cardiology") or {}).get("is_clinical"):
        return {"stage": "done", "outcome": "practice"}
    decided = rc.get("dataset_status") or "waiting"
    if decided in ("approved", "left_out"):
        return {"stage": "done", "outcome": decided}
    return {"stage": "approve", "outcome": None}


def list_queue(now=None) -> List[Dict[str, Any]]:
    """
    HL-168: every case that wasn't archived, with its step (check, approve, done) and each part's progress. The app's
    own answer is left out, so the list can't influence a reviewer.
    """
    from app.services.review_sections import recommendations_for

    now = now or utc_now()
    repo = get_case_review_repo()
    profiles = get_profile_repo()
    recs_by_tier: Dict[Any, Dict[str, List]] = {}
    items = []
    for rc in repo.list_review_cases(status="open") + repo.list_review_cases(status="complete"):
        # 2026-11-12: the lists depend on the patient (diet, allergies, PAR-Q+), not only the level
        key = (rc.get("app_tier"), rc.get("patient_id"))
        if key not in recs_by_tier:
            recs_by_tier[key] = recommendations_for(rc)
        sections = {s.get("section"): s for s in repo.list_sections(review_case_id=rc["id"])}
        progress = section_progress(rc, set(sections), recs_by_tier[key])
        patient = profiles.get_by_id(rc["patient_id"]) or {}
        items.append({
            "id": rc["id"],
            "case_code": rc.get("case_code"),
            "older": rc.get("lane") in OLDER_LANES,
            "status": rc.get("status"),
            "opened_at": rc.get("created_at"),
            "age": _age(patient.get("date_of_birth"), now),
            "sex": patient.get("sex"),
            "sections": progress,
            **case_stage(rc, sections, progress),
        })
    order = {stage: i for i, stage in enumerate(rules.STAGES)}
    # Step by step; within checking, cases still waiting for the Cardiologist first; oldest first
    items.sort(key=lambda i: (order[i["stage"]], i["status"] != "open", i["opened_at"] or ""))
    return items


def queue_summary(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """HL-168: the counts on the four steps, and when cases were last picked."""
    repo = get_case_review_repo()
    picked = [r.get("created_at") for r in repo.list_review_cases(lane="sample") if r.get("status") != "archived"]
    return {
        "picked": len(items),
        "check": sum(1 for i in items if i["stage"] == "check"),
        "approve": sum(1 for i in items if i["stage"] == "approve"),
        "approved": sum(1 for i in items if i["outcome"] == "approved"),
        "done": sum(1 for i in items if i["stage"] == "done"),
        "last_picked_at": max(picked) if picked else None,
    }
