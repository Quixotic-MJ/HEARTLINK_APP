import pandas as pd
import numpy as np
from typing import Dict, Any

# Diet estimation lookup tables based on training data medians
DIET_ESTIMATES = {
    "light": {      # ~1200-1500 cal/day
        "DR1TKCAL": 1350,
        "DR1TPROT": 50,  "DR1TCARB": 170, "DR1TSUGR": 65,
        "base_fat":  { "DR1TTFAT": 50, "DR1TSFAT": 16, "DR1TMFAT": 18, "DR1TPFAT": 12, "DR1TCHOL": 200 },
        "base_sodium": 2200,
        "base_fiber": 12, "base_potassium": 1800,
    },
    "average": {    # ~1500-2000 cal/day
        "DR1TKCAL": 1750,
        "DR1TPROT": 72,  "DR1TCARB": 224, "DR1TSUGR": 90,
        "base_fat":  { "DR1TTFAT": 70, "DR1TSFAT": 23, "DR1TMFAT": 25, "DR1TPFAT": 17, "DR1TCHOL": 270 },
        "base_sodium": 3000,
        "base_fiber": 15, "base_potassium": 2400,
    },
    "heavy": {      # ~2000-2500 cal/day
        "DR1TKCAL": 2250,
        "DR1TPROT": 90,  "DR1TCARB": 280, "DR1TSUGR": 110,
        "base_fat":  { "DR1TTFAT": 90, "DR1TSFAT": 30, "DR1TMFAT": 32, "DR1TPFAT": 20, "DR1TCHOL": 340 },
        "base_sodium": 3800,
        "base_fiber": 18, "base_potassium": 2800,
    },
    "very_heavy": { # ~2500+ cal/day
        "DR1TKCAL": 2750,
        "DR1TPROT": 105, "DR1TCARB": 340, "DR1TSUGR": 140,
        "base_fat":  { "DR1TTFAT": 115, "DR1TSFAT": 40, "DR1TMFAT": 40, "DR1TPFAT": 25, "DR1TCHOL": 400 },
        "base_sodium": 4500,
        "base_fiber": 20, "base_potassium": 3200,
    },
}

FAT_SCALE = { "rarely": 0.7, "sometimes": 1.0, "often": 1.3, "daily": 1.6 }
SODIUM_SCALE = { "rarely": 0.7, "sometimes": 1.0, "often": 1.4, "daily": 1.8 }
FRUIT_VEG_SCALE = { "0-1": 0.5, "2-3": 1.0, "4-5": 1.5, "6+": 2.0 }


