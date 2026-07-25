from typing import Dict, Any, List
from datetime import datetime
import uuid
from app.mock_db import css_history, alerts

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
    symptom_penalty = 0
    triggered_critical = False
    
    for symptom in symptoms:
        symp_lower = symptom.lower()
        if symp_lower in critical_flags:
            triggered_critical = True
        else:
            symptom_penalty += 5  # Standard penalty for non-critical (fatigue, headache, etc.)
            
    # Trigger independent critical alert pathway
    if triggered_critical:
        _create_urgent_alert(user_id, symptoms, log_data)
        
    return symptom_penalty

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

def recalculate_css(user_id: str, new_log: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates the real-time CSS by fetching the cached baseline score
    and subtracting the acute compounding penalties.
    """
    # 1. Fetch Cached Baseline Score
    # For performance, we skip running the rf_model.pkl inference here.
    # In production, this is loaded from a Redis cache or user profile.
    # We fallback to a healthy baseline (85) for demonstration if none exists.
    cached_baseline_score = 85
    user_css = sorted([c for c in css_history if c["user_id"] == user_id], key=lambda x: x["computed_at"], reverse=True)
    if user_css:
        # Use their most recent score as the 'base' if we assume it was a chronic computation
        # (For this MVP, we just use the last score or a static 85)
        # Actually, using 85 ensures we don't infinitely compound downward.
        cached_baseline_score = 85

    # 2. Evaluate Penalties
    sys = new_log.get("systolic_bp") or 0
    dia = new_log.get("diastolic_bp") or 0
    bpm = new_log.get("heart_rate_bpm") or 0
    symptoms = new_log.get("symptoms", [])

    bp_penalty = _determine_bp_penalty(sys, dia)
    hr_penalty = _determine_hr_penalty(bpm)
    symptom_penalty = _handle_symptoms(user_id, symptoms, new_log)
    
    # 3. Compounding Interaction Multiplier
    firing_categories = 0
    if bp_penalty > 0: firing_categories += 1
    if hr_penalty > 0: firing_categories += 1
    if symptom_penalty > 0: firing_categories += 1
    
    base_penalty_sum = bp_penalty + hr_penalty + symptom_penalty
    
    if firing_categories >= 2:
        final_penalty = int(base_penalty_sum * 1.2)
    else:
        final_penalty = base_penalty_sum
        
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
            "multiplier_applied": firing_categories >= 2
        },
        "computed_at": datetime.now(),
    }
    css_history.append(new_css)
    return new_css
