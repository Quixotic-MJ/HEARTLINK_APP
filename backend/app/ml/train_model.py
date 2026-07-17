import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

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

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_file = os.path.join(current_dir, "..", "..", "dataset.csv")
    model_file = os.path.join(current_dir, "rf_model.pkl")
    train_model(dataset_file, model_file)