def transform_to_model_features(data: Dict[str, Any], user_profile: Dict[str, Any]) -> pd.DataFrame:
    """
    Transforms onboarding questionnaire data into the 37 NHANES features
    expected by the heartlink_model.pkl pipeline.
    """
    # 1. Demographics
    dob = user_profile.get("date_of_birth")
    if dob:
        if isinstance(dob, str):
            dob = pd.to_datetime(dob).date()
        age = pd.Timestamp.now().year - dob.year
    else:
        age = 45 # Fallback average

    sex_val = 1.0 if user_profile.get("sex") == "male" else 2.0

    # 2. Physical Activity
    vigorous = 1.0 if data.get("vigorous_activity") else 2.0
    vig_days = float(data.get("vigorous_days")) if data.get("vigorous_days") else np.nan
    vig_min = float(data.get("vigorous_minutes")) if data.get("vigorous_minutes") else np.nan
    
    moderate = 1.0 if data.get("moderate_activity") else 2.0
    mod_days = float(data.get("moderate_days")) if data.get("moderate_days") else np.nan
    mod_min = float(data.get("moderate_minutes")) if data.get("moderate_minutes") else np.nan
    
    walk_bike = 1.0 if data.get("walk_bike_transport") else 2.0
    wb_days = float(data.get("walk_bike_days")) if data.get("walk_bike_days") else np.nan
    wb_min = float(data.get("walk_bike_minutes")) if data.get("walk_bike_minutes") else np.nan

    sedentary_map = {"<2h": 60, "2-4h": 180, "4-6h": 300, "6-8h": 420, "8+h": 540}
    sedentary_min = sedentary_map.get(data.get("sedentary_hours"), 240)

    # 3. Sleep & Smoking
    sleep_hrs = float(data.get("sleep_hours", 8))
    
    ever_smoked = 1.0 if data.get("ever_smoked") else 2.0
    smoke_now_map = {"Every day": 1.0, "Some days": 2.0, "Not at all": 3.0}
    smoke_now = smoke_now_map.get(data.get("smoke_now"), 3.0) if ever_smoked == 1.0 else 3.0

    # 4. Alcohol
    ever_drank = 1.0 if data.get("ever_drank") else 2.0
    
    freq_map = {"Never": 0, "Monthly or less": 1, "2-4x/month": 3, "2-3x/week": 6, "4+/week": 10}
    drink_freq = freq_map.get(data.get("drink_frequency"), 0) if ever_drank == 1.0 else 0
    
    drinks_map = {"1-2": 1, "3-4": 3, "5+": 5}
    drinks_per_day = drinks_map.get(data.get("drinks_per_occasion")) if ever_drank == 1.0 and drink_freq > 0 else np.nan
    
    binge_map = {"Never": 0, "Monthly or less": 1, "2-4x/month": 3, "2-3x/week": 6, "4+/week": 10}
    binge_freq = binge_map.get(data.get("binge_drinking_freq"), 0) if ever_drank == 1.0 and drink_freq > 0 else 0

    # 5. Diet Estimation
    diet_level = data.get("diet_level", "average")
    base_diet = DIET_ESTIMATES.get(diet_level, DIET_ESTIMATES["average"])
    
    f_scale = FAT_SCALE.get(data.get("fried_food_freq", "sometimes"), 1.0)
    s_scale = SODIUM_SCALE.get(data.get("salty_food_freq", "sometimes"), 1.0)
    v_scale = FRUIT_VEG_SCALE.get(data.get("fruit_veg_servings", "2-3"), 1.0)

    features = {
        'RIDAGEYR': age,
        'RIAGENDR': sex_val,
        'PAQ605': vigorous,
        'PAQ610': vig_days,
        'PAD615': vig_min,
        'PAQ620': moderate,
        'PAQ625': mod_days,
        'PAD630': mod_min,
        'PAQ635': walk_bike,
        'PAQ640': wb_days,
        'PAD645': wb_min,
        'PAQ650': vigorous,  # Reusing vigorous
        'PAQ655': vig_days,  # Reusing vigorous
        'PAD660': vig_min,   # Reusing vigorous
        'PAQ665': moderate,  # Reusing moderate
        'PAQ670': mod_days,  # Reusing moderate
        'PAD675': mod_min,   # Reusing moderate
        'PAD680': sedentary_min,
        'SLD012': sleep_hrs,
        'SMQ020': ever_smoked,
        'SMQ040': smoke_now,
        'ALQ111': ever_drank,
        'ALQ121': drink_freq,
        'ALQ130': drinks_per_day,
        'ALQ142': binge_freq,
        'DR1TKCAL': base_diet["DR1TKCAL"],
        'DR1TPROT': base_diet["DR1TPROT"],
        'DR1TCARB': base_diet["DR1TCARB"],
        'DR1TSUGR': base_diet["DR1TSUGR"],
        'DR1TFIBE': base_diet["base_fiber"] * v_scale,
        'DR1TTFAT': base_diet["base_fat"]["DR1TTFAT"] * f_scale,
        'DR1TSFAT': base_diet["base_fat"]["DR1TSFAT"] * f_scale,
        'DR1TMFAT': base_diet["base_fat"]["DR1TMFAT"] * f_scale,
        'DR1TPFAT': base_diet["base_fat"]["DR1TPFAT"] * f_scale,
        'DR1TCHOL': base_diet["base_fat"]["DR1TCHOL"] * f_scale,
        'DR1TSODI': base_diet["base_sodium"] * s_scale,
        'DR1TPOTA': base_diet["base_potassium"] * v_scale,
    }

    # Order exactly as expected by the model
    feature_order = [
        'RIDAGEYR', 'RIAGENDR', 'PAQ605', 'PAQ610', 'PAD615', 'PAQ620', 'PAQ625', 'PAD630', 
        'PAQ635', 'PAQ640', 'PAD645', 'PAQ650', 'PAQ655', 'PAD660', 'PAQ665', 'PAQ670', 'PAD675', 
        'PAD680', 'SLD012', 'SMQ020', 'SMQ040', 'ALQ111', 'ALQ121', 'ALQ130', 'ALQ142', 'DR1TKCAL', 
        'DR1TPROT', 'DR1TCARB', 'DR1TSUGR', 'DR1TFIBE', 'DR1TTFAT', 'DR1TSFAT', 'DR1TMFAT', 'DR1TPFAT', 
        'DR1TCHOL', 'DR1TSODI', 'DR1TPOTA'
    ]
    
    # Create single row DataFrame
    df = pd.DataFrame([features])[feature_order]
    return df
