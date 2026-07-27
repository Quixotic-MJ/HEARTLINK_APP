from typing import Dict, Any, List
from datetime import datetime
import uuid
from app.mock_db import css_history, alerts, meal_logs, exercise_logs, user_thresholds, daily_health_logs, save_logs, notifications

# -----------------------------------------------------------------------------
# Clinical Disclaimer
# -----------------------------------------------------------------------------
# This scoring system is a heuristic combining ML baseline outputs with 
# hand-tuned acute penalty weights based on AHA stages. 
# It has NOT been validated against clinical outcomes data and should NOT 
# substitute professional medical diagnosis or triage.
# -----------------------------------------------------------------------------

def _determine_bp_penalty(systolic: int, diastolic: int) -> int:
    """Calculate AHA categorical penalty for Blood Pressure."""
    if systolic == 0 and diastolic == 0:
        return 0
        
    # AHA Categories
    if systolic > 180 or diastolic > 120:
        return 35  # Hypertensive Crisis
    elif systolic >= 140 or diastolic >= 90:
        return 20  # Hypertension Stage 2
    elif systolic >= 130 or diastolic >= 80:
        return 10  # Hypertension Stage 1
    elif systolic >= 120 and diastolic < 80:
        return 5   # Elevated
    elif systolic < 90 or diastolic < 60:
        return 15  # Hypotension
    else:
        return 0   # Normal

def _determine_hr_penalty(bpm: int) -> int:
    """Calculate categorical penalty for Heart Rate."""
    if bpm == 0:
        return 0
        
    if bpm > 130:
        return 25  # Severe Tachycardia
    elif bpm > 100:
        return 10  # Tachycardia
    elif bpm < 50:
        return 15  # Severe Bradycardia
    elif bpm < 60:
        return 5   # Mild Bradycardia
    else:
        return 0   # Normal

def _handle_symptoms(user_id: str, symptoms: List[str], log_data: Dict[str, Any]) -> int:
    """
    Evaluates symptoms for penalties and triggers urgent alerts for critical flags.
    Returns the total non-critical symptom penalty.
    """
    critical_flags = {"chest_pain", "chest_tightness", "shortness_of_breath", "fainting"}
    ignore_flags = {"none (feeling fine)", "none"}
    symptom_penalty = 0
    triggered_critical = False
    
    for symptom in symptoms:
        symp_lower = symptom.lower().strip()
        if symp_lower in ignore_flags:
            continue
        if symp_lower in critical_flags:
            triggered_critical = True
        else:
            symptom_penalty += 5  # Standard penalty for non-critical (fatigue, headache, etc.)
            
    # Trigger independent critical alert pathway
    if triggered_critical:
        _create_urgent_alert(user_id, symptoms, log_data)
        symptom_penalty += 20
        
    return symptom_penalty

def _determine_diet_penalty(user_id: str) -> int:
    """Determines penalty if cumulative sodium intake today exceeds the threshold."""
    today = datetime.now().date()
    todays_meals = [
        m for m in meal_logs 
        if m["user_id"] == user_id 
        and m.get("deleted_at") is None
        and (m["logged_at"].date() if isinstance(m["logged_at"], datetime) else datetime.fromisoformat(str(m["logged_at"])).date()) == today
    ]
    total_sodium = sum(m.get("sodium_mg", 0) for m in todays_meals)
    
    threshold = next((t for t in user_thresholds if t["user_id"] == user_id), None)
    limit = threshold.get("sodium_limit_mg", 1500) if threshold else 1500
    
    if total_sodium > limit + 1000:
        return 15
    elif total_sodium > limit + 500:
        return 10
    elif total_sodium > limit:
        return 5
    return 0

def _determine_exercise_bonus(user_id: str) -> int:
    """Provides a scaled bonus offsetting penalties based on exercise duration."""
    today = datetime.now().date()
    todays_exercises = [
        e for e in exercise_logs
        if e["user_id"] == user_id
        and e.get("deleted_at") is None
        and (e["logged_at"].date() if isinstance(e["logged_at"], datetime) else datetime.fromisoformat(str(e["logged_at"])).date()) == today
    ]
    
    total_minutes = sum(e.get("duration_minutes", 0) for e in todays_exercises)
    
    if total_minutes > 30:
        return 7
    elif total_minutes >= 15:
        return 5
    elif total_minutes > 0:
        return 3
    return 0

