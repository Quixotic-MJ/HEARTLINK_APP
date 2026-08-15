from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.utils.security import get_current_admin_user
from app.services.users import get_full_profile
from app.services.cases import get_deterministic_case_id
from app.services.clinical import (
    get_clinical_baseline_data,
    get_recent_telemetry_timeline,
    get_model_metadata
)

router = APIRouter(prefix="/api/admin", tags=["Case Review & Calibration"])

def _get_ml_hss(user_id: str) -> dict:
    user_hss_history = [c for c in mock_db.hss_history if c["user_id"] == user_id]
    if user_hss_history:
        latest = sorted(user_hss_history, key=lambda x: x.get("computed_at", datetime.min), reverse=True)[0]
        return {"score": latest.get("score"), "tier": latest.get("tier")}
        
    # Dynamic fallback: compute HSS from onboarding responses if history is missing
    p = next((x for x in mock_db.profiles if x["id"] == user_id), None)
    onboarding = next((o for o in mock_db.baseline_onboarding if o["user_id"] == user_id), None)
    if p and onboarding:
        from app.services.hss_service import compute_initial_hss
        try:
            score, tier, _ = compute_initial_hss(onboarding, p)
            return {"score": score, "tier": tier}
        except Exception:
            pass
            
    return {"score": 80, "tier": "Stable"} # General default fallback

def _calculate_age(dob_str: Any) -> int:
    try:
        if isinstance(dob_str, str):
            dob = datetime.fromisoformat(dob_str).date()
        else:
            dob = dob_str # If already a date object
        today = datetime.now().date()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return 0

@router.get("/cases", response_model=List[Dict[str, Any]])
def list_reviewable_cases(current_user: dict = Depends(get_current_admin_user)):
    """List all onboarded users as anonymized cases for review."""
    cases = []
    
    # We only want patients who have completed onboarding
    patients = [p for p in mock_db.profiles if p.get("role") == "patient" and p.get("onboarding_status") == "complete"]
    
    for p in patients:
        user_id = p["id"]
        profile_data = get_full_profile(user_id)
        if not profile_data:
            continue
            
        ml_prediction = _get_ml_hss(user_id)
        
        # Check if already evaluated
        evaluations = [e for e in mock_db.expert_evaluations if e["user_id"] == user_id]
        status = "Evaluated" if evaluations else "Pending"
        
        # Determine pseudo case_id
        case_id = get_deterministic_case_id(user_id)
        
        existing_eval = evaluations[0] if evaluations else None
        
        # Self-healing derived metrics for legacy mock logs
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
            "conditions": [], # Handled by HSS metrics
            "ml_predicted_hss": ml_prediction.get("score"),
            "ml_tier": ml_prediction.get("tier"),
            "status": status,
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
    ml_tier = ml_prediction.get("tier")
    rec_recipes = [r for r in mock_db.recipes if r.get("hss_tier") == ml_tier][:2]
    rec_exercises = [e for e in mock_db.exercise_routines if e.get("hss_tier") == ml_tier][:2]
    
    # Fetch existing evaluation if it exists (for editing)
    existing_eval = next((e for e in mock_db.expert_evaluations if e["user_id"] == user_id), None)
    
    # Determine riskCategory for UI layout
    risk_category = "Stable"
    if ml_prediction.get("score") is not None:
        if ml_prediction["score"] < 50:
            risk_category = "Critical"
        elif ml_prediction["score"] < 60:
            risk_category = "Warning"

    # Ensure all baseline data is presented completely anonymized
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
        "expert_hss_score": existing_eval.get("expert_hss_score") if existing_eval else None,
        "notes": existing_eval.get("notes") if existing_eval else "",
        "recommendation_feedback": existing_eval.get("recommendation_feedback") if existing_eval else "",
        "adjustment_reasons": existing_eval.get("adjustment_reasons", []) if existing_eval else [],
        "reviewer_confidence": existing_eval.get("reviewer_confidence") if existing_eval else None,
        "exercise_feedback": existing_eval.get("exercise_feedback", {"status": None, "notes": ""}) if existing_eval else {"status": None, "notes": ""},
        "recipe_feedback": existing_eval.get("recipe_feedback", {"status": None, "notes": ""}) if existing_eval else {"status": None, "notes": ""}
    }
    
    return anonymized_data

