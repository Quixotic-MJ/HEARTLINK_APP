from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
import uuid
from app.utils.security import get_current_admin_user
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.services.users import get_full_profile
from app.services.cases import get_deterministic_case_id
from app.services.clinical import (
    get_clinical_baseline_data,
    get_recent_telemetry_timeline,
    get_model_metadata
)
from app.db.repositories import (
    get_case_review_repo,
    get_profile_repo,
    get_baseline_repo,
    get_hss_repo,
    get_content_repo,
    get_admin_repo
)

router = APIRouter(tags=["Case Review & Calibration"])


# --- HL-054: review queue (rounds in review_cases) -------------------------------------------------
from app.services import review_queue

QUEUE_REFRESH_SECONDS = 300
_last_queue_refresh = {"at": None}


def _require_admin(current_user: dict = Depends(get_current_admin_user)) -> dict:
    if current_user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: Admins only")
    return current_user


def _refresh_queue_if_stale(force: bool = False) -> dict:
    now = utc_now()
    last = _last_queue_refresh["at"]
    if force or last is None or (now - last).total_seconds() >= QUEUE_REFRESH_SECONDS:
        result = review_queue.refresh_queue(now)
        _last_queue_refresh["at"] = now
        return result
    return {"opened": [], "upgraded": []}


@router.get("/review-queue")
def get_review_queue(current_user: dict = Depends(get_current_admin_user)):
    """Open review rounds, urgent first. Also opens any urgent or re-review rounds that are due."""
    _refresh_queue_if_stale()
    return {"items": review_queue.list_queue(), "urgent_review_hours": review_queue.rules.URGENT_REVIEW_HOURS}


@router.post("/review-queue/refresh")
def refresh_review_queue(current_user: dict = Depends(get_current_admin_user)):
    result = _refresh_queue_if_stale(force=True)
    return {"status": "success", "opened": len(result["opened"]), "upgraded": len(result["upgraded"])}


@router.post("/review-queue/sample")
def draw_review_sample(current_user: dict = Depends(_require_admin)):
    """Draws this week's random sample across all levels (admins only)."""
    opened = review_queue.draw_sample(created_by=current_user.get("user_id"))
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action=f"drew a review sample of {len(opened)} cases",
        target_type="case",
        target_id=None,
        target_name="Weekly sample",
    )
    return {"status": "success", "opened": len(opened)}

# --- HL-055 / HL-056: a review round's detail and its expert sections ---------------------------------
from app.services import review_sections


@router.get("/review-queue/{round_id}")
def get_review_case(round_id: str, current_user: dict = Depends(get_current_admin_user)):
    """What every reviewer sees for one round. The app's level appears only after the Cardiologist submits."""
    return review_sections.case_detail(round_id, current_user)


def _log_section(current_user: dict, round_id: str, section: str) -> None:
    from app.utils.activity_helper import record_admin_activity
    rc = review_sections.get_round_or_404(round_id)
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action=f"submitted the {section} review",
        target_type="case",
        target_id=round_id,
        target_name=rc.get("case_code"),
    )


