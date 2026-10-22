"""Trains the starting score (baseline HSS) from NHANES 2017-2018 and writes app/ml/starting_score_model.json.

    python scripts/train_starting_score.py --data-dir "C:\\path\\to\\nhanes-2017-2018"

The folder needs DEMO_J, BMX_J, SMQ_J, PAQ_J, SLQ_J, ALQ_J and MCQ_J (.xpt, from the CDC NHANES website).

- People: adults 20 and over.
- Label (pending cardiologist review): ever told by a doctor they had congestive heart failure, coronary heart
  disease, angina, a heart attack or a stroke.
- Inputs: only what HeartLink's setup asks (see INPUTS). Diet is left out: setup's diet questions don't match anything
  NHANES measures, and diet is tracked day to day through meal logs.
- Model: plain logistic regression on standardised inputs, so its probability is a real "share of people like you
  who have heart disease". The app turns it into a score with (1 - p) * 99 + 1.

Change the label or inputs here, run it again, and the app picks up the new JSON; no app code changes needed.
"""
import argparse
import json
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# Same order the app builds them in (app/services/feature_transform.py).
INPUTS = [
    "age", "male", "bmi", "current_smoker", "former_smoker", "active_min_week",
    "sitting_hours", "sleep_hours", "drinks_week", "binge_days_year",
]
LABEL = "Ever told heart failure, coronary heart disease, angina, heart attack or stroke (NHANES MCQ160B-F)"
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "ml", "starting_score_model.json")

# NHANES ALQ121 / ALQ142 answer codes as times per year (0 never in the past year ... 1 every day ... 10 once or twice).
TIMES_PER_YEAR = {0: 0, 1: 365, 2: 250, 3: 182, 4: 104, 5: 52, 6: 30, 7: 12, 8: 9, 9: 4.5, 10: 1.5}


def read(folder: str, name: str) -> pd.DataFrame:
    return pd.read_sas(os.path.join(folder, f"{name}.xpt"), format="xport").set_index("SEQN")


def clean(s: pd.Series, refused: list) -> pd.Series:
    """Drops 'refused' and 'don't know' codes."""
    return s.where(~s.isin(refused))


def weekly_minutes(flag: pd.Series, days: pd.Series, minutes: pd.Series) -> pd.Series:
    per_week = clean(days, [77, 99]) * clean(minutes, [7777, 9999])
    return pd.Series(np.where(flag == 1, per_week, np.where(flag == 2, 0.0, np.nan)), index=flag.index)


def build(folder: str):
    d = read(folder, "DEMO_J")[["RIDAGEYR", "RIAGENDR"]].join([
        read(folder, "BMX_J")[["BMXBMI"]],
        read(folder, "SMQ_J")[["SMQ020", "SMQ040"]],
        read(folder, "PAQ_J")[["PAQ635", "PAQ640", "PAD645", "PAQ650", "PAQ655", "PAD660", "PAQ665", "PAQ670", "PAD675", "PAD680"]],
        read(folder, "SLQ_J")[["SLD012"]],
        read(folder, "ALQ_J")[["ALQ111", "ALQ121", "ALQ130", "ALQ142"]],
        read(folder, "MCQ_J")[["MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E", "MCQ160F"]],
    ])
    d = d[d.RIDAGEYR >= 20]

    x = pd.DataFrame(index=d.index)
    x["age"] = d.RIDAGEYR
    x["male"] = (d.RIAGENDR == 1).astype(float)
    x["bmi"] = d.BMXBMI.clip(15, 60)
    ever = clean(d.SMQ020, [7, 9])
    now = clean(d.SMQ040, [7, 9])
    x["current_smoker"] = np.where(ever.isna(), np.nan, ((ever == 1) & now.isin([1, 2])).astype(float))
    x["former_smoker"] = np.where(ever.isna(), np.nan, ((ever == 1) & (now == 3)).astype(float))
    # Leisure only (what setup asks), vigorous counted twice as the WHO guidance does.
    x["active_min_week"] = (
        2 * weekly_minutes(d.PAQ650, d.PAQ655, d.PAD660)
        + weekly_minutes(d.PAQ665, d.PAQ670, d.PAD675)
        + weekly_minutes(d.PAQ635, d.PAQ640, d.PAD645)
    ).clip(0, 3000)
    x["sitting_hours"] = clean(d.PAD680, [7777, 9999]) / 60
    x["sleep_hours"] = clean(d.SLD012, [77, 99])

    never_drinks = d.ALQ111 == 2
    drink_days = clean(d.ALQ121, [77, 99]).map(TIMES_PER_YEAR)
    drink_days = drink_days.where(~never_drinks, 0)
    per_day = clean(d.ALQ130, [777, 999])
    per_day = per_day.fillna(per_day.median()).where(drink_days > 0, 0)
    x["drinks_week"] = (drink_days * per_day / 52).clip(0, 70)
    binge = clean(d.ALQ142, [77, 99]).map(TIMES_PER_YEAR)
    x["binge_days_year"] = binge.where(drink_days > 0, 0)

    y = (d[["MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E", "MCQ160F"]] == 1).any(axis=1).astype(int)
    return x[INPUTS], y