def _format_evaluation(eval_item: dict) -> dict:
    if not eval_item:
        return {}
    res = dict(eval_item)
    if "adjustment_reasons" not in res:
        res["adjustment_reasons"] = []
    if "reviewer_confidence" not in res:
        res["reviewer_confidence"] = None
    if "exercise_feedback" not in res:
        res["exercise_feedback"] = {"status": None, "notes": ""}
    if "recipe_feedback" not in res:
        res["recipe_feedback"] = {"status": None, "notes": ""}
    return res

@router.post("/cases/{user_id}/evaluate")
def submit_evaluation(user_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    """Submit an expert evaluation providing the ground-truth HSS score and recommendation feedback."""
    expert_hss_score = payload.get("expert_hss_score")
    notes = payload.get("notes")
    recommendation_feedback = payload.get("recommendation_feedback")
    
    adjustment_reasons = payload.get("adjustment_reasons", [])
    reviewer_confidence = payload.get("reviewer_confidence")
    exercise_feedback = payload.get("exercise_feedback")
    recipe_feedback = payload.get("recipe_feedback")
    
    # 1. Validation check on notes
    if not notes or not isinstance(notes, str) or len(notes.strip()) < 10:
        raise HTTPException(status_code=400, detail="Risk interpretation notes are required and must contain at least 10 non-whitespace characters.")
    notes = notes.strip()
    
    # 2. Validation check on HSS score
    if expert_hss_score is None:
        raise HTTPException(status_code=400, detail="expert_hss_score is required")
        
    # 3. Validation check on adjustment reasons list (Mutual exclusivity rule)
    allowed_reasons = {
        "blood_pressure_pattern", "heart_rate_pattern", "symptoms",
        "medication_related_factor", "activity_pattern", "nutrition_sodium_pattern",
        "sleep_pattern", "baseline_information", "other", "model_consistent"
    }
    if not isinstance(adjustment_reasons, list):
        raise HTTPException(status_code=400, detail="adjustment_reasons must be a list of strings.")
    for reason in adjustment_reasons:
        if reason not in allowed_reasons:
            raise HTTPException(status_code=400, detail=f"Invalid adjustment reason code: {reason}")
    if "model_consistent" in adjustment_reasons and len(adjustment_reasons) > 1:
        raise HTTPException(status_code=400, detail="Cannot select both 'Model assessment appears consistent' and other adjustment reasons.")
        
    # 4. Validation check on confidence
    if reviewer_confidence is not None and reviewer_confidence not in {"low", "medium", "high"}:
        raise HTTPException(status_code=400, detail="reviewer_confidence must be 'low', 'medium', or 'high'.")
        
    # 5. Validation check on exercise_feedback
    if exercise_feedback is not None:
        if not isinstance(exercise_feedback, dict):
            raise HTTPException(status_code=400, detail="exercise_feedback must be an object.")
        status = exercise_feedback.get("status")
        if status not in {"appropriate", "needs_review", None}:
            raise HTTPException(status_code=400, detail="exercise_feedback status must be 'appropriate', 'needs_review', or null.")
            
    # 6. Validation check on recipe_feedback
    if recipe_feedback is not None:
        if not isinstance(recipe_feedback, dict):
            raise HTTPException(status_code=400, detail="recipe_feedback must be an object.")
        status = recipe_feedback.get("status")
        if status not in {"appropriate", "needs_review", None}:
            raise HTTPException(status_code=400, detail="recipe_feedback status must be 'appropriate', 'needs_review', or null.")
        
    profile_data = get_full_profile(user_id)
    if not profile_data:
        raise HTTPException(status_code=404, detail="User profile not found")
    p = profile_data["profile"]
    baselines = profile_data.get("baselines", {})
    onboarding = baselines.get("onboarding") or {}
    
    existing_eval = next((e for e in mock_db.expert_evaluations if e["user_id"] == user_id), None)
    action = "updated" if existing_eval else "evaluated"
    case_id = get_deterministic_case_id(user_id)
    
    # Derive Expert HSS Tier consistently using application thresholds
    expert_hss_tier = "Stable"
    if expert_hss_score < 50:
        expert_hss_tier = "Critical"
    elif expert_hss_score < 60:
        expert_hss_tier = "Elevated Risk"
    elif expert_hss_score < 80:
        expert_hss_tier = "Moderate"
        
    # Get clinical telemetry values
    clinical_data = get_clinical_baseline_data(user_id)
    
    # Extract model exact transformed features for input_snapshot
    from app.services.feature_transform import transform_to_model_features
    import numpy as np
    try:
        features_df = transform_to_model_features(onboarding, p)
        if features_df is None or features_df.empty:
            raise Exception("Feature transformation returned empty or None DataFrame.")
        features_dict = features_df.replace({np.nan: None}).iloc[0].to_dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature transformation failed: {str(e)}")

    # Strict snapshot checks
    if not features_dict:
        raise HTTPException(status_code=400, detail="Feature transformation generated an empty feature set.")

    required_features = [
        'RIDAGEYR', 'RIAGENDR', 'PAQ605', 'PAQ610', 'PAD615', 'PAQ620', 'PAQ625', 'PAD630', 
        'PAQ635', 'PAQ640', 'PAD645', 'PAQ650', 'PAQ655', 'PAD660', 'PAQ665', 'PAQ670', 'PAD675', 
        'PAD680', 'SLD012', 'SMQ020', 'SMQ040', 'ALQ111', 'ALQ121', 'ALQ130', 'ALQ142', 'DR1TKCAL', 
        'DR1TPROT', 'DR1TCARB', 'DR1TSUGR', 'DR1TFIBE', 'DR1TTFAT', 'DR1TSFAT', 'DR1TMFAT', 'DR1TPFAT', 
        'DR1TCHOL', 'DR1TSODI', 'DR1TPOTA'
    ]
    for f in required_features:
        if f not in features_dict:
            raise HTTPException(status_code=400, detail=f"Required model feature is missing from the generated snapshot: {f}")
        
    for f, val in features_dict.items():
        if val is not None:
            if not isinstance(val, (int, float, np.integer, np.floating)):
                raise HTTPException(status_code=400, detail=f"Invalid non-numeric value for feature {f}: {val}")

    ml_prediction = _get_ml_hss(user_id)
    ml_predicted_hss = ml_prediction.get("score")
    ml_predicted_tier = ml_prediction.get("tier")
    
    # Create input snapshot
    input_snapshot = {
        "user_id": user_id,
        "case_id": case_id,
        "age": _calculate_age(p.get("date_of_birth")),
        "sex": p.get("sex"),
        "sleep_hours": onboarding.get("sleep_hours"),
        "ever_smoked": onboarding.get("ever_smoked"),
        "smoke_now": onboarding.get("smoke_now"),
        "sodium_frequency": onboarding.get("salty_food_freq"),
        "family_history": onboarding.get("family_history"),
        "diet_level": onboarding.get("diet_level"),
        "fried_food_freq": onboarding.get("fried_food_freq"),
        "salty_food_freq": onboarding.get("salty_food_freq"),
        "fruit_veg_servings": onboarding.get("fruit_veg_servings"),
        "resting_bp_mmhg": clinical_data.get("resting_bp_mmhg"),
        "max_heart_rate_bpm": clinical_data.get("max_heart_rate_bpm"),
        "on_medication": clinical_data.get("on_medication"),
        "diagnosed_conditions": clinical_data.get("diagnosed_conditions"),
        "model_features": features_dict,
        "ml_predicted_hss": ml_predicted_hss,
        "ml_predicted_tier": ml_predicted_tier,
    }
    
    # Create review context
    review_context = {
        "recent_telemetry": get_recent_telemetry_timeline(user_id)
    }
    
    # Get model metadata
    model_meta = get_model_metadata()
    
    # Calculate derived metrics
    absolute_error = abs(expert_hss_score - ml_predicted_hss) if ml_predicted_hss is not None else None
    tier_agreement = (ml_predicted_tier == expert_hss_tier) if ml_predicted_tier else False

    if existing_eval:
        existing_eval["expert_hss_score"] = expert_hss_score
        existing_eval["expert_hss_tier"] = expert_hss_tier
        existing_eval["notes"] = notes
        existing_eval["recommendation_feedback"] = recommendation_feedback
        existing_eval["reviewed_at"] = datetime.utcnow()
        existing_eval["ml_predicted_hss"] = ml_predicted_hss
        existing_eval["ml_predicted_tier"] = ml_predicted_tier
        existing_eval["absolute_error"] = absolute_error
        existing_eval["tier_agreement"] = tier_agreement
        existing_eval["model_metadata"] = model_meta
        existing_eval["input_snapshot"] = input_snapshot
        existing_eval["review_context"] = review_context
        # Extended fields
        existing_eval["adjustment_reasons"] = adjustment_reasons
        existing_eval["reviewer_confidence"] = reviewer_confidence
        existing_eval["exercise_feedback"] = exercise_feedback
        existing_eval["recipe_feedback"] = recipe_feedback
        evaluation = existing_eval
    else:
        existing_ids = {e["id"] for e in mock_db.expert_evaluations}
        idx = len(mock_db.expert_evaluations) + 1000
        while f"CAL-{idx}" in existing_ids:
            idx += 1
        eval_id = f"CAL-{idx}"
        reviewer_name = current_user.get("name") or (current_user.get("first_name", "Expert") + " " + current_user.get("last_name", ""))
        
        evaluation = {
            "id": eval_id,
            "user_id": user_id,
            "case_id": case_id,
            "expert_hss_score": expert_hss_score,
            "expert_hss_tier": expert_hss_tier,
            "notes": notes,
            "recommendation_feedback": recommendation_feedback,
            "reviewer_id": current_user.get("sub", current_user.get("user_id", "admin")),
            "reviewer_name": reviewer_name.strip(),
            "ml_predicted_hss": ml_predicted_hss,
            "ml_predicted_tier": ml_predicted_tier,
            "absolute_error": absolute_error,
            "tier_agreement": tier_agreement,
            "status": "Logged",
            "model_metadata": model_meta,
            "input_snapshot": input_snapshot,
            "review_context": review_context,
            # Extended fields
            "adjustment_reasons": adjustment_reasons,
            "reviewer_confidence": reviewer_confidence,
            "exercise_feedback": exercise_feedback,
            "recipe_feedback": recipe_feedback,
            "created_at": datetime.utcnow()
        }
        mock_db.expert_evaluations.append(evaluation)
        
    mock_db.save_logs()
    
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
    sorted_evals = sorted(mock_db.expert_evaluations, key=lambda x: x.get("created_at", datetime.min), reverse=True)
    return [_format_evaluation(e) for e in sorted_evals]

@router.get("/evaluations/{eval_id}", response_model=Dict[str, Any])
def get_evaluation(eval_id: str, current_user: dict = Depends(get_current_admin_user)):
    evaluation = next((e for e in mock_db.expert_evaluations if e["id"] == eval_id), None)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return _format_evaluation(evaluation)

@router.put("/evaluations/{eval_id}/archive")
def archive_evaluation(eval_id: str, current_user: dict = Depends(get_current_admin_user)):
    evaluation = next((e for e in mock_db.expert_evaluations if e["id"] == eval_id), None)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    evaluation["status"] = "Archived"
    mock_db.save_logs()
    
    # Log admin activity
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
    """
    Checks if an expert evaluation record is eligible for dataset export.
    Returns (is_eligible, exclusion_reason).
    """
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
    eligible = []
    for ev in mock_db.expert_evaluations:
        is_ok, _ = is_evaluation_eligible(ev)
        if is_ok:
            eligible.append(ev)
            
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
    
    errors = [ev["absolute_error"] for ev in eligible]
    mae = sum(errors) / total
    
    agreement_count = sum(1 for ev in eligible if ev["tier_agreement"])
    agreement_rate = (agreement_count / total) * 100
    disagreement_count = total - agreement_count
    
    tier_errors = {}
    tier_counts = {}
    for ev in eligible:
        tier = ev["ml_predicted_tier"]
        if not tier:
            continue
        tier_errors[tier] = tier_errors.get(tier, 0) + ev["absolute_error"]
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
    
    # Partition evaluations
    eligible_evals = []
    excluded_count = 0
    excluded_reasons = []
    
    for ev in mock_db.expert_evaluations:
        is_ok, reason = is_evaluation_eligible(ev)
        if is_ok:
            m_hash = ev["model_metadata"].get("model_hash")
            if model_hash_filter and m_hash != model_hash_filter:
                excluded_count += 1
                excluded_reasons.append(f"Model hash does not match filter {model_hash_filter}")
                continue
            eligible_evals.append(ev)
        else:
            excluded_count += 1
            excluded_reasons.append(reason)
            
    # Check for mixed models
    hashes = list(set(ev["model_metadata"].get("model_hash") for ev in eligible_evals if ev["model_metadata"].get("model_hash")))
    if len(hashes) > 1 and not allow_mixed_models:
        raise HTTPException(
            status_code=400,
            detail="Multiple model versions detected. Filter by specific model hash or allow mixed versions."
        )
        
    # Generate unique dataset version ID
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    version_idx = 1
    for ds in mock_db.datasets:
        if ds["dataset_id"].startswith(f"dataset-{today_str}-"):
            try:
                idx = int(ds["dataset_id"].split("-")[-1])
                if idx >= version_idx:
                    version_idx = idx + 1
            except ValueError:
                pass
    dataset_id = f"dataset-{today_str}-{version_idx:03d}"
    
    # Anonymize and map rows
    rows = []
    for ev in eligible_evals:
        rows.append({
            "evaluation_id": ev["id"],
            "case_id": ev["case_id"],
            "model_hash": ev["model_metadata"].get("model_hash"),
            "feature_pipeline_identifier": ev["model_metadata"].get("feature_pipeline_version"),
            "expert_hss_score": ev["expert_hss_score"],
            "expert_hss_tier": ev["expert_hss_tier"],
            "ml_predicted_hss": ev["ml_predicted_hss"],
            "ml_predicted_tier": ev["ml_predicted_tier"],
            "absolute_error": ev["absolute_error"],
            "tier_agreement": ev["tier_agreement"],
            "reviewer_confidence": ev.get("reviewer_confidence"),
            "adjustment_reasons": ev.get("adjustment_reasons", []),
            "model_features": ev["input_snapshot"].get("model_features"),
            "evaluation_timestamp": ev["created_at"].isoformat() if isinstance(ev["created_at"], datetime) else ev["created_at"]
        })
        
    dataset_meta = {
        "dataset_id": dataset_id,
        "created_at": datetime.utcnow().isoformat(),
        "source_evaluation_ids": [ev["id"] for ev in eligible_evals],
        "record_count": len(rows),
        "excluded_record_count": excluded_count,
        "model_hashes_represented": hashes,
        "feature_pipeline_versions_represented": list(set(ev["model_metadata"].get("feature_pipeline_version") for ev in eligible_evals if ev["model_metadata"].get("feature_pipeline_version"))),
        "rows": rows
    }
    
    mock_db.datasets.append(dataset_meta)
    mock_db.save_logs()
    
    # Log admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action="exported",
        target_type="dataset",
        target_id=dataset_id,
        target_name=dataset_id
    )
    
    return {"status": "success", "dataset": dataset_meta}