@router.post("/review-queue/{round_id}/cardiology")
def submit_cardiology_review(round_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    saved = review_sections.submit_cardiology(round_id, payload or {}, current_user)
    _log_section(current_user, round_id, "cardiology")
    return {"status": "success", "section": saved, "case": review_sections.case_detail(round_id, current_user)}


@router.post("/review-queue/{round_id}/nutrition")
def submit_nutrition_review(round_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    saved = review_sections.submit_items("nutrition", round_id, payload or {}, current_user)
    _log_section(current_user, round_id, "food check")
    return {"status": "success", "section": saved, "case": review_sections.case_detail(round_id, current_user)}


@router.post("/review-queue/{round_id}/exercise")
def submit_exercise_review(round_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    saved = review_sections.submit_items("exercise", round_id, payload or {}, current_user)
    _log_section(current_user, round_id, "exercise check")
    return {"status": "success", "section": saved, "case": review_sections.case_detail(round_id, current_user)}


def is_evaluation_eligible(eval_item: dict) -> tuple[bool, str]:
    if not eval_item:
        return False, "Record is empty or null."
    if eval_item.get("status") == "Archived":
        return False, "Evaluation is archived."
        
    required_fields = [
        "expert_hss_score",
        "expert_hss_tier",
        "ml_predicted_hss",
        "ml_predicted_tier",
        "absolute_error",
        "input_snapshot",
        "model_metadata",
        "reviewer_id",
        "created_at"
    ]
    for field in required_fields:
        if eval_item.get(field) is None:
            return False, f"Missing required field: {field}"
            
    snapshot = eval_item.get("input_snapshot")
    if not isinstance(snapshot, dict):
        return False, "input_snapshot is not a dictionary."
        
    features = snapshot.get("model_features")
    if not features or not isinstance(features, dict) or len(features) == 0:
        return False, "input_snapshot.model_features is empty or missing."
        
    return True, ""

# --- HL-058: Model Check (replaces Calibration History) ---------------------------------------------
from app.services import model_check as model_check_service


@router.get("/model-check")
def get_model_check(scorer: str = "all", current_user: dict = Depends(get_current_admin_user)):
    """One row per case round with a Cardiologist review, and agreement measures from clinical reviews only."""
    return model_check_service.model_check(scorer)


@router.put("/model-check/{round_id}/archive")
def archive_review_round(round_id: str, current_user: dict = Depends(_require_admin)):
    """Takes a round out of Model Check and the queue (for example a test case). Admins only."""
    rc = review_sections.get_round_or_404(round_id)
    repo = get_case_review_repo()
    repo.update_review_case(rc["id"], {"status": "archived", "archived_at": utc_now().isoformat()})
    repo.archive_sections(rc["id"])
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action="archived a review round",
        target_type="case",
        target_id=rc["id"],
        target_name=rc.get("case_code"),
    )
    return {"status": "success"}


@router.post("/datasets/generate")
def generate_dataset(payload: dict = None, current_user: dict = Depends(get_current_admin_user)):
    """Generate a versioned training dataset from eligible, anonymized expert evaluations."""
    payload = payload or {}
    model_hash_filter = payload.get("model_hash")
    allow_mixed_models = payload.get("allow_mixed_models", False)
    
    eval_repo = get_case_review_repo()
    all_evals = eval_repo.list_evaluations()

    eligible_evals = []
    excluded_count = 0
    excluded_reasons = []
    
    for ev in all_evals:
        is_ok, reason = is_evaluation_eligible(ev)
        if is_ok:
            m_hash = ev.get("model_metadata", {}).get("model_hash")
            if model_hash_filter and m_hash != model_hash_filter:
                excluded_count += 1
                excluded_reasons.append(f"Model hash does not match filter {model_hash_filter}")
                continue
            eligible_evals.append(ev)
        else:
            excluded_count += 1
            excluded_reasons.append(reason)
            
    hashes = list(set(ev.get("model_metadata", {}).get("model_hash") for ev in eligible_evals if ev.get("model_metadata", {}).get("model_hash")))
    if len(hashes) > 1 and not allow_mixed_models:
        raise HTTPException(
            status_code=400,
            detail="Multiple model versions detected. Filter by specific model hash or allow mixed versions."
        )
        
    today_str = utc_now().strftime("%Y-%m-%d")
    existing_datasets = eval_repo.list_datasets()
    version_idx = 1
    for ds in existing_datasets:
        if ds.get("dataset_id", "").startswith(f"dataset-{today_str}-"):
            try:
                idx = int(ds["dataset_id"].split("-")[-1])
                if idx >= version_idx:
                    version_idx = idx + 1
            except ValueError:
                pass
    dataset_id = f"dataset-{today_str}-{version_idx:03d}"
    
    rows = []
    for ev in eligible_evals:
        rows.append({
            "evaluation_id": ev.get("id"),
            "case_id": ev.get("case_id"),
            "model_hash": ev.get("model_metadata", {}).get("model_hash"),
            "feature_pipeline_identifier": ev.get("model_metadata", {}).get("feature_pipeline_version"),
            "expert_hss_score": ev.get("expert_hss_score"),
            "expert_hss_tier": ev.get("expert_hss_tier"),
            "ml_predicted_hss": ev.get("ml_predicted_hss"),
            "ml_predicted_tier": ev.get("ml_predicted_tier"),
            "absolute_error": ev.get("absolute_error"),
            "tier_agreement": ev.get("tier_agreement"),
            "reviewer_confidence": ev.get("reviewer_confidence"),
            "adjustment_reasons": ev.get("adjustment_reasons", []),
            "model_features": ev.get("input_snapshot", {}).get("model_features"),
            "evaluation_timestamp": ev.get("created_at")
        })
        
    dataset_meta = {
        "dataset_id": dataset_id,
        "created_at": utc_now().isoformat(),
        "source_evaluation_ids": [ev.get("id") for ev in eligible_evals],
        "record_count": len(rows),
        "excluded_record_count": excluded_count,
        "model_hashes_represented": hashes,
        "feature_pipeline_versions_represented": list(set(ev.get("model_metadata", {}).get("feature_pipeline_version") for ev in eligible_evals if ev.get("model_metadata", {}).get("feature_pipeline_version"))),
        "rows": rows
    }
    
    created_dataset = eval_repo.create_dataset(dataset_meta)
    
    admin_id = current_user.get("user_id") if current_user else "admin"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action="exported",
        target_type="dataset",
        target_id=dataset_id,
        target_name=dataset_id
    )
    
    return {"status": "success", "dataset": created_dataset}

@router.get("/datasets", response_model=List[Dict[str, Any]])
def list_datasets(current_user: dict = Depends(get_current_admin_user)):
    """List all versioned datasets generated for offline calibration."""
    return get_case_review_repo().list_datasets()

@router.get("/datasets/{dataset_id}", response_model=Dict[str, Any])
def get_dataset(dataset_id: str, current_user: dict = Depends(get_current_admin_user)):
    """Retrieve details and rows of a specific dataset."""
    dataset = get_case_review_repo().get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/models", response_model=List[Dict[str, Any]])
def list_registered_models(current_user: dict = Depends(get_current_admin_user)):
    """List all models registered in the candidate models log."""
    return get_case_review_repo().list_candidate_models()

@router.post("/models")
def register_candidate_model(payload: dict, current_user: dict = Depends(get_current_admin_user)):
    """Register a new candidate model in the registry (retaining Candidate state)."""
    model_id = payload.get("model_id")
    artifact_name = payload.get("artifact_filename")
    model_hash = payload.get("model_hash")
    dataset_id = payload.get("dataset_id")
    feature_pipeline = payload.get("feature_pipeline_identifier")
    val_metrics = payload.get("validation_metrics", {})
    
    if not model_id or not artifact_name or not model_hash or not dataset_id:
        raise HTTPException(status_code=400, detail="Missing required registry columns.")
        
    eval_repo = get_case_review_repo()
    existing_models = eval_repo.list_candidate_models()
    if any(cm.get("model_id") == model_id for cm in existing_models):
        raise HTTPException(status_code=400, detail="Model ID already registered.")
        
    record = {
        "model_id": model_id,
        "artifact_filename": artifact_name,
        "model_hash": model_hash,
        "dataset_id": dataset_id,
        "feature_pipeline_identifier": feature_pipeline,
        "validation_metrics": val_metrics,
        "status": "candidate"
    }
    
    created = eval_repo.register_candidate_model(record)
    return {"status": "success", "model": created}

@router.put("/models/{model_id}/status")
def update_model_status(model_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    """Update status of a registered candidate model (candidate, approved, rejected, deployed)."""
    status_val = payload.get("status")
    if status_val not in {"candidate", "approved", "rejected", "deployed"}:
        raise HTTPException(status_code=400, detail="Invalid model status.")
        
    updated = get_case_review_repo().update_candidate_model_status(model_id, status_val)
    if not updated:
        raise HTTPException(status_code=404, detail="Model not found.")
        
    return {"status": "success", "model": updated}

@router.post("/retrain")
def retrain_model(current_user: dict = Depends(get_current_admin_user)):
    """Retrains the model using collected expert evaluations."""
    raise HTTPException(status_code=501, detail="Model retraining is now handled offline for the static HSS model.")
