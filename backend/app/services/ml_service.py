import os
import joblib
import pandas as pd
from datetime import datetime
from app import mock_db

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
        if not self.model:
            print("Model not loaded, defaulting to HSS 80")
            return 80
            
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
            elif predicted_hss >= 40:
                tier = "Caution"
            else:
                tier = "Elevated Risk"
                
            # Create hss_history entry
            new_hss = {
                "id": f"hss-{len(mock_db.hss_history) + 1000}",
                "user_id": user_id,
                "score": predicted_hss,
                "tier": tier,
                "contributing_factors": {"ml_predicted": "True"},
                "computed_at": datetime.utcnow()
            }
            
            mock_db.hss_history.append(new_hss)
            return new_hss
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return 80 # Fallback

ml_service = MLService()
