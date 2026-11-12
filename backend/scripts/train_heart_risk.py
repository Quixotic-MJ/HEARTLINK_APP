"""HL-143: trains the Heart risk estimate from NHANES 2017-2018. It estimates a person's 10-year ASCVD risk (the AHA PREVENT
equations) from setup answers only, for people who haven't added cholesterol and kidney results yet.

    python scripts/train_heart_risk.py --data-dir "C:\\path\\to\\nhanes-2017-2018"          (report only)
    python scripts/train_heart_risk.py --data-dir "C:\\path\\to\\nhanes-2017-2018" --write  (also writes the model)

The folder needs DEMO_J, BMX_J, BPX_J, BPQ_J, SMQ_J, MCQ_J, TCHOL_J, HDL_J, DIQ_J and BIOPRO_J (creatinine) from the CDC NHANES
website. --biopro-dir can point to BIOPRO_J's folder if it's kept apart.

- People: adults 30 to 79 (PREVENT's ages), not pregnant, not told they have heart disease or had a stroke, with cholesterol,
  HDL, blood pressure and creatinine measured.
- Label: each person's PREVENT 10-year ASCVD risk from their measurements, worked out with the app's own code
  (app/services/heart_risk.py), with values outside PREVENT's ranges set to the nearest limit, as the app does.
- Inputs: what setup asks, plus a blood pressure reading when there is one: age, sex, BMI, current smoking, BP medicine,
  diabetes, cholesterol medicine and systolic pressure.
- Model: three linear regressions predict the missing lab values (total cholesterol, HDL, eGFR) from those answers, and the
  official PREVENT equations then give the risk. Kept as numbers in a JSON file that app/services/heart_risk.estimate
  reads. A model that guessed the risk directly was tried first and was less accurate (reported as
  risk_directly_from_answers_linear).
- Compared with guessing the average, and with PREVENT on typical lab values (the median cholesterol, HDL and eGFR for the
  person's sex and age group, from the training folds).
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
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from le8_label import clean, read  # noqa: E402
from app.services import heart_risk  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "ml", "heart_risk_model.json")
FEATURES = ["age", "male", "bmi", "current_smoker", "bp_medicine", "diabetes", "cholesterol_medicine", "sbp"]
BANDS = ["low", "borderline", "intermediate", "high"]
LABEL = ("PREVENT 10-year ASCVD risk (Khan et al., Circulation 2024), base model, worked out with app/services/heart_risk.py "
         "from NHANES 2017-2018 measurements and answers")


def people_and_labels(folder: str, biopro_dir: str) -> pd.DataFrame:
    demo = read(folder, "DEMO_J")
    d = demo.loc[(demo.RIDAGEYR >= heart_risk.AGE_MIN) & (demo.RIDAGEYR <= heart_risk.AGE_MAX),
                 ["RIDAGEYR", "RIAGENDR", "RIDEXPRG"]]
    bmx, bpx, bpq = read(folder, "BMX_J"), read(folder, "BPX_J"), read(folder, "BPQ_J")
    smq, diq, mcq = read(folder, "SMQ_J"), read(folder, "DIQ_J"), read(folder, "MCQ_J")
    tchol, hdl, bio = read(folder, "TCHOL_J"), read(folder, "HDL_J"), read(biopro_dir, "BIOPRO_J")

    p = pd.DataFrame(index=d.index)
    p["age"] = d.RIDAGEYR
    p["male"] = (d.RIAGENDR == 1).astype(float)
    p["bmi"] = bmx.BMXBMI.reindex(d.index)
    ever, now = clean(smq.SMQ020.reindex(d.index), [7, 9]), clean(smq.SMQ040.reindex(d.index), [7, 9])
    p["current_smoker"] = np.where(ever.isna(), np.nan, ((ever == 1) & now.isin([1, 2])).astype(float))
    p["bp_medicine"] = (bpq.BPQ050A == 1).reindex(d.index, fill_value=False).astype(float)
    p["cholesterol_medicine"] = (bpq.BPQ100D == 1).reindex(d.index, fill_value=False).astype(float)
    p["diabetes"] = (diq.DIQ010 == 1).reindex(d.index, fill_value=False).astype(float)
    p["sbp"] = bpx[["BPXSY1", "BPXSY2", "BPXSY3", "BPXSY4"]].mean(axis=1).reindex(d.index)
    p["total_cholesterol"] = tchol.LBXTC.reindex(d.index)
    p["hdl"] = hdl.LBDHDD.reindex(d.index)
    p["creatinine"] = bio.LBXSCR.reindex(d.index)

    heart = (mcq.reindex(d.index)[["MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E", "MCQ160F"]] == 1).any(axis=1)
    keep = (d.RIDEXPRG != 1) & ~heart & p[["total_cholesterol", "hdl", "sbp", "creatinine", "current_smoker"]].notna().all(axis=1)
    keep &= p.hdl < p.total_cholesterol
    p = p[keep].copy()
    p["egfr"] = [heart_risk.egfr_from_creatinine(c, a, "male" if m else "female")
                 for c, a, m in zip(p.creatinine, p.age, p.male)]
    p["risk"] = [label(row) for _, row in p.iterrows()]
    return p


def label(row: pd.Series, total=None, hdl=None, egfr=None) -> float:
    adjusted = []
    bmi = row.bmi if not np.isnan(row.bmi) else 25.0
    risks = heart_risk.prevent(
        age=row.age, sex="male" if row.male else "female",
        total_cholesterol=heart_risk._clamp("total_cholesterol", row.total_cholesterol if total is None else total, adjusted),
        hdl=heart_risk._clamp("hdl", row.hdl if hdl is None else hdl, adjusted),
        sbp=heart_risk._clamp("sbp", row.sbp, adjusted),
        bp_medicine=bool(row.bp_medicine), statin=bool(row.cholesterol_medicine), diabetes=bool(row.diabetes),
        smoking=bool(row.current_smoker), egfr=heart_risk._clamp("egfr", row.egfr if egfr is None else egfr, adjusted),
        bmi=heart_risk._clamp("bmi", bmi, adjusted),
    )
    return risks[10]["ascvd"]


def logit(p: np.ndarray) -> np.ndarray:
    p = np.clip(p, 1e-5, 1 - 1e-5)
    return np.log(p / (1 - p))


def expit(x: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-x))


def quality(y: pd.Series, predicted: np.ndarray) -> dict:
    real, est = y.to_numpy() * 100, np.asarray(predicted) * 100
    error = est - real
    real_bands = [heart_risk.risk_band(v) for v in real]
    est_bands = [heart_risk.risk_band(v) for v in est]
    order = {b: i for i, b in enumerate(BANDS)}
    return {
        "mean_error_points": round(float(np.abs(error).mean()), 2),
        "rmse_points": round(float(np.sqrt((error ** 2).mean())), 2),
        "within_2_points": round(float((np.abs(error) <= 2).mean()), 3),
        "same_band": round(float(np.mean([a == b for a, b in zip(real_bands, est_bands)]))
                           , 3),
        # The estimate said a lower (safer) band than the real risk
        "too_optimistic_band": round(float(np.mean([order[e] < order[r] for r, e in zip(real_bands, est_bands)])), 3),
        "real_high_called_high": round(float(np.mean([e == "high" for r, e in zip(real_bands, est_bands) if r == "high"]) or 0), 3),
    }


def typical_labs(people: pd.DataFrame, folds: KFold) -> np.ndarray:
    """PREVENT with the median cholesterol, HDL and eGFR for the person's sex and 10-year age group (from the training folds)."""
    group = people.male.astype(int).astype(str) + "_" + (people.age // 10).astype(int).astype(str)
    out = np.full(len(people), np.nan)
    for train, test in folds.split(people):
        medians = people.iloc[train].groupby(group.iloc[train])[["total_cholesterol", "hdl", "egfr"]].median()
        for i in test:
            row, m = people.iloc[i], medians.loc[group.iloc[i]]
            out[i] = label(row, m.total_cholesterol, m.hdl, m.egfr)
    return out


def linear():
    return make_pipeline(StandardScaler(), LinearRegression())


LAB_TARGETS = ["total_cholesterol", "hdl", "egfr"]
LAB_FEATURES = [f for f in FEATURES if f != "sbp"] + ["sbp"]


def predicted_labs_risk(people: pd.DataFrame, x: pd.DataFrame, folds: KFold, sbp_override=None) -> np.ndarray:
    """The ML part: linear models predict each missing lab value from setup answers; PREVENT then uses them with the
    person's own answers and blood pressure (or the median pressure when sbp_override is given)."""
    out = np.full(len(people), np.nan)
    for train, test in folds.split(x):
        guesses = {t: linear().fit(x.iloc[train], people[t].iloc[train]).predict(x.iloc[test]) for t in LAB_TARGETS}
        for j, i in enumerate(test):
            row = people.iloc[i]
            if sbp_override is not None:
                row = row.copy()
                row["sbp"] = sbp_override
            out[i] = label(row, guesses["total_cholesterol"][j], guesses["hdl"][j], guesses["egfr"][j])
    return out


def clinical_check(path: str) -> dict:
    """HL-153: the estimate against the portal's clinical reviews (Model Check's export): of the rounds whose Heart risk
    was estimated, how often the Cardiologist's band agrees, and how often the estimate was lower (under-calling) or
    higher. Checked only, never trained on: retraining from reviews stays off until the adviser approves the labels."""
    with open(path, encoding="utf-8") as fh:
        export = json.load(fh)
    rows = [r for r in export.get("rows", [])
            if r.get("app_risk_kind") == "estimated" and r.get("app_risk_band") in BANDS and r.get("expert_risk_band") in BANDS]
    result = {"reviews": len(rows)}
    if rows:
        pairs = [(BANDS.index(r["app_risk_band"]), BANDS.index(r["expert_risk_band"])) for r in rows]
        n = len(pairs)
        result.update({
            "agreement": round(sum(a == e for a, e in pairs) / n, 3),
            "under_calling": round(sum(a < e for a, e in pairs) / n, 3),
            "over_calling": round(sum(a > e for a, e in pairs) / n, 3),
        })
        print(f"Clinical reviews of the estimate: {n}, agreement {result['agreement']:.0%}, "
              f"under-calling {result['under_calling']:.0%}, over-calling {result['over_calling']:.0%}")
    else:
        print("No clinical reviews of an estimated Heart risk in this export.")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", help="the NHANES files (needed to train or check the model)")
    parser.add_argument("--clinical-export", help="the portal's clinical reviews export (HL-153), checked but not trained on")
    parser.add_argument("--biopro-dir", help="folder with BIOPRO_J.xpt, if not in --data-dir")
    parser.add_argument("--write", action="store_true", help="write app/ml/heart_risk_model.json")
    parser.add_argument("--report", help="also save the results to this JSON file")
    args = parser.parse_args()
    if args.clinical_export:
        clinical_check(args.clinical_export)
        if not args.data_dir:
            return
    if not args.data_dir:
        parser.error("--data-dir is needed to train or check the model")

    people = people_and_labels(args.data_dir, args.biopro_dir or args.data_dir)
    y = people.risk
    medians = people[FEATURES].median()
    x = people[FEATURES].fillna(medians)
    target = logit(y.to_numpy())

    folds = KFold(5, shuffle=True, random_state=0)
    this_model = expit(cross_val_predict(linear(), x, target, cv=folds))
    no_reading = x.assign(sbp=medians.sbp)
    without_reading = np.full(len(y), np.nan)
    for train, test in folds.split(x):
        fitted = linear().fit(x.iloc[train], target[train])
        without_reading[test] = expit(fitted.predict(no_reading.iloc[test]))
    boosted = expit(cross_val_predict(HistGradientBoostingRegressor(random_state=0), x, target, cv=folds))
    guess = np.full(len(y), np.nan)
    for train, test in folds.split(x):
        guess[test] = y.iloc[train].mean()

    lab_model = predicted_labs_risk(people, x, folds)
    lab_model_no_reading = predicted_labs_risk(people, x, folds, sbp_override=float(medians.sbp))
    metrics = {
        "people": int(len(y)),
        "average_risk_percent": round(float(y.mean() * 100), 2),
        "share_by_band": {b: round(float(np.mean([heart_risk.risk_band(v * 100) == b for v in y])), 3) for b in BANDS},
        "this_model": quality(y, lab_model),
        "this_model_without_a_bp_reading": quality(y, lab_model_no_reading),
        "risk_directly_from_answers_linear": quality(y, this_model),
        "risk_directly_from_answers_linear_without_a_bp_reading": quality(y, without_reading),
        "prevent_with_typical_lab_values": quality(y, typical_labs(people, folds)),
        "gradient_boosting": quality(y, boosted),
        "guessing_the_average": quality(y, guess),
        "by_group": {
            name: {"people": int(m.sum()), "mean_error_points": round(float(np.abs(lab_model[m] - y[m]).mean() * 100), 2),
                   "average_real": round(float(y[m].mean() * 100), 2), "average_estimate": round(float(lab_model[m].mean() * 100), 2)}
            for name, m in {
                "women": (people.male == 0).to_numpy(), "men": (people.male == 1).to_numpy(),
                "age_30_49": (people.age < 50).to_numpy(), "age_50_64": ((people.age >= 50) & (people.age < 65)).to_numpy(),
                "age_65_79": (people.age >= 65).to_numpy(),
            }.items()
        },
    }

    lab_fits = {t: linear().fit(x, people[t]) for t in LAB_TARGETS}
    scaler = lab_fits[LAB_TARGETS[0]][0]
    out = {
        "version": "heart-risk-estimate-1",
        "kind": "linear regressions predict total cholesterol, HDL and eGFR from setup answers; PREVENT then gives the risk",
        "trained_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data": "NHANES 2017-2018, adults 30-79, not pregnant, no heart disease or stroke, with cholesterol, HDL, BP and creatinine",
        "label": LABEL,
        "label_status": "pending expert review",
        "features": FEATURES,
        "medians": {k: round(float(medians[k]), 4) for k in FEATURES},
        "means": {k: round(float(v), 6) for k, v in zip(FEATURES, scaler.mean_)},
        "scales": {k: round(float(v), 6) for k, v in zip(FEATURES, scaler.scale_)},
        "lab_models": {
            t: {"weights": {k: round(float(v), 6) for k, v in zip(FEATURES, fit[-1].coef_)},
                "intercept": round(float(fit[-1].intercept_), 6)}
            for t, fit in lab_fits.items()
        },
        "metrics_cross_validated": metrics,
    }
    print(json.dumps(metrics, indent=2))
    print("Lab models (per standard deviation):", json.dumps(out["lab_models"], indent=1))
    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)
    if args.write:
        with open(OUT, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)
            fh.write("\n")
        print("Wrote", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
