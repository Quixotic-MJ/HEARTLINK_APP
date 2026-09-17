from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from app.services.health_logs import get_health_logs, create_health_log, delete_health_log
from app.utils.security import get_current_user, verify_user_access

router = APIRouter(prefix="/api/health-logs", tags=["Health Logs"])

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
def read_health_logs(user_id: str, current_user: dict = Depends(get_current_user)):
    verify_user_access(current_user, user_id)
    return get_health_logs(user_id)

@router.post("/{user_id}", response_model=Dict[str, Any])
def add_health_log(user_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    verify_user_access(current_user, user_id)
    
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only record your own health logs.",
        )
    for k in ["systolic_bp", "diastolic_bp", "heart_rate_bpm", "weight_kg", "blood_sugar"]:
        if data.get(k) == "":
            data[k] = None

    sys_bp = data.get("systolic_bp")
    dia_bp = data.get("diastolic_bp")
    hr = data.get("heart_rate_bpm")
    weight = data.get("weight_kg")
    
    if sys_bp is not None:
        if not isinstance(sys_bp, (int, float)) or isinstance(sys_bp, bool):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Systolic blood pressure must be a number.")
        if sys_bp < 50 or sys_bp > 300:
            raise HTTPException(status_code=400, detail="Systolic blood pressure must be between 50 and 300.")
    if dia_bp is not None:
        if not isinstance(dia_bp, (int, float)) or isinstance(dia_bp, bool):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Diastolic blood pressure must be a number.")
        if dia_bp < 30 or dia_bp > 200:
            raise HTTPException(status_code=400, detail="Diastolic blood pressure must be between 30 and 200.")
            
    # Pairwise BP Invariant: If one BP component is provided, both must be provided
    if (sys_bp is not None and dia_bp is None) or (sys_bp is None and dia_bp is not None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Clinical validation failure: Blood pressure must include both systolic and diastolic readings."
        )

    # Physiological BP Invariant: SBP must be strictly greater than DBP with minimal pulse pressure
    if sys_bp is not None and dia_bp is not None:
        if sys_bp <= dia_bp:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Clinical validation failure: Systolic blood pressure must be strictly greater than diastolic blood pressure."
            )
        if (sys_bp - dia_bp) < 15:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Clinical validation failure: Pulse pressure (Systolic - Diastolic) cannot be less than 15 mmHg."
            )

    if hr is not None:
        if not isinstance(hr, (int, float)) or isinstance(hr, bool):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Heart rate must be a number.")
        if hr < 30 or hr > 250:
            raise HTTPException(status_code=400, detail="Heart rate must be between 30 and 250.")
    if weight is not None:
        if not isinstance(weight, (int, float)) or isinstance(weight, bool):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Weight must be a number.")
        if weight < 20 or weight > 400:
            raise HTTPException(status_code=400, detail="Weight must be between 20 and 400 kg.")

    # Context normalization to satisfy database check constraint
    context_map = {
        "While resting": "resting",
        "During physical activity": "after_exercise",
        "After eating": "after_eating",
    }
    raw_context = data.get("context")
    if raw_context in context_map:
        data["context"] = context_map[raw_context]
    elif raw_context and raw_context not in ("resting", "after_eating", "after_exercise", "morning", "evening", "other"):
        data["context"] = "other"

    log = create_health_log(user_id, data)

    # Dynamic HSS recording and clinical alert ingestion (TKT-CLN-04)
    if sys_bp is not None and dia_bp is not None:
        try:
            from datetime import datetime
            from app.services.hss_service import compute_vitals_hss
            from app.db.repositories import get_hss_repo, get_health_logs_repo

            score, tier, risk_prob = compute_vitals_hss(int(sys_bp), int(dia_bp), int(hr) if hr else None)
            get_hss_repo().create_hss_record(user_id, {
                "score": score,
                "tier": tier,
                "risk_probability": risk_prob,
                "source": "telemetry",
                "contributing_factors": {
                    "systolic": sys_bp,
                    "diastolic": dia_bp,
                    "heart_rate": hr,
                    "trigger": "health_log"
                },
                "computed_at": log.get("logged_at") or datetime.utcnow().isoformat()
            })

            # Create clinical alert if acute emergency boundaries are breached
            if (sys_bp >= 180 or dia_bp >= 120) or (sys_bp < 90 or dia_bp < 60):
                is_crisis = (sys_bp >= 180 or dia_bp >= 120)
                alert_type = "Hypertensive Crisis" if is_crisis else "Acute Hypotension"
                get_health_logs_repo().create_alert({
                    "user_id": user_id,
                    "alert_type": alert_type,
                    "severity": "critical",
                    "status": "active",
                    "details": f"Critical vitals logged: {sys_bp}/{dia_bp} mmHg, HR: {hr or 'N/A'} BPM",
                    "created_at": datetime.utcnow().isoformat()
                })
        except Exception as e:
            # Telemetry scoring failure should not drop the successfully saved health log
            import logging
            logging.getLogger(__name__).warning(f"Failed to record dynamic HSS for {user_id}: {e}")

    # Heart Rate Alerts
    if hr is not None:
        try:
            from datetime import datetime
            from app.db.repositories import get_health_logs_repo
            if hr > 120 or hr < 50:
                hr_alert = "Severe Tachycardia" if hr > 120 else "Severe Bradycardia"
                get_health_logs_repo().create_alert({
                    "user_id": user_id,
                    "alert_type": hr_alert,
                    "severity": "critical",
                    "status": "active",
                    "details": f"Critical heart rate logged: {hr} BPM",
                    "created_at": datetime.utcnow().isoformat()
                })
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to record HR alert for {user_id}: {e}")

    # Symptom-driven clinical alert ingestion
    symptoms = data.get("symptoms", [])
    severity_map = data.get("severity_map", {})
    context_val = data.get("context")

    is_chest_pain = "Chest Discomfort / Tightness" in symptoms and severity_map.get("Chest Discomfort / Tightness", 1) >= 7
    is_sob_rest = "Shortness of Breath" in symptoms and context_val == "resting"

    if is_chest_pain or is_sob_rest:
        try:
            from datetime import datetime
            from app.db.repositories import get_health_logs_repo
            
            details_list = []
            if is_chest_pain:
                lvl = severity_map.get("Chest Discomfort / Tightness", 1)
                details_list.append(f"Severe Chest Discomfort (Level {lvl}/10)")
            if is_sob_rest:
                details_list.append("Shortness of Breath at rest")
                
            get_health_logs_repo().create_alert({
                "user_id": user_id,
                "alert_type": "Severe Symptoms",
                "severity": "critical",
                "status": "active",
                "details": " and ".join(details_list),
                "created_at": log.get("logged_at") or datetime.utcnow().isoformat()
            })
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to record symptom alert for {user_id}: {e}")

    # Weight Fluctuation Alerts
    if weight is not None:
        try:
            from datetime import datetime
            from app.db.repositories import get_health_logs_repo
            repo = get_health_logs_repo()
            user_logs = repo.list_user_logs(user_id)
            
            now_utc = datetime.utcnow()
            current_log_id = log.get("id")
            
            for prior_log in user_logs:
                if prior_log.get("id") == current_log_id:
                    continue
                    
                prior_weight = prior_log.get("weight_kg")
                if prior_weight is not None:
                    prior_time_str = prior_log.get("logged_at")
                    if prior_time_str:
                        prior_time = datetime.fromisoformat(prior_time_str.replace("Z", "+00:00")).replace(tzinfo=None)
                        if (now_utc - prior_time).total_seconds() <= 3 * 24 * 3600:
                            delta = weight - prior_weight
                            if delta >= 1.36:
                                repo.create_alert({
                                    "user_id": user_id,
                                    "alert_type": "Rapid Weight Gain",
                                    "severity": "critical",
                                    "status": "active",
                                    "details": f"Rapid weight gain detected: +{delta:.2f} kg since {prior_time.strftime('%Y-%m-%d')}",
                                    "created_at": log.get("logged_at") or datetime.utcnow().isoformat()
                                })
                    # Stop at the first prior weight found
                    break
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to check weight alert for {user_id}: {e}")

    return {"success": True, "message": "Health log saved", "data": log}

@router.delete("/{user_id}/{log_id}", response_model=Dict[str, Any])
def remove_health_log(user_id: str, log_id: str, current_user: dict = Depends(get_current_user)):
    verify_user_access(current_user, user_id)
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only delete your own health logs.",
        )
    success, msg, status_code = delete_health_log(user_id, log_id)
    if not success:
        raise HTTPException(status_code=status_code, detail=msg)
    return {"success": True, "message": msg}

@router.post("/{user_id}/clear-symptom-lock", response_model=Dict[str, Any])
def clear_symptom_lock(user_id: str, current_user: dict = Depends(get_current_user)):
    verify_user_access(current_user, user_id)
    
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    if caller_role == "patient" and caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only clear your own symptom lock.",
        )
        
    data = {
        "context": "symptom_lock_cleared",
        "symptoms": ["Cleared by Doctor / Fully Resolved"]
    }
    log = create_health_log(user_id, data)
    return {"success": True, "message": "Symptom lock cleared", "data": log}

