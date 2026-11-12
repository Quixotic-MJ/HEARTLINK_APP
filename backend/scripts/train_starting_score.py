"""Trains the starting score's model from NHANES 2017-2018: it estimates a person's Life's Essential 8 score from setup answers.

    python scripts/train_starting_score.py --data-dir "C:\\path\\to\\nhanes-2017-2018"          (report only)
    python scripts/train_starting_score.py --data-dir "C:\\path\\to\\nhanes-2017-2018" --write  (also replaces the model)

The folder needs these .xpt files from the CDC NHANES website: DEMO_J, BMX_J, BPX_J, BPQ_J, SMQ_J, SMQFAM_J, PAQ_J, SLQ_J, ALQ_J,
MCQ_J, TCHOL_J, HDL_J, GHB_J, GLU_J, DIQ_J, DR1TOT_J, DR2TOT_J, DR1IFF_J and DR2IFF_J, plus FPED_1718.csv, USDA's
FPED_1718.xls (first sheet) saved as CSV.

- People: adults 20 and over with all 8 areas, not pregnant, and not told they have heart disease or had a stroke. The AHA's own
  NHANES analysis left out the same people, and the app isn't a care plan for them.
- Label: each person's LE8 score, from le8_label.py. The AHA's points, on real NHANES measurements and answers.
- Inputs: only what HeartLink's setup asks. BMI, activity, sleep and smoking first become the AHA's points, then the model
  uses those with age and sex (app/services/starting_score.py), so training and the app convert answers the same way.
- Model: plain linear regression on standardised features, kept as numbers in a JSON file. Its answer is on the LE8 scale.

--clinical-export checks the current model against the portal's clinical reviews (HL-059). Retraining from them is switched off:
they hold yes/no answers from the old model's method, which don't fit a model that estimates an LE8 score.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import cohen_kappa_score, mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from le8_label import LABEL, build_labels, clean, read, weekly_minutes, years_since_quit  # noqa: E402
from app.services.feature_transform import INPUTS  # noqa: E402
from app.services.starting_score import FEATURES, estimate, to_features  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "ml", "starting_score_model.json")
TIERS = ["Stable", "Moderate", "Elevated Risk", "Critical"]
# Questions setup doesn't ask, tested only to see how much they'd help
EXTRA_QUESTIONS = ["told_high_bp", "told_high_cholesterol", "told_diabetes"]

# NHANES ALQ121 / ALQ142 answer codes as times per year (0 never in the past year ... 1 every day ... 10 once or twice).
TIMES_PER_YEAR = {0: 0, 1: 365, 2: 250, 3: 182, 4: 104, 5: 52, 6: 30, 7: 12, 8: 9, 9: 4.5, 10: 1.5}


def build_inputs(folder: str, index: pd.Index) -> pd.DataFrame:
    """The answers setup collects, in the meanings NHANES records them."""
    d = read(folder, "DEMO_J")[["RIDAGEYR", "RIAGENDR"]].reindex(index).join([
        read(folder, "BMX_J")[["BMXBMI"]],
        read(folder, "SMQ_J")[["SMQ020", "SMQ040"]],
        read(folder, "PAQ_J")[["PAQ635", "PAQ640", "PAD645", "PAQ650", "PAQ655", "PAD660", "PAQ665", "PAQ670", "PAD675", "PAD680"]],
        read(folder, "SLQ_J")[["SLD012"]],
        read(folder, "ALQ_J")[["ALQ111", "ALQ121", "ALQ130", "ALQ142"]],
    ])

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
    return x[INPUTS]


def extra_questions(folder: str, index: pd.Index) -> pd.DataFrame:
    bpq = read(folder, "BPQ_J").reindex(index)
    diq = read(folder, "DIQ_J").reindex(index)
    return pd.DataFrame({
        "told_high_bp": (bpq.BPQ020 == 1).astype(float),
        "told_high_cholesterol": (bpq.BPQ080 == 1).astype(float),
        "told_diabetes": (diq.DIQ010 == 1).astype(float),
    }, index=index)


def band(score: float) -> str:
    return "Stable" if score >= 80 else "Moderate" if score >= 60 else "Elevated Risk" if score >= 50 else "Critical"


def fit_quality(y: pd.Series, predicted: np.ndarray) -> dict:
    error = predicted - y.to_numpy()
    true_levels = [band(v) for v in y]
    levels = [band(v) for v in predicted]
    idx = [TIERS.index(t) for t in true_levels], [TIERS.index(t) for t in levels]
    return {
        "rmse": round(float(np.sqrt((error ** 2).mean())), 2),
        "mean_error_points": round(float(mean_absolute_error(y, predicted)), 2),
        "r2": round(float(r2_score(y, predicted)), 3),
        "within_10_points": round(float((np.abs(error) <= 10).mean()), 3),
        "same_level": round(float(np.mean([a == b for a, b in zip(true_levels, levels)])), 3),
        "weighted_kappa": round(float(cohen_kappa_score(*idx, labels=list(range(len(TIERS))), weights="quadratic")), 3),
        # The estimate said a safer level than the real score
        "too_optimistic_level": round(float(np.mean([p < t for t, p in zip(*idx)])), 3),
    }


def groups(x: pd.DataFrame, y: pd.Series, predicted: np.ndarray) -> dict:
    p = pd.Series(predicted, index=y.index)
    masks = {
        "women": x.male == 0, "men": x.male == 1, "age_20_39": x.age < 40,
        "age_40_59": (x.age >= 40) & (x.age < 60), "age_60_plus": x.age >= 60,
    }
    return {
        name: {
            "people": int(m.sum()),
            "mean_error_points": round(float((p[m] - y[m]).abs().mean()), 2),
            "average_real": round(float(y[m].mean()), 1),
            "average_estimate": round(float(p[m].mean()), 1),
        }
        for name, m in masks.items()
    }


def linear():
    return make_pipeline(StandardScaler(), LinearRegression())


def quit_answers(folder: str, index: pd.Index) -> pd.Series:
    """How long ago each former smoker quit, as setup's answer."""
    q = read(folder, "SMQ_J").reindex(index)
    years = pd.Series([years_since_quit(a, b) for a, b in zip(q.SMQ050Q, q.SMQ050U)], index=index)
    return years.map(lambda y: None if np.isnan(y) else "5_plus_years" if y >= 5 else "1_to_5_years" if y >= 1 else "under_1_year")