@router.get("/datasets", response_model=List[Dict[str, Any]])
def list_datasets(current_user: dict = Depends(get_current_admin_user)):
    """List all versioned datasets generated for offline calibration."""
    return mock_db.datasets

@router.get("/datasets/{dataset_id}", response_model=Dict[str, Any])
def get_dataset(dataset_id: str, current_user: dict = Depends(get_current_admin_user)):
    """Retrieve details and rows of a specific dataset."""
    dataset = next((ds for ds in mock_db.datasets if ds["dataset_id"] == dataset_id), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/models", response_model=List[Dict[str, Any]])
def list_registered_models(current_user: dict = Depends(get_current_admin_user)):
    """List all models registered in the candidate models log."""
    return mock_db.candidate_models

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
        
    existing = next((cm for cm in mock_db.candidate_models if cm["model_id"] == model_id), None)
    if existing:
        raise HTTPException(status_code=400, detail="Model ID already registered.")
        
    record = {
        "model_id": model_id,
        "artifact_filename": artifact_name,
        "model_hash": model_hash,
        "dataset_id": dataset_id,
        "feature_pipeline_identifier": feature_pipeline,
        "created_at": datetime.utcnow().isoformat(),
        "validation_metrics": val_metrics,
        "status": "candidate"
    }
    
    mock_db.candidate_models.append(record)
    mock_db.save_logs()
    
    return {"status": "success", "model": record}

@router.put("/models/{model_id}/status")
def update_model_status(model_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    """Update status of a registered candidate model (candidate, approved, rejected, deployed)."""
    status = payload.get("status")
    if status not in {"candidate", "approved", "rejected", "deployed"}:
        raise HTTPException(status_code=400, detail="Invalid model status.")
        
    model = next((cm for cm in mock_db.candidate_models if cm["model_id"] == model_id), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")
        
    model["status"] = status
    mock_db.save_logs()
    
    return {"status": "success", "model": model}

@router.post("/retrain")
def retrain_model(current_user: dict = Depends(get_current_admin_user)):
    """Retrains the model using collected expert evaluations."""
    raise HTTPException(status_code=501, detail="Model retraining is now handled offline for the static HSS model.")

