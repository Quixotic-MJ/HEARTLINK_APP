# backend/offline_training_utility.py
import os
import sys
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

def train_candidate_model(dataset_metadata: dict, save_dir: str = ".") -> dict:
    """
    Offline training utility foundation:
    1. Loads dataset rows.
    2. Validates required columns.
    3. Detects missing features or versions.
    4. Splits data appropriately.
    5. Trains candidate regression model.
    6. Saves heartlink_model_candidate_<dataset_id>.pkl.
    7. Produces evaluation report.
    """
    rows = dataset_metadata.get("rows", [])
    dataset_id = dataset_metadata.get("dataset_id", "default")
    
    if not rows:
        return {"status": "error", "message": "Dataset is empty."}
        
    df = pd.DataFrame(rows)
    
    # 1. Validate required columns
    required_cols = ["evaluation_id", "expert_hss_score", "expert_hss_tier", "model_features", "model_hash"]
    for col in required_cols:
        if col not in df.columns:
            return {"status": "error", "message": f"Missing required column: {col}"}
            
    # 2. Detect mixed model versions
    model_hashes = df["model_hash"].unique()
    is_mixed = len(model_hashes) > 1
    
    X_list = []
    y_list = []
    
    feature_order = [
        'RIDAGEYR', 'RIAGENDR', 'PAQ605', 'PAQ610', 'PAD615', 'PAQ620', 'PAQ625', 'PAD630', 
        'PAQ635', 'PAQ640', 'PAD645', 'PAQ650', 'PAQ655', 'PAD660', 'PAQ665', 'PAQ670', 'PAD675', 
        'PAD680', 'SLD012', 'SMQ020', 'SMQ040', 'ALQ111', 'ALQ121', 'ALQ130', 'ALQ142', 'DR1TKCAL', 
        'DR1TPROT', 'DR1TCARB', 'DR1TSUGR', 'DR1TFIBE', 'DR1TTFAT', 'DR1TSFAT', 'DR1TMFAT', 'DR1TPFAT', 
        'DR1TCHOL', 'DR1TSODI', 'DR1TPOTA'
    ]
    
    missing_features_count = 0
    for idx, row in df.iterrows():
        feat = row["model_features"]
        if not feat or not isinstance(feat, dict):
            missing_features_count += 1
            continue
            
        row_feat = []
        is_missing_f = False
        for f in feature_order:
            val = feat.get(f)
            if val is None:
                is_missing_f = True
                row_feat.append(0.0)
            else:
                row_feat.append(float(val))
                
        if is_missing_f:
            missing_features_count += 1
            
        X_list.append(row_feat)
        y_list.append(float(row["expert_hss_score"]))
        
    X = np.array(X_list)
    y = np.array(y_list)
    
    # Report info
    dataset_size = len(X)
    
    # 3. Check split safety
    if dataset_size < 2:
        # Default training with single sample or simple fit
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=42)
        
    # 4. Train model candidate
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # 5. Evaluate MAE
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    
    # Derive agreement count on test set
    agreement_count = 0
    for idx, pred_score in enumerate(preds):
        clamped = max(0, min(100, round(pred_score)))
        
        # Derive Tiers
        def get_tier(score):
            if score >= 80: return "Stable"
            elif score >= 60: return "Moderate"
            elif score >= 50: return "Elevated Risk"
            return "Critical"
            
        pred_tier = get_tier(clamped)
        actual_tier = get_tier(y_test[idx])
        if pred_tier == actual_tier:
            agreement_count += 1
            
    agreement_rate = (agreement_count / len(y_test)) * 100 if len(y_test) > 0 else 0.0
    
    # 6. Save candidate model artifact separately (DO NOT overwrite heartlink_model.pkl)
    candidate_filename = f"heartlink_model_candidate_{dataset_id}.pkl"
    candidate_filepath = os.path.join(save_dir, candidate_filename)
    
    with open(candidate_filepath, "wb") as f:
        pickle.dump(model, f)
        
    # Model binary hash
    import hashlib
    hasher = hashlib.sha256()
    with open(candidate_filepath, "rb") as f:
        hasher.update(f.read())
    model_hash = hasher.hexdigest()
    
    return {
        "status": "success",
        "dataset_id": dataset_id,
        "dataset_size": dataset_size,
        "missing_features_count": missing_features_count,
        "is_mixed_versions": is_mixed,
        "mae": float(round(mae, 2)),
        "tier_agreement_rate": float(round(agreement_rate, 2)),
        "artifact_filename": candidate_filename,
        "model_hash": model_hash
    }