def features_of(x: pd.DataFrame, quits: pd.Series) -> pd.DataFrame:
    return pd.DataFrame([to_features(x.loc[i], quits.loc[i]) for i in x.index], index=x.index, columns=FEATURES, dtype=float)


def rules_only(f: pd.DataFrame) -> np.ndarray:
    """Option B: the plain average of the AHA points that setup answers can give."""
    return f[["bmi_points", "activity_points", "sleep_points", "nicotine_points"]].mean(axis=1).to_numpy()


def clinical_check(path: str, medians: pd.Series) -> None:
    """Model Check's measures on the portal's clinical reviews (HL-059): agreement and under-calling.
    HL-153: since then Cardiologists judge the Heart risk, not the habits score, so newer exports are checked with
    scripts/train_heart_risk.py --clinical-export instead."""
    with open(path, encoding="utf-8") as fh:
        export = json.load(fh)
    if export.get("format") != "clinical-export-1":
        raise SystemExit("This export has Heart risk reviews (HL-153). Check it with: "
                         "python scripts/train_heart_risk.py --clinical-export <file>")
    if export.get("inputs") != INPUTS:
        raise SystemExit(f"The export's inputs {export.get('inputs')} don't match this model's {INPUTS}.")
    rows = export["rows"]
    x = pd.DataFrame([r["inputs"] for r in rows], columns=INPUTS, dtype=float).fillna(medians)
    with open(OUT, encoding="utf-8") as fh:
        model = json.load(fh)
    predicted = [TIERS.index(band(estimate(row, None, model))) for _, row in x.iterrows()]
    expert = [TIERS.index(r["expert_tier"]) for r in rows]
    n = len(rows)
    print(f"Clinical reviews: {n}, agreement {sum(a == b for a, b in zip(predicted, expert)) / n:.0%}, "
          f"under-calling {sum(a < b for a, b in zip(predicted, expert)) / n:.0%}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--write", action="store_true", help="replace app/ml/starting_score_model.json")
    parser.add_argument("--report", help="also save the results to this JSON file")
    parser.add_argument("--clinical-export", help="the portal's clinical reviews export (HL-059), checked but not trained on")
    args = parser.parse_args()

    labels = build_labels(args.data_dir)
    people = labels[labels.le8_asian.notna() & ~labels.pregnant & ~labels.heart_disease]
    y = people.le8_asian
    x_raw = build_inputs(args.data_dir, people.index)
    medians = x_raw.median()
    x = x_raw.fillna(medians)
    f = features_of(x, quit_answers(args.data_dir, people.index))

    folds = KFold(5, shuffle=True, random_state=0)
    this_model = np.clip(cross_val_predict(linear(), f, y, cv=folds), 0, 100)
    raw_answers = np.clip(cross_val_predict(linear(), x, y, cv=folds), 0, 100)
    guess = np.full(len(y), np.nan)
    for train, test in folds.split(x):
        guess[test] = y.iloc[train].mean()
    age_only = np.clip(cross_val_predict(linear(), x[["age"]], y, cv=folds), 0, 100)
    boosted = np.clip(cross_val_predict(HistGradientBoostingRegressor(random_state=0), x, y, cv=folds), 0, 100)
    with_extra = f.join(extra_questions(args.data_dir, people.index))
    extra = np.clip(cross_val_predict(linear(), with_extra, y, cv=folds), 0, 100)

    metrics = {
        "people": int(len(y)),
        "average_score": round(float(y.mean()), 1),
        "spread_of_scores_sd": round(float(y.std()), 1),
        "share_by_level": {t: round(float(np.mean([band(v) == t for v in y])), 3) for t in TIERS},
        "this_model": fit_quality(y, this_model),
        "plain_aha_rules_on_setup_answers": fit_quality(y, rules_only(f)),
        "linear_on_raw_answers": fit_quality(y, raw_answers),
        "guessing_the_average": fit_quality(y, guess),
        "age_alone": fit_quality(y, age_only),
        "gradient_boosting": fit_quality(y, boosted),
        "if_setup_also_asked_told_bp_cholesterol_diabetes": fit_quality(y, extra),
        "by_group": groups(x, y, this_model),
    }

    fitted = linear().fit(f, y)
    scaler, lr = fitted[0], fitted[-1]
    out = {
        "version": "starting-score-le8-1",
        "kind": "linear regression, estimates an LE8 score",
        "trained_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data": "NHANES 2017-2018, adults 20+ with all 8 areas, not pregnant, no heart disease or stroke",
        "label": LABEL,
        "bmi_row": "AHA Asian and Pacific row for everyone",
        "label_status": "pending expert review",
        "inputs": INPUTS,
        "features": FEATURES,
        "medians": {k: round(float(medians[k]), 4) for k in INPUTS},
        "means": [round(float(v), 6) for v in scaler.mean_],
        "scales": [round(float(v), 6) for v in scaler.scale_],
        "weights": [round(float(v), 6) for v in lr.coef_],
        "intercept": round(float(lr.intercept_), 6),
        "metrics_cross_validated": metrics,
    }
    print(json.dumps(metrics, indent=2))
    print("Weights per standard deviation:", dict(zip(FEATURES, out["weights"])))
    print("Intercept:", out["intercept"])
    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)
    if args.write:
        with open(OUT, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)
            fh.write("\n")
        print("Wrote", os.path.abspath(OUT))
    if args.clinical_export:
        clinical_check(args.clinical_export, medians)


if __name__ == "__main__":
    main()
