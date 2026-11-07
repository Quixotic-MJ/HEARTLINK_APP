"""The first score after setup: a machine learning model's estimate of a person's Life's Essential 8 score.

The model is a linear regression trained on NHANES 2017-2018 (scripts/train_starting_score.py, app/ml/STARTING_SCORE.md). Setup
answers become the AHA's points where the AHA has a table for them, so the same conversion is used in training and in the app.
HeartLink's own rules are then applied, as they are after the first log. From the first log onward, heart_score.py takes over.
"""
import json
import os
from functools import lru_cache
from typing import Any, Dict, Optional, Tuple

import pandas as pd

from app.services.feature_transform import INPUTS, transform_to_model_features
from app.services.heart_score import activity_points, bmi_points, final_score, nicotine_points, sleep_points
from app.services.hss_service import determine_tier

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml", "starting_score_model.json")

FEATURES = ["bmi_points", "activity_points", "sleep_points", "nicotine_points", "age", "male"]


class HSSModelError(Exception):
    """Raised when the ML model cannot be loaded or used."""
    pass


@lru_cache(maxsize=1)
def load_hss_model() -> Dict[str, Any]:
    if not os.path.exists(MODEL_PATH):
        raise HSSModelError(f"Model file not found at {MODEL_PATH}")
    try:
        with open(MODEL_PATH, encoding="utf-8") as fh:
            model = json.load(fh)
    except Exception as e:
        raise HSSModelError(f"Failed to load model: {str(e)}")
    if model.get("inputs") != INPUTS or model.get("features") != FEATURES:
        raise HSSModelError("Model inputs don't match the app's starting-score inputs")
    return model


def bmi_feature_points(bmi: float) -> int:
    """The AHA's Asian and Pacific row. It starts at 18.5, so under that uses the AHA's standard row, which gives 100."""
    points = bmi_points(bmi)
    return 100 if points is None else points


def to_features(inputs: pd.Series, quit_when: Optional[str]) -> Dict[str, float]:
    """One person's setup answers, with nothing missing, as the model's features."""
    if inputs["current_smoker"] == 1:
        nicotine = nicotine_points(True, "Every day", None)
    elif inputs["former_smoker"] == 1:
        nicotine = nicotine_points(True, "Not at all", quit_when)
    else:
        nicotine = nicotine_points(False, None, None)
    return {
        "bmi_points": bmi_feature_points(inputs["bmi"]),
        "activity_points": activity_points(inputs["active_min_week"]),
        "sleep_points": sleep_points(inputs["sleep_hours"]),
        "nicotine_points": nicotine,
        "age": inputs["age"],
        "male": inputs["male"],
    }


def estimate(inputs: pd.Series, quit_when: Optional[str], model: Dict[str, Any]) -> float:
    """The model's estimate, from 0 to 100. Missing answers use the training median."""
    filled = inputs.where(inputs.notna(), pd.Series(model["medians"]))
    features = to_features(filled, quit_when)
    total = model["intercept"]
    for name, mean, scale, weight in zip(model["features"], model["means"], model["scales"], model["weights"]):
        total += (features[name] - mean) / scale * weight
    return float(min(100.0, max(0.0, total)))


def compute_initial_hss(onboarding_data: Dict[str, Any], user_profile: Dict[str, Any]) -> Tuple[int, str, float, Optional[str]]:
    """The first score from setup answers: (score, level, the model's raw estimate, the HeartLink rule that changed it)."""
    model = load_hss_model()
    inputs = transform_to_model_features(onboarding_data, user_profile).iloc[0]
    try:
        raw = estimate(inputs, onboarding_data.get("smoke_quit_when"), model)
    except Exception as e:
        raise HSSModelError(f"Model prediction failed: {str(e)}")
    # There's no reading at setup, so it can't go above 79 and answers alone can't pause workouts
    score, rule = final_score(int(raw + 0.5), False, None, False)
    return score, determine_tier(score), raw, rule
