import os
import joblib
import pandas as pd
from typing import Dict, Any, Tuple
from app.services.feature_transform import transform_to_model_features

class HSSModelError(Exception):
    """Raised when the ML model cannot be loaded or used."""
    pass

def load_hss_model():
    """Loads the NHANES-trained LogisticRegression pipeline."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "..", "ml", "heartlink_model.pkl")
    
    if not os.path.exists(model_path):
        raise HSSModelError(f"Model file not found at {model_path}")
        
    try:
        model = joblib.load(model_path)
        return model
    except Exception as e:
        raise HSSModelError(f"Failed to load model: {str(e)}")

def determine_tier(hss: int) -> str:
    """Returns the qualitative tier for a given HSS (1-100)."""
    if hss >= 80:
        return "Stable"
    elif hss >= 60:
        return "Moderate"
    elif hss >= 50:
        return "Elevated Risk"
    else:
        return "Critical"

def compute_initial_hss(onboarding_data: Dict[str, Any], user_profile: Dict[str, Any]) -> Tuple[int, str, float]:
    """
    Computes the initial Health Stability Score (HSS) from onboarding data.
    
    Returns:
        Tuple of (hss_score: int, hss_tier: str, risk_probability: float)
        
    Raises:
        HSSModelError: If model is missing or prediction fails.
    """
    model = load_hss_model()
    
    # 1. Transform raw answers into 37 NHANES features
    features_df = transform_to_model_features(onboarding_data, user_profile)
    
    # 2. Predict risk probability (class 1 = Higher Risk)
    try:
        probas = model.predict_proba(features_df)
        risk_probability = float(probas[0][1])
    except Exception as e:
        raise HSSModelError(f"Model prediction failed: {str(e)}")
        
    # 3. Calculate HSS: scale inverted probability to 1-100 range
    # P(risk)=0.0 -> HSS=100
    # P(risk)=1.0 -> HSS=1
    hss = int(round((1 - risk_probability) * 99) + 1)
    
    # Ensure bounds
    hss = max(1, min(100, hss))
    
    # 4. Determine tier
    tier = determine_tier(hss)
    
    return hss, tier, risk_probability

def compute_vitals_hss(
    systolic: int,
    diastolic: int,
    heart_rate: int = None,
) -> Tuple[int, str, float]:
    """
    Computes real-time Cardiovascular Health Stability Score (1-100) from logged vitals.
    Aligned with AHA/ACC 2017 & ESC 2024 hemodynamic guidelines:
    - Hypertensive Crisis (SBP >= 180 or DBP >= 120): Critical tier (15-35)
    - Acute Hypotension (SBP < 90 or DBP < 60): Critical tier (25-45)
    - Stage 2 Hypertension (SBP >= 140 or DBP >= 90): Elevated Risk tier (45-59)
    - Stage 1 Hypertension (SBP >= 130 or DBP >= 80): Moderate tier (60-74)
    - Elevated Blood Pressure (SBP >= 120 and DBP < 80): Moderate/Borderline (75-79)
    - Normal / Optimal Stability (SBP < 120 and DBP < 80): Stable tier (85-95)
    """
    if systolic >= 180 or diastolic >= 120:
        score = 25
    elif systolic < 90 or diastolic < 60:
        score = 35
    elif systolic >= 140 or diastolic >= 90:
        score = 52
    elif systolic >= 130 or diastolic >= 80:
        score = 68
    elif systolic >= 120:
        score = 78
    else:
        score = 90

    # Adjust for tachycardia or severe bradycardia if heart rate is provided
    if heart_rate is not None and isinstance(heart_rate, (int, float)):
        if heart_rate > 110 or heart_rate < 50:
            score -= 8
        elif heart_rate > 100:
            score -= 4

    score = max(1, min(100, score))
    tier = determine_tier(score)
    risk_prob = round((100 - score) / 100.0, 3)
    return score, tier, risk_prob


def compute_lifestyle_composite_hss(user_id: str, trigger: str = "lifestyle_event"):
    """
    Dynamically recalculates Cardiovascular Health Stability Score (1-100)
    incorporating real-time daily lifestyle telemetry (meals, sodium load, exercise duration).
    (HL-ENG-18)
    """
    from datetime import datetime
    from app.db.repositories import get_hss_repo, get_baseline_repo
    from app.services.dashboard import _get_today_activity

    hss_repo = get_hss_repo()
    history = hss_repo.list_hss_history(user_id)
    
    # 1. Base score from most recent vitals telemetry or baseline onboarding (HL-ENG-25)
    base_score = 75
    if history and len(history) > 0:
        base_record = next((h for h in history if h.get("source") != "lifestyle_composite"), None)
        base_score = int(base_record.get("score") or 75) if base_record else 75

    # 2. Get today's lifestyle activity
    activity = _get_today_activity(user_id)
    total_sodium = activity.get("total_sodium_mg", 0)
    total_exercise_min = activity.get("total_exercise_minutes", 0)

    # 3. Get user thresholds / limits
    baseline_repo = get_baseline_repo()
    thresholds = baseline_repo.get_thresholds(user_id)
    sodium_limit = thresholds.get("sodium_limit_mg", 2000) if thresholds else 2000
    if not sodium_limit or sodium_limit <= 0:
        sodium_limit = 2000

    # 4. Calculate habit deltas
    sodium_penalty = 0
    if total_sodium > sodium_limit:
        excess = total_sodium - sodium_limit
        sodium_penalty = min(15, int(excess // 200) + 1)

    exercise_bonus = 0
    if total_exercise_min >= 30:
        exercise_bonus = 5
    elif total_exercise_min >= 15:
        exercise_bonus = 3
    elif total_exercise_min > 0:
        exercise_bonus = 1

    # 5. Composite score
    composite_score = base_score - sodium_penalty + exercise_bonus
    composite_score = max(1, min(100, composite_score))
    tier = determine_tier(composite_score)
    risk_prob = round((100 - composite_score) / 100.0, 3)

    # 6. Persist to hss_history
    record = hss_repo.create_hss_record(user_id, {
        "score": composite_score,
        "tier": tier,
        "risk_probability": risk_prob,
        "source": "lifestyle_composite",
        "contributing_factors": {
            "base_score": base_score,
            "total_sodium_mg": total_sodium,
            "sodium_limit_mg": sodium_limit,
            "sodium_penalty": sodium_penalty,
            "total_exercise_minutes": total_exercise_min,
            "exercise_bonus": exercise_bonus,
            "trigger": trigger
        },
        "computed_at": datetime.utcnow().isoformat()
    })

    return composite_score, tier, risk_prob, record


