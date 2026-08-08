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
    elif hss >= 40:
        return "At Risk"
    else:
        return "Needs Attention"

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
