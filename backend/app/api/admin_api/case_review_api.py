from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
import uuid
from app.utils.security import get_current_admin_user
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

def _require_medical_expert(current_user: dict = Depends(get_current_admin_user)) -> dict:
    role = current_user.get("role")
    if role != "medical_expert":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Medical Expert role required"
        )
    return current_user

def _get_ml_hss(user_id: str) -> dict:
    user_hss_history = get_hss_repo().list_hss_history(user_id)
    if user_hss_history:
        latest = user_hss_history[0]
        return {"score": latest.get("score"), "tier": latest.get("tier")}
        
    p = get_profile_repo().get_by_id(user_id)
    onboarding = get_baseline_repo().get_baseline(user_id)
    if p and onboarding:
        from app.services.hss_service import compute_initial_hss
        try:
            score, tier, _ = compute_initial_hss(onboarding, p)
            return {"score": score, "tier": tier}
        except Exception:
            pass
            
    return {"score": 80, "tier": "Stable"}

def _calculate_age(dob_str: Any) -> int:
    try:
        if isinstance(dob_str, str):
            dob = datetime.fromisoformat(dob_str).date()
        else:
            dob = dob_str
        today = datetime.now().date()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return 0

@router.get("/cases", response_model=List[Dict[str, Any]])
def list_reviewable_cases(current_user: dict = Depends(get_current_admin_user)):
    """List reviewable cases meeting clinical trigger criteria (Systolic > 120, Diastolic > 80, or HSS < 50)."""
    cases = []
    all_profiles = get_profile_repo().list_all()
    patients = [p for p in all_profiles if p.get("role") == "patient" and p.get("onboarding_status") == "complete"]
    
    eval_repo = get_case_review_repo()
    all_evals = eval_repo.list_evaluations()

    for p in patients:
        user_id = p["id"]
        profile_data = get_full_profile(user_id)
        if not profile_data:
            continue
            
        clinical_data = get_clinical_baseline_data(user_id)
        resting_bp = clinical_data.get("resting_bp_mmhg", "120/80")
        try:
            parts = str(resting_bp).split("/")
            sys_bp = int(parts[0].strip())
            dia_bp = int(parts[1].strip())
        except Exception:
            sys_bp, dia_bp = 120, 80
            
        ml_prediction = _get_ml_hss(user_id)
        hss_score = ml_prediction.get("score") if ml_prediction.get("score") is not None else 80
        
        # Clinical triggers: Systolic > 120 OR Diastolic > 80 OR HSS < 50
        if not (sys_bp > 120 or dia_bp > 80 or hss_score < 50):
            continue
            
        # Check if already evaluated
        evaluations = [e for e in all_evals if e.get("user_id") == user_id]
        status_val = "Evaluated" if evaluations else "Pending"
        
        case_id = get_deterministic_case_id(user_id)
        existing_eval = evaluations[0] if evaluations else None
        
        abs_err = None
        expert_tier = None
        if existing_eval:
            expert_score = existing_eval.get("expert_hss_score")
            ml_score = ml_prediction.get("score")
            if expert_score is not None and ml_score is not None:
                abs_err = abs(expert_score - ml_score)
            
            if expert_score is not None:
                if expert_score >= 80:
                    expert_tier = "Stable"
                elif expert_score >= 60:
                    expert_tier = "Moderate"
                elif expert_score >= 50:
                    expert_tier = "Elevated Risk"
                else:
                    expert_tier = "Critical"

        cases.append({
            "case_id": case_id,
            "user_id": user_id,
            "age": _calculate_age(p.get("date_of_birth")),
            "sex": p.get("sex"),
            "conditions": [],
            "ml_predicted_hss": ml_prediction.get("score"),
            "ml_tier": ml_prediction.get("tier"),
            "status": status_val,
            "expert_hss_score": existing_eval.get("expert_hss_score") if existing_eval else None,
            "expert_hss_tier": expert_tier or (existing_eval.get("expert_hss_tier") if existing_eval else None),
            "absolute_error": abs_err if abs_err is not None else (existing_eval.get("absolute_error") if existing_eval else None)
        })
        
    return cases

