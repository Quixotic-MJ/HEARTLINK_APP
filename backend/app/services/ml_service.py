import os
import uuid
import joblib
import pandas as pd
from datetime import datetime
from app.db.repositories import get_hss_repo

class MLService:
    def __init__(self):
        self.model = None
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "..", "ml", "rf_model.pkl")
        
        try:
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
        except Exception as e:
            print(f"Failed to load RF model: {e}")
            
    def predict_initial_hss(self, user_id: str, lifestyle: dict, dietary: dict, clinical: dict):
        predicted_hss = 80
        tier = "Stable"
        contributing_factors = {"ml_predicted": "Fallback"}

        if self.model:
            try:
                # Transform user baselines into features expected by the model
                input_data = {
                    "smoking_status": lifestyle.get("smoking_status", "never"),
                    "avg_sleep_hours": lifestyle.get("avg_sleep_hours", 7),
                    "family_history": 1 if lifestyle.get("family_history") else 0,
                    "sodium_frequency": dietary.get("sodium_frequency", "occasionally"),
                    "condition_count": len(clinical.get("diagnosed_conditions", [])),
                    "on_medication": 1 if clinical.get("on_medication") else 0,
                    "resting_bp_mmhg": clinical.get("resting_bp_mmhg") or 120,
                    "max_heart_rate_bpm": clinical.get("max_heart_rate_bpm") or 170,
                }
                
                df = pd.DataFrame([input_data])
                prediction = self.model.predict(df)[0]
                
                # Clamp and round
                predicted_hss = max(0, min(100, round(prediction)))
                
                # Determine Tier
                if predicted_hss >= 80:
                    tier = "Stable"
                elif predicted_hss >= 60:
                    tier = "Moderate"
                elif predicted_hss >= 50:
                    tier = "Elevated Risk"
                else:
                    tier = "Critical"
                contributing_factors = {"ml_predicted": "True"}
            except Exception as e:
                print(f"Prediction error: {e}")
                predicted_hss = 80
                tier = "Stable"
                contributing_factors = {"ml_predicted": "FallbackError"}

        # Create hss_history entry
        new_hss_data = {
            "score": predicted_hss,
            "tier": tier,
            "source": "baseline_ml",
            "contributing_factors": contributing_factors,
            "computed_at": datetime.utcnow().isoformat()
        }
        
        saved_record = get_hss_repo().create_hss_record(user_id, new_hss_data)
        return saved_record

ml_service = MLService()

