from fastapi import APIRouter, Depends
from typing import Dict, Any
import json
import os
from app.mock_db import profiles, alerts, css_history, exercise_routines
from app.utils.security import get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard", response_model=Dict[str, Any])
def get_admin_dashboard(current_user: dict = Depends(get_current_admin_user)):
    # 1. User Engagement
    patients = [p for p in profiles if p.get("role") == "patient"]
    total_patients = len(patients)
    
    # 2. Case Calibration
    total_exercises = len(exercise_routines)
    
    # 3. System Alerts
    total_alerts = len(alerts)
    unresolved_alerts = sum(1 for a in alerts if not a.get("resolved"))
    
    # 4. CSS Population Distribution
    # Get latest css score for each patient
    latest_css = {}
    for entry in sorted(css_history, key=lambda x: x["computed_at"]):
        latest_css[entry["user_id"]] = entry["score"]
        
    stable = 0
    monitor = 0
    critical = 0
    
    for uid, score in latest_css.items():
        if score >= 80:
            stable += 1
        elif score >= 50:
            monitor += 1
        else:
            critical += 1
            
    total_scored = len(latest_css)
    css_distribution = {
        "stable": round((stable / total_scored * 100) if total_scored else 0),
        "monitor": round((monitor / total_scored * 100) if total_scored else 0),
        "critical": round((critical / total_scored * 100) if total_scored else 0),
    }

    # 5. Recent System Activity
    recent_activity = []
    log_path = os.path.join(os.path.dirname(__file__), "../../../mock_logs.json")
    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8") as f:
            try:
                logs = json.load(f)
                recent_activity = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:5]
            except Exception:
                pass
                
    if not recent_activity:
        # Fallback dummy activity if mock_logs.json missing
        recent_activity = [
            {"timestamp": "2026-10-24T14:23:05", "event_type": "Data Sync", "entity": "System Process", "detail": "Open Food Facts API Sync Completed", "status": "success"},
            {"timestamp": "2026-10-24T14:21:12", "event_type": "Alert Triggered", "entity": "Auto-Monitor Engine", "detail": "Rule-Based CSS Threshold Breached", "status": "error"},
            {"timestamp": "2026-10-24T13:45:00", "event_type": "Auth Log", "entity": "Dr. Sarah Jenkins", "detail": "New Expert Account Provisioned", "status": "neutral"}
        ]

    return {
        "kpi": {
            "total_patients": total_patients,
            "active_exercises": total_exercises,
            "total_alerts": total_alerts,
            "unresolved_alerts": unresolved_alerts
        },
        "css_distribution": css_distribution,
        "recent_activity": recent_activity
    }