@router.get("/cases/{user_id}", response_model=Dict[str, Any])
def get_case_detail(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    """Get anonymized baseline data for a specific case with clinical metrics and timeline."""
    profile_data = get_full_profile(user_id)
    if not profile_data:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    p = profile_data["profile"]
    if p.get("role") != "patient":
        raise HTTPException(status_code=400, detail="Requested user is not a patient")
        
    case_id = get_deterministic_case_id(user_id)
    baselines = profile_data.get("baselines", {})
    ml_prediction = _get_ml_hss(user_id)
    
    # Fetch Recommendations based on ML Tier
    ml_tier = ml_prediction.get("tier") or "Stable"
    content_repo = get_content_repo()
    all_recipes = content_repo.list_recipes()
    all_routines = content_repo.list_routines()
    rec_recipes = [r for r in all_recipes if r.get("hss_tier") == ml_tier][:2]
    rec_exercises = [e for e in all_routines if e.get("hss_tier") == ml_tier][:2]
    
    # Fetch existing evaluation if it exists
    existing_eval = get_case_review_repo().get_evaluation(user_id)
    
    risk_category = "Stable"
    if ml_prediction.get("score") is not None:
        if ml_prediction["score"] < 50:
            risk_category = "Critical"
        elif ml_prediction["score"] < 60:
            risk_category = "Warning"

    anonymized_data = {
        "case_id": case_id,
        "user_id": user_id,
        "ml_predicted_hss": ml_prediction.get("score"),
        "ml_tier": ml_tier,
        "riskCategory": risk_category,
        "core": {
            "age": _calculate_age(p.get("date_of_birth")),
            "sex": p.get("sex")
        },
        "clinical": get_clinical_baseline_data(user_id),
        "onboarding": baselines.get("onboarding") or {},
        "timeline": get_recent_telemetry_timeline(user_id),
        "recommendations": {
            "recipes": rec_recipes,
            "exercises": rec_exercises
        },
        "model_metadata": get_model_metadata(user_id),
        "existing_evaluation": _format_evaluation(existing_eval) if existing_eval else None
    }
    
    return anonymized_data

def _format_evaluation(eval_item: dict) -> dict:
    if not eval_item:
        return {}
    res = dict(eval_item)
    if "created_at" in res and isinstance(res["created_at"], datetime):
        res["created_at"] = res["created_at"].isoformat()
    return res

@router.post("/cases/{user_id}/evaluate")
def submit_evaluation(user_id: str, payload: dict, current_user: dict = Depends(_require_medical_expert)):
    """Submit or update an expert evaluation for a specific clinical case."""
    expert_hss_score = payload.get("expert_hss_score")
    notes = payload.get("notes", "")
    recommendation_feedback = payload.get("recommendation_feedback", {})
    adjustment_reasons = payload.get("adjustment_reasons", [])
    reviewer_confidence = payload.get("reviewer_confidence", "High")
    exercise_feedback = payload.get("exercise_feedback", {})
    recipe_feedback = payload.get("recipe_feedback", {})
    
    if expert_hss_score is None or not (1 <= expert_hss_score <= 100):
        raise HTTPException(status_code=400, detail="Expert HSS score must be an integer between 1 and 100.")
        
    p = get_profile_repo().get_by_id(user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    case_id = get_deterministic_case_id(user_id)
    ml_prediction = _get_ml_hss(user_id)
    ml_predicted_hss = ml_prediction.get("score")
    ml_predicted_tier = ml_prediction.get("tier")
    
    if expert_hss_score >= 80:
        expert_hss_tier = "Stable"
    elif expert_hss_score >= 60:
        expert_hss_tier = "Moderate"
    elif expert_hss_score >= 50:
        expert_hss_tier = "Elevated Risk"
    else:
        expert_hss_tier = "Critical"
        
    absolute_error = abs(expert_hss_score - ml_predicted_hss) if ml_predicted_hss is not None else 0
    tier_agreement = (expert_hss_tier == ml_predicted_tier)
    
    model_meta = get_model_metadata(user_id)
    clinical_data = get_clinical_baseline_data(user_id)
    timeline_data = get_recent_telemetry_timeline(user_id)
    onboarding_data = get_baseline_repo().get_baseline(user_id) or {}
    
    input_snapshot = {
        "age": _calculate_age(p.get("date_of_birth")),
        "sex": p.get("sex"),
        "clinical_baseline": clinical_data,
        "onboarding_responses": onboarding_data,
        "telemetry_summary": {
            "vitals_logged_count": len(timeline_data.get("vitals", [])),
            "symptoms_frequency": len(clinical_data.get("symptoms", [])),
            "recent_vital_snapshots": timeline_data.get("vitals", [])[:3]
        },
        "model_features": {
            "resting_bp": clinical_data.get("resting_bp_mmhg"),
            "resting_hr": clinical_data.get("resting_hr_bpm"),
            "symptom_burden": len(clinical_data.get("symptoms", []))
        }
    }
    
    review_context = {
        "evaluated_tier": expert_hss_tier,
        "ml_tier": ml_predicted_tier,
        "ml_score": ml_predicted_hss,
        "absolute_error": absolute_error,
        "tier_agreement": tier_agreement,
        "timestamp": datetime.utcnow().isoformat()
    }

    eval_repo = get_case_review_repo()
    existing_eval = eval_repo.get_evaluation(user_id)
    action = "evaluated" if not existing_eval else "re-evaluated"

    reviewer_name = current_user.get("name") or (current_user.get("first_name", "Expert") + " " + current_user.get("last_name", "")).strip()

    eval_data = {
        "user_id": user_id,
        "case_id": case_id,
        "expert_hss_score": expert_hss_score,
        "expert_hss_tier": expert_hss_tier,
        "notes": notes,
        "recommendation_feedback": recommendation_feedback,
        "reviewer_id": current_user.get("sub", current_user.get("user_id", "expert")),
        "reviewer_name": reviewer_name or "Medical Expert",
        "ml_predicted_hss": ml_predicted_hss,
        "ml_predicted_tier": ml_predicted_tier,
        "absolute_error": absolute_error,
        "tier_agreement": tier_agreement,
        "status": "Logged",
        "model_metadata": model_meta,
        "input_snapshot": input_snapshot,
        "review_context": review_context,
        "adjustment_reasons": adjustment_reasons,
        "reviewer_confidence": reviewer_confidence,
        "exercise_feedback": exercise_feedback,
        "recipe_feedback": recipe_feedback
    }

    evaluation = eval_repo.create_or_update_evaluation(eval_data)
    
    # Log admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action=action,
        target_type="case",
        target_id=user_id,
        target_name=case_id
    )
    
    return {"status": "success", "evaluation": evaluation}

@router.get("/evaluations", response_model=List[Dict[str, Any]])
def list_evaluations(current_user: dict = Depends(get_current_admin_user)):
    """List all expert evaluations for calibration history."""
    all_evals = get_case_review_repo().list_evaluations()
    return [_format_evaluation(e) for e in all_evals]

@router.get("/evaluations/{eval_id}", response_model=Dict[str, Any])
def get_evaluation(eval_id: str, current_user: dict = Depends(get_current_admin_user)):
    evaluation = get_case_review_repo().get_evaluation(eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return _format_evaluation(evaluation)

@router.put("/evaluations/{eval_id}/archive")
def archive_evaluation(eval_id: str, current_user: dict = Depends(get_current_admin_user)):
    eval_repo = get_case_review_repo()
    evaluation = eval_repo.archive_evaluation(eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    admin_id = current_user.get("user_id") if current_user else "admin"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action="archived",
        target_type="case",
        target_id=evaluation.get("user_id"),
        target_name=evaluation.get("case_id")
    )
    
    return {"status": "success", "evaluation": evaluation}

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

@router.get("/calibration/metrics")
def get_calibration_analytics(current_user: dict = Depends(get_current_admin_user)):
    """Calculate and return calibration statistics for all active/eligible records."""
    all_evals = get_case_review_repo().list_evaluations()
    eligible = [ev for ev in all_evals if is_evaluation_eligible(ev)[0]]
            
    total = len(eligible)
    if total == 0:
        return {
            "total_eligible_evaluations": 0,
            "average_absolute_error": 0.0,
            "mae": 0.0,
            "tier_agreement_rate": 0.0,
            "tier_disagreement_count": 0,
            "average_error_by_hss_tier": {},
            "error_distribution": {"<5": 0, "5-9": 0, "10-14": 0, ">=15": 0}
        }
    
    errors = [ev.get("absolute_error", 0) for ev in eligible]
    mae = sum(errors) / total
    
    agreement_count = sum(1 for ev in eligible if ev.get("tier_agreement"))
    agreement_rate = (agreement_count / total) * 100
    disagreement_count = total - agreement_count
    
    tier_errors = {}
    tier_counts = {}
    for ev in eligible:
        tier = ev.get("ml_predicted_tier")
        if not tier:
            continue
        tier_errors[tier] = tier_errors.get(tier, 0) + ev.get("absolute_error", 0)
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    avg_error_by_tier = {}
    for tier, total_err in tier_errors.items():
        avg_error_by_tier[tier] = round(total_err / tier_counts[tier], 2)
        
    dist = {"<5": 0, "5-9": 0, "10-14": 0, ">=15": 0}
    for err in errors:
        if err < 5:
            dist["<5"] += 1
        elif err < 10:
            dist["5-9"] += 1
        elif err < 15:
            dist["10-14"] += 1
        else:
            dist[">=15"] += 1
            
    return {
        "total_eligible_evaluations": total,
        "average_absolute_error": round(mae, 2),
        "mae": round(mae, 2),
        "tier_agreement_rate": round(agreement_rate, 2),
        "tier_disagreement_count": disagreement_count,
        "average_error_by_hss_tier": avg_error_by_tier,
        "error_distribution": dist
    }

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
        
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
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
        "created_at": datetime.utcnow().isoformat(),
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
