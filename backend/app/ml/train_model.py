import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score

def train_model(dataset_path="dataset.csv", model_path="rf_model.pkl"):
    print("Loading dataset...")
    df = pd.read_csv(dataset_path)
    
    # Features and Target
    X = df.drop(columns=["css_score"])
    y = df["css_score"]
    
    # Identify column types
    categorical_features = ["smoking_status", "sodium_frequency"]
    numeric_features = [
        "avg_sleep_hours", 
        "family_history", 
        "condition_count", 
        "on_medication", 
        "resting_bp_mmhg", 
        "max_heart_rate_bpm"
    ]
    
    print("Building pipeline...")
    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
        ]
    )
    
    # Define model
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    
    # Create Full Pipeline
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", rf_model)
    ])
    
    print("Training Random Forest Regressor...")
    pipeline.fit(X, y)
    
    # Save the pipeline
    joblib.dump(pipeline, model_path)
    print(f"Model saved successfully to {model_path}")

def retrain_from_evaluations():
    import app.mock_db as mock_db
    from app.services.users import get_full_profile
    from app.services.ml_service import ml_service
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(current_dir, "..", "..", "dataset.csv")
    model_path = os.path.join(current_dir, "rf_model.pkl")
    
    # 1. Load original synthetic data
    df = pd.read_csv(dataset_path)
    
    # 2. Extract features from expert_evaluations
    new_data = []
    evaluations = mock_db.expert_evaluations
    for ev in evaluations:
        if ev.get("status") == "Archived":
            continue
            
        if ev.get("expert_css_score") is not None:
            user_id = ev["user_id"]
            profile_data = get_full_profile(user_id)
            if not profile_data:
                continue
            
            lifestyle = profile_data.get("baselines", {}).get("lifestyle") or {}
            dietary = profile_data.get("baselines", {}).get("dietary") or {}
            clinical = profile_data.get("baselines", {}).get("clinical") or {}
            
            # Map features
            new_data.append({
                "smoking_status": lifestyle.get("smoking_status", "never"),
                "avg_sleep_hours": lifestyle.get("avg_sleep_hours", 7),
                "family_history": 1 if lifestyle.get("family_history") else 0,
                "sodium_frequency": dietary.get("sodium_frequency", "occasionally"),
                "condition_count": len(clinical.get("diagnosed_conditions", [])),
                "on_medication": 1 if clinical.get("on_medication") else 0,
                "resting_bp_mmhg": clinical.get("resting_bp_mmhg") or 120,
                "max_heart_rate_bpm": clinical.get("max_heart_rate_bpm") or 170,
                "css_score": ev["expert_css_score"]
            })
            
    if new_data:
        df_new = pd.DataFrame(new_data)
        # 3. Combine original and new expert data
        # We can oversample or just append. Let's just append for now
        df = pd.concat([df, df_new], ignore_index=True)
    
    # 4. Retrain
    X = df.drop(columns=["css_score"])
    y = df["css_score"]
    
    categorical_features = ["smoking_status", "sodium_frequency"]
    numeric_features = [
        "avg_sleep_hours", 
        "family_history", 
        "condition_count", 
        "on_medication", 
        "resting_bp_mmhg", 
        "max_heart_rate_bpm"
    ]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
        ]
    )
    
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", rf_model)
    ])
    
    pipeline.fit(X, y)
    
    # Calculate metrics on the training set (just to report something back)
    y_pred = pipeline.predict(X)
    mae = mean_absolute_error(y, y_pred)
    r2 = r2_score(y, y_pred)
    
    joblib.dump(pipeline, model_path)
    
    # 5. Reload model in ml_service so the server uses the new one
    try:
        ml_service.model = pipeline
    except Exception as e:
        print(f"Error reloading model in memory: {e}")
    
    return {
        "sample_count": len(df),
        "expert_samples": len(new_data),
        "mae": round(mae, 2),
        "r2": round(r2, 4)
    }

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_file = os.path.join(current_dir, "..", "..", "dataset.csv")
    model_file = os.path.join(current_dir, "rf_model.pkl")
    train_model(dataset_file, model_file)
