from datetime import datetime, timedelta
import os
import hashlib
import app.mock_db as mock_db
from app.services.feature_transform import transform_to_model_features

def get_model_metadata() -> dict:
    """Helper to resolve the true metadata/hash of the currently loaded model."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "..", "ml", "heartlink_model.pkl")
    
    if not os.path.exists(model_path):
        return {
            "model_identifier": "unversioned-static-model",
            "model_hash": None,
            "feature_pipeline_version": "unversioned-pipeline"
        }
        
    try:
        with open(model_path, "rb") as f:
            file_bytes = f.read()
            model_hash = hashlib.sha256(file_bytes).hexdigest()
        return {
            "model_identifier": "heartlink_model.pkl",
            "model_hash": model_hash,
            "feature_pipeline_version": "transform_to_model_features"
        }
    except Exception:
        return {
            "model_identifier": "unversioned-static-model",
            "model_hash": None,
            "feature_pipeline_version": "transform_to_model_features"
        }

def get_clinical_baseline_data(user_id: str) -> dict:
    """
    Extracts the latest available clinical parameters from daily health logs
    and user baseline thresholds to serve Case Review and Profile portals.
    """
    # 1. Fetch patient profile to check diagnosed conditions
    profile = next((p for p in mock_db.profiles if p["id"] == user_id), {})
    
    # Diagnosed conditions are usually stored in health_goals or alerts snapshot
    conditions = []
    alert = next((a for a in mock_db.alerts if a["user_id"] == user_id), None)
    if alert and alert.get("patient_snapshot", {}).get("conditions"):
        conditions = alert["patient_snapshot"]["conditions"]
    else:
        if "bp" in profile.get("health_goals", []):
            conditions.append("Hypertension")
        if "cholesterol" in profile.get("health_goals", []):
            conditions.append("Hyperlipidemia")
            
    # 2. Query daily health logs for BP and HR
    user_logs = [log for log in mock_db.daily_health_logs if log["user_id"] == user_id]
    latest_log = {}
    if user_logs:
        latest_log = sorted(user_logs, key=lambda x: x.get("logged_at", datetime.min), reverse=True)[0]
        
    resting_bp = f"{latest_log.get('systolic_bp', 120)}/{latest_log.get('diastolic_bp', 80)}" if latest_log else "120/80"
    max_hr = latest_log.get("heart_rate_bpm", 72) if latest_log else 72
    chest_pain = 1 if latest_log and "chest_tightness" in latest_log.get("symptoms", []) else 0
    on_medication = latest_log.get("medication_taken", False) if latest_log else False
    
    return {
        "resting_bp_mmhg": resting_bp,
        "max_heart_rate_bpm": max_hr,
        "chest_pain_type": chest_pain,
        "on_medication": on_medication,
        "diagnosed_conditions": conditions,
        "serum_cholesterol": 240 if "cholesterol" in profile.get("health_goals", []) else 180,
        "fasting_blood_sugar": False,
        "exercise_angina": False
    }

def get_recent_telemetry_timeline(user_id: str, limit_days: int = 30) -> list:
    """
    Exposes real existing records from the last N days sorted chronologically.
    No synthetic telemetry is manufactured.
    """
    logs = []
    cutoff_date = datetime.utcnow() - timedelta(days=limit_days)
    
    def parse_dt(x):
        dt = x.get("timestamp") or x.get("logged_at") or x.get("computed_at")
        if isinstance(dt, str):
            try:
                return datetime.fromisoformat(dt)
            except ValueError:
                return datetime.min
        return dt or datetime.min

    # daily health logs (Vitals & Symptoms)
    for log in [l for l in mock_db.daily_health_logs if l.get("user_id") == user_id]:
        dt = parse_dt(log)
        if dt >= cutoff_date:
            logs.append({
                "type": "Vitals",
                "timestamp": log.get("logged_at"),
                "data": {
                    "systolic": log.get("systolic_bp"),
                    "diastolic": log.get("diastolic_bp"),
                    "heart_rate": log.get("heart_rate_bpm"),
                    "weight_kg": log.get("weight_kg")
                }
            })
            if log.get("symptoms"):
                logs.append({
                    "type": "Symptoms",
                    "timestamp": log.get("logged_at"),
                    "data": {
                        "symptoms": log.get("symptoms"),
                        "severity_map": log.get("severity_map"),
                        "context": log.get("context")
                    }
                })
                
    # meals
    for m in [m for m in mock_db.meal_logs if m.get("user_id") == user_id]:
        dt = parse_dt(m)
        if dt >= cutoff_date:
            logs.append({
                "type": "Meal",
                "timestamp": m.get("logged_at"),
                "data": {
                    "meal_name": m.get("meal_name"),
                    "calories": m.get("calories"),
                    "sodium_mg": m.get("sodium_mg")
                }
            })
            
    # exercises
    for e in [e for e in mock_db.exercise_logs if e.get("user_id") == user_id]:
        dt = parse_dt(e)
        if dt >= cutoff_date:
            logs.append({
                "type": "Exercise",
                "timestamp": e.get("logged_at"),
                "data": {
                    "routine_name": e.get("routine_name"),
                    "duration_minutes": e.get("duration_minutes"),
                    "status": e.get("status")
                }
            })
            
    # sleep
    for s in [s for s in mock_db.sleep_logs if s.get("user_id") == user_id]:
        dt = parse_dt(s)
        if dt >= cutoff_date:
            logs.append({
                "type": "Sleep",
                "timestamp": s.get("logged_at"),
                "data": {
                    "duration_hours": s.get("duration_hours"),
                    "quality": s.get("quality")
                }
            })
            
    # Sort descending
    logs.sort(key=parse_dt, reverse=True)
    return logs