def _create_urgent_alert(user_id: str, symptoms: List[str], log_data: Dict[str, Any]):
    """Bypasses standard math to instantly generate a critical health alert."""
    new_alert = {
        "id": f"alert-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "severity": "Critical",
        "alert_type": "Critical Symptom Flag",
        "message": f"Critical symptoms reported: {', '.join(symptoms)}. Please seek immediate medical attention or contact your care team.",
        "status": "New",
        "trigger_context": {
            "symptoms": symptoms,
            "systolic": log_data.get("systolic_bp"),
            "diastolic": log_data.get("diastolic_bp"),
            "bpm": log_data.get("heart_rate_bpm")
        },
        "system_action": "User prompted to seek care. Care team dashboard flagged.",
        "created_at": datetime.now(),
    }
    alerts.append(new_alert)
    
    new_notif = {
        "id": f"notif-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "scope": "personal",
        "type": "alert",
        "title": "Critical Health Alert",
        "message": f"Critical symptoms reported: {', '.join(symptoms)}. Please seek immediate medical attention.",
        "read": False,
        "created_at": datetime.now(),
    }
    notifications.append(new_notif)

def recalculate_css(user_id: str, new_log: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Calculates the real-time CSS by fetching the baseline score
    and subtracting the acute compounding penalties (BP, HR, symptoms, diet)
    while applying exercise bonuses.
    """
    user_ml_history = [
        c for c in css_history 
        if c["user_id"] == user_id and c.get("contributing_factors", {}).get("ml_predicted") == "True"
    ]
    if user_ml_history:
        user_ml_history.sort(key=lambda x: x["computed_at"], reverse=True)
        cached_baseline_score = user_ml_history[0]["score"]
    else:
        cached_baseline_score = 85

    if new_log is None:
        today = datetime.now().date()
        today_logs = [
            l for l in daily_health_logs
            if l["user_id"] == user_id
            and l.get("deleted_at") is None
            and (l["logged_at"].date() if isinstance(l["logged_at"], datetime) else datetime.fromisoformat(str(l["logged_at"])).date()) == today
        ]
        if today_logs:
            today_logs.sort(key=lambda x: x["logged_at"], reverse=True)
            new_log = today_logs[0]
        else:
            new_log = {}

    # 2. Evaluate Penalties
    sys = new_log.get("systolic_bp") or 0
    dia = new_log.get("diastolic_bp") or 0
    bpm = new_log.get("heart_rate_bpm") or 0
    symptoms = new_log.get("symptoms", [])

    bp_penalty = _determine_bp_penalty(sys, dia)
    hr_penalty = _determine_hr_penalty(bpm)
    symptom_penalty = _handle_symptoms(user_id, symptoms, new_log)
    diet_penalty = _determine_diet_penalty(user_id)
    exercise_bonus = _determine_exercise_bonus(user_id)
    
    # 3. Compounding Interaction Multiplier
    firing_categories = 0
    if bp_penalty > 0: firing_categories += 1
    if hr_penalty > 0: firing_categories += 1
    if symptom_penalty > 0: firing_categories += 1
    if diet_penalty > 0: firing_categories += 1
    
    base_penalty_sum = bp_penalty + hr_penalty + symptom_penalty + diet_penalty
    
    if firing_categories >= 2:
        final_penalty = int(base_penalty_sum * 1.2)
    else:
        final_penalty = base_penalty_sum
        
    final_penalty = max(0, final_penalty - exercise_bonus)

    # 4. Final Calculation
    final_score = cached_baseline_score - final_penalty
    final_score = max(0, min(100, final_score)) # Clamp between 0 and 100
    
    # 5. Determine Tier
    if final_score >= 80:
        tier = "Stable"
    elif final_score >= 60:
        tier = "Moderate"
    elif final_score >= 40:
        tier = "Caution"
    else:
        tier = "Elevated Risk"
        
    # Find previous score to check for significant drops
    user_css_history = sorted(
        [c for c in css_history if c["user_id"] == user_id], 
        key=lambda x: x["computed_at"], 
        reverse=True
    )
    previous_score = user_css_history[0]["score"] if user_css_history else cached_baseline_score
    
    if previous_score - final_score > 10:
        new_notif = {
            "id": f"notif-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "scope": "personal",
            "type": "insight",
            "title": "Significant Score Drop",
            "message": f"Your score dropped by {previous_score - final_score} points. Consider reviewing your diet and activities.",
            "read": False,
            "created_at": datetime.now(),
        }
        notifications.append(new_notif)

    # 6. Save new CSS Entry
    new_css = {
        "id": f"css-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "score": final_score,
        "tier": tier,
        "contributing_factors": {
            "bp_penalty": bp_penalty,
            "hr_penalty": hr_penalty,
            "symptom_penalty": symptom_penalty,
            "diet_penalty": diet_penalty,
            "exercise_bonus": exercise_bonus,
            "multiplier_applied": firing_categories >= 2
        },
        "computed_at": datetime.now(),
    }
    css_history.append(new_css)
    save_logs()
    return new_css

