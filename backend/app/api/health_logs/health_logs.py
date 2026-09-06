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
        if weight <= 0 or weight > 500:
            raise HTTPException(status_code=400, detail="Weight must be greater than 0.")

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

