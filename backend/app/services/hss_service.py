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
    context: str = None
) -> Tuple[int, str, float]:
    """
    Computes real-time Cardiovascular Health Stability Score (1-100) from logged vitals.
    Aligned with AHA/ACC 2017 & ESC 2024 hemodynamic guidelines.
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
        # Waive high heart rate penalty if context is after exercise
        if context == "after_exercise" and heart_rate > 100:
            pass # Healthy cardiovascular response to exercise
        else:
            if heart_rate > 110 or heart_rate < 50:
                score -= 8
            elif heart_rate > 100:
                score -= 4

    # Pulse Pressure Anomaly Penalty
    if isinstance(systolic, (int, float)) and isinstance(diastolic, (int, float)):
        pulse_pressure = systolic - diastolic
        if pulse_pressure > 60 or pulse_pressure < 25:
            score -= 5

    score = max(1, min(100, score))
    tier = determine_tier(score)
    risk_prob = round((100 - score) / 100.0, 3)
    return score, tier, risk_prob


def compute_lifestyle_composite_hss(user_id: str, trigger: str = "lifestyle_event"):
    """
    Dynamically recalculates Cardiovascular Health Stability Score (1-100)
    incorporating real-time daily lifestyle telemetry with itemized scoring.
    """
    from datetime import datetime, timedelta
    from app.db.repositories import get_hss_repo, get_baseline_repo, get_meals_repo, get_exercises_repo, get_sleep_repo
    from app.services.health_logs import get_health_logs
    from app.services.dashboard import _safe_date, _calculate_streak_data

    hss_repo = get_hss_repo()
    history = hss_repo.list_hss_history(user_id)
    
    # 1. Base score from most recent vitals telemetry or baseline onboarding
    base_score = 75
    last_vital_date = None
    if history and len(history) > 0:
        base_record = next((h for h in history if h.get("contributing_factors", {}).get("source") != "lifestyle_composite"), None)
        base_score = int(base_record.get("score") or 75) if base_record else 75
        if base_record:
            try:
                last_vital_date = datetime.fromisoformat(base_record.get("computed_at")).date()
            except:
                pass

    today = datetime.utcnow().date()
    
    # Fetch today's raw logs
    meal_logs = get_meals_repo().list_user_meals(user_id)
    exercise_logs = get_exercises_repo().list_user_logs(user_id)
    sleep_logs = get_sleep_repo().list_user_logs(user_id)
    health_logs = get_health_logs(user_id)

    meals_today = [m for m in meal_logs if _safe_date(m.get("logged_at")) == today and m.get("deleted_at") is None]
    exercises_today = [e for e in exercise_logs if _safe_date(e.get("logged_at")) == today and e.get("deleted_at") is None and e.get("status", "completed") != "abandoned"]
    sleeps_today = [s for s in sleep_logs if _safe_date(s.get("logged_at")) == today and s.get("deleted_at") is None and not s.get("is_deleted", False)]
    vitals_today = [l for l in health_logs if _safe_date(l.get("logged_at")) == today]

    # Initialize points
    lifestyle_points = 0
    factors = {"source": "lifestyle_composite", "trigger": trigger}

    # 2. Meal Points (Itemized)
    meal_pts = 0
    for m in meals_today:
        sod = m.get("sodium_mg") or 0
        fat = m.get("saturated_fat_g") or 0
        fib = m.get("fiber_g") or 0
        if sod > 800: meal_pts -= 3
        elif sod < 140: meal_pts += 2
        
        if fat > 5: meal_pts -= 2
        elif fat < 1: meal_pts += 1
        
        if fib > 5: meal_pts += 2
    lifestyle_points += meal_pts
    factors["meal_points"] = meal_pts

    # 3. Exercise Points (Itemized)
    ex_pts = 0
    for e in exercises_today:
        dur = e.get("duration_minutes") or 0
        intensity = e.get("intensity") or "light"
        multiplier = 1
        if intensity == "moderate": multiplier = 2
        elif intensity in ("vigorous", "high"): multiplier = 3
        ex_pts += int(dur // 10) * multiplier
    lifestyle_points += ex_pts
    factors["exercise_points"] = ex_pts

    # 4. Sleep Points
    sleep_pts = 0
    total_sleep_hours = sum((s.get("duration_hours") or 0) for s in sleeps_today)
    if total_sleep_hours > 0:
        if 7 <= total_sleep_hours <= 9: sleep_pts = 3
        elif total_sleep_hours == 6 or total_sleep_hours == 10: sleep_pts = 1
        elif total_sleep_hours < 5 or total_sleep_hours > 11: sleep_pts = -2
    lifestyle_points += sleep_pts
    factors["sleep_points"] = sleep_pts

    # 5. Adherence & Safety Points
    med_pts = 0
    if any(l.get("medication_taken") for l in vitals_today):
        med_pts = 2
    lifestyle_points += med_pts
    factors["medication_points"] = med_pts

    symptom_pts = 0
    if any(any(s in l.get("symptoms", []) for s in ["Chest Discomfort / Tightness", "Shortness of Breath"]) for l in vitals_today):
        symptom_pts = -10
    lifestyle_points += symptom_pts
    factors["symptom_points"] = symptom_pts

    sugar_pts = 0
    if vitals_today and vitals_today[0].get("blood_sugar"):
        sugar = vitals_today[0].get("blood_sugar")
        if sugar < 70 or sugar > 180:
            sugar_pts = -3
        else:
            sugar_pts = 2
    lifestyle_points += sugar_pts
    factors["blood_sugar_points"] = sugar_pts

    weight_pts = 0
    if vitals_today and vitals_today[0].get("weight_kg"):
        current_weight = vitals_today[0].get("weight_kg")
        past_vitals = [l for l in health_logs if _safe_date(l.get("logged_at")) < today and l.get("weight_kg")]
        if past_vitals:
            past_weight = past_vitals[0].get("weight_kg")
            if current_weight - past_weight >= 1.5:
                weight_pts = -15
    lifestyle_points += weight_pts
    factors["weight_gain_points"] = weight_pts

    streak_pts = 0
    streak_data = _calculate_streak_data(meal_logs, exercise_logs, health_logs, sleep_logs)
    streak_days = streak_data.get("current_streak", 0)
    if streak_days > 0:
        streak_pts = min(5, streak_days * 1)
    lifestyle_points += streak_pts
    factors["streak_points"] = streak_pts

    # 6. Data Staleness Penalty
    staleness_pts = 0
    has_recent_logs = False
    forty_eight_hours_ago = today - timedelta(days=2)
    if last_vital_date and last_vital_date >= forty_eight_hours_ago:
        has_recent_logs = True
    elif any(_safe_date(m.get("logged_at")) >= forty_eight_hours_ago for m in meal_logs):
        has_recent_logs = True
    
    if not has_recent_logs:
        staleness_pts = -5
    lifestyle_points += staleness_pts
    factors["staleness_points"] = staleness_pts

    # 7. Apply Daily Variance Cap
    lifestyle_points = max(-20, min(20, lifestyle_points))
    factors["total_lifestyle_adjustment"] = lifestyle_points

    # 8. Composite Score
    composite_score = base_score + lifestyle_points
    composite_score = max(1, min(100, composite_score))
    tier = determine_tier(composite_score)
    risk_prob = round((100 - composite_score) / 100.0, 3)

    # 9. Persist to hss_history
    record = hss_repo.create_hss_record(user_id, {
        "score": composite_score,
        "tier": tier,
        "risk_probability": risk_prob,
        "source": "telemetry",
        "contributing_factors": factors,
        "computed_at": datetime.utcnow().isoformat()
    })

    return composite_score, tier, risk_prob, record