def band(score: float) -> str:
    return "Stable" if score >= 80 else "Moderate" if score >= 60 else "Elevated Risk" if score >= 50 else "Critical"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    x, y = build(args.data_dir)
    medians = x.median()
    x = x.fillna(medians)

    def model():
        return make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))

    folds = StratifiedKFold(5, shuffle=True, random_state=0)
    p = cross_val_predict(model(), x, y, cv=folds, method="predict_proba")[:, 1]
    p_age = cross_val_predict(model(), x[["age"]], y, cv=folds, method="predict_proba")[:, 1]
    scores = (1 - p) * 99 + 1
    bands = pd.Series([band(s) for s in scores], index=x.index)
    order = ["Stable", "Moderate", "Elevated Risk", "Critical"]
    metrics = {
        "people": int(len(x)),
        "label_rate": round(float(y.mean()), 3),
        "auc": round(float(roc_auc_score(y, p)), 3),
        "auc_age_only": round(float(roc_auc_score(y, p_age)), 3),
        "brier": round(float(brier_score_loss(y, p)), 3),
        "band_share": {b: round(float((bands == b).mean()), 3) for b in order},
        "label_rate_by_band": {b: round(float(y[bands == b].mean()), 3) for b in order if (bands == b).any()},
    }

    fitted = model().fit(x, y)
    scaler, lr = fitted[0], fitted[-1]
    out = {
        "version": "starting-score-2",
        "trained_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data": "NHANES 2017-2018, adults 20+",
        "label": LABEL,
        "label_status": "pending cardiologist review",
        "inputs": INPUTS,
        "medians": {k: round(float(medians[k]), 4) for k in INPUTS},
        "means": [round(float(v), 6) for v in scaler.mean_],
        "scales": [round(float(v), 6) for v in scaler.scale_],
        "weights": [round(float(v), 6) for v in lr.coef_[0]],
        "intercept": round(float(lr.intercept_[0]), 6),
        "metrics_cross_validated": metrics,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)
        fh.write("\n")

    print(f"People: {metrics['people']}, with heart disease or stroke: {metrics['label_rate']:.1%}")
    print(f"Cross-validated AUC {metrics['auc']} (age alone {metrics['auc_age_only']}), Brier {metrics['brier']}")
    print("Starting bands:", {b: f"{s:.0%}" for b, s in metrics["band_share"].items()})
    print("Heart disease or stroke in each band:", {b: f"{s:.0%}" for b, s in metrics["label_rate_by_band"].items()})
    print("Weights per standard deviation:", dict(zip(INPUTS, out["weights"])))
    print("Wrote", os.path.abspath(args.out))


if __name__ == "__main__":
    main()
