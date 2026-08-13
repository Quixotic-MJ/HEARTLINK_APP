from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.utils.security import get_current_admin_user
from app.services.users import get_full_profile

router = APIRouter(prefix="/api/admin", tags=["Case Review & Calibration"])

def _get_ml_hss(user_id: str) -> dict:
    user_hss_history = [c for c in mock_db.hss_history if c["user_id"] == user_id]
    if user_hss_history:
        latest = sorted(user_hss_history, key=lambda x: x.get("computed_at", datetime.min), reverse=True)[0]
        return {"score": latest.get("score"), "tier": latest.get("tier")}
    return {"score": None, "tier": None}

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
            
        baselines = profile_data.get("baselines", {})
        onboarding = baselines.get("onboarding") or {}
        
        ml_prediction = _get_ml_hss(user_id)
        
        # Check if already evaluated
        evaluations = [e for e in mock_db.expert_evaluations if e["user_id"] == user_id]
        status = "Evaluated" if evaluations else "Pending"
        
        # Determine pseudo case_id
        case_id = f"CASE-{abs(hash(user_id)) % 10000:04d}"
        
        cases.append({
            "case_id": case_id,
            "user_id": user_id,
            "age": _calculate_age(p.get("date_of_birth")),
            "sex": p.get("sex"),
            "conditions": [], # Handled by HSS metrics
            "ml_predicted_hss": ml_prediction.get("score"),
            "ml_tier": ml_prediction.get("tier"),
            "status": status,
        })
        
    return cases

@router.get("/cases/{user_id}", response_model=Dict[str, Any])
def get_case_detail(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    """Get anonymized baseline data for a specific case."""
    profile_data = get_full_profile(user_id)
    if not profile_data:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    p = profile_data["profile"]
    if p.get("role") != "patient":
        raise HTTPException(status_code=400, detail="Requested user is not a patient")
        
    case_id = f"CASE-{abs(hash(user_id)) % 10000:04d}"
    
    baselines = profile_data.get("baselines", {})
    ml_prediction = _get_ml_hss(user_id)
    
    # Fetch Recommendations based on ML Tier
    ml_tier = ml_prediction.get("tier")
    rec_recipes = [r for r in mock_db.recipes if r.get("hss_tier") == ml_tier][:2]
    rec_exercises = [e for e in mock_db.exercise_routines if e.get("hss_tier") == ml_tier][:2]
    
    # Fetch existing evaluation if it exists (for editing)
    existing_eval = next((e for e in mock_db.expert_evaluations if e["user_id"] == user_id), None)
    
    # Ensure all baseline data is presented completely anonymized
    anonymized_data = {
        "case_id": case_id,
        "user_id": user_id,
        "ml_predicted_hss": ml_prediction.get("score"),
        "ml_tier": ml_tier,
        "core": {
            "age": _calculate_age(p.get("date_of_birth")),
            "sex": p.get("sex")
        },
        "onboarding": baselines.get("onboarding") or {},
        "recommendations": {
            "recipes": rec_recipes,
            "exercises": rec_exercises
        },
        "expert_hss_score": existing_eval.get("expert_hss_score") if existing_eval else None,
        "notes": existing_eval.get("notes") if existing_eval else "",
        "recommendation_feedback": existing_eval.get("recommendation_feedback") if existing_eval else ""
    }
    
    return anonymized_data

@router.post("/cases/{user_id}/evaluate")
def submit_evaluation(user_id: str, payload: dict, current_user: dict = Depends(get_current_admin_user)):
    """Submit an expert evaluation providing the ground-truth HSS score and recommendation feedback."""
    expert_hss_score = payload.get("expert_hss_score")
    notes = payload.get("notes")
    recommendation_feedback = payload.get("recommendation_feedback")
    
    if expert_hss_score is None:
        raise HTTPException(status_code=400, detail="expert_hss_score is required")
        
    existing_eval = next((e for e in mock_db.expert_evaluations if e["user_id"] == user_id), None)
    action = "updated" if existing_eval else "evaluated"
    case_id = f"CASE-{abs(hash(user_id)) % 10000:04d}"
    
    if existing_eval:
        existing_eval["expert_hss_score"] = expert_hss_score
        existing_eval["notes"] = notes
        existing_eval["recommendation_feedback"] = recommendation_feedback
        existing_eval["reviewed_at"] = datetime.utcnow()
        evaluation = existing_eval
    else:
        ml_prediction = _get_ml_hss(user_id)
        eval_id = f"CAL-{len(mock_db.expert_evaluations) + 1000}"
        reviewer_name = current_user.get("name") or (current_user.get("first_name", "Expert") + " " + current_user.get("last_name", ""))
        
        evaluation = {
            "id": eval_id,
            "user_id": user_id,
            "case_id": case_id,
            "expert_hss_score": expert_hss_score,
            "notes": notes,
            "recommendation_feedback": recommendation_feedback,
            "reviewer_id": current_user.get("sub", current_user.get("user_id", "admin")),
            "reviewer_name": reviewer_name.strip(),
            "ml_predicted_hss": ml_prediction.get("score"),
            "status": "Logged",
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
    return sorted(mock_db.expert_evaluations, key=lambda x: x.get("created_at", datetime.min), reverse=True)

@router.get("/evaluations/{eval_id}", response_model=Dict[str, Any])
def get_evaluation(eval_id: str, current_user: dict = Depends(get_current_admin_user)):
    evaluation = next((e for e in mock_db.expert_evaluations if e["id"] == eval_id), None)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation

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

@router.post("/retrain")
def retrain_model(current_user: dict = Depends(get_current_admin_user)):
    """Retrains the model using collected expert evaluations."""
    raise HTTPException(status_code=501, detail="Model retraining is now handled offline for the static HSS model.")
