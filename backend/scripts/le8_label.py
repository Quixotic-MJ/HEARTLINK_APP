"""Works out each NHANES 2017-2018 adult's Life's Essential 8 score, used as the label for the starting score's model.

The points are the American Heart Association's: Lloyd-Jones DM, et al. Circulation, 2022 (PMC10503546, Table 1). Tables the
app also uses come from app/services/heart_score.py, so the labels and the app can't disagree.

Each area is 0 to 100 and the score is their plain average, for adults with all 8 areas. Two scores are made:
- le8_asian: the AHA's Asian and Pacific BMI row for everyone. This trains the model, to match the app's scale.
- le8_standard: the AHA's standard BMI row. This is only to compare with the AHA's own published average.
"""
import os
import sys
from typing import Optional

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import hei2015  # noqa: E402
from app.services.heart_score import activity_points, bp_points, sleep_points  # noqa: E402
from app.services.starting_score import bmi_feature_points  # noqa: E402

TREATED_DEDUCTION = 20
HOME_SMOKER_DEDUCTION = 20
LABEL = "Life's Essential 8 score, worked out with the AHA's published points from NHANES 2017-2018 measurements and answers"


def fix_zeros(d: pd.DataFrame) -> pd.DataFrame:
    """NHANES stores 0 in a way that loads as 5.4e-79, which would otherwise count as "more than 0"."""
    numbers = d.select_dtypes("number").columns
    d[numbers] = d[numbers].mask(d[numbers].abs() < 1e-30, 0.0)
    return d


def read(folder: str, name: str) -> pd.DataFrame:
    return fix_zeros(pd.read_sas(os.path.join(folder, f"{name}.xpt"), format="xport")).set_index("SEQN")


def clean(s: pd.Series, refused: list) -> pd.Series:
    """Drops 'refused' and 'don't know' codes."""
    return s.where(~s.isin(refused))


def weekly_minutes(flag: pd.Series, days: pd.Series, minutes: pd.Series) -> pd.Series:
    per_week = clean(days, [77, 99]) * clean(minutes, [7777, 9999])
    return pd.Series(np.where(flag == 1, per_week, np.where(flag == 2, 0.0, np.nan)), index=flag.index)


# ── The AHA's tables that the app doesn't use ─────────────────────────────────────────────────────────────────────


def non_hdl_points(non_hdl: float) -> int:
    if non_hdl < 130:
        return 100
    if non_hdl < 160:
        return 60
    if non_hdl < 190:
        return 40
    if non_hdl < 220:
        return 20
    return 0


def glucose_points(hba1c: float, fasting: float, told_diabetes: bool) -> float:
    """HbA1c first, because every adult could give one without fasting; fasting glucose only if it's missing."""
    has_a1c = not np.isnan(hba1c)
    has_fasting = not np.isnan(fasting)
    if told_diabetes or (has_a1c and hba1c >= 6.5) or (not has_a1c and has_fasting and fasting >= 126):
        if not has_a1c:
            return np.nan
        for limit, points in ((7, 40), (8, 30), (9, 20), (10, 10)):
            if hba1c < limit:
                return points
        return 0
    if has_a1c:
        return 100 if hba1c < 5.7 else 60
    if has_fasting:
        return 100 if fasting < 100 else 60
    return np.nan


def standard_bmi_points(bmi: float) -> int:
    if bmi < 25:
        return 100
    if bmi < 30:
        return 70
    if bmi < 35:
        return 30
    if bmi < 40:
        return 15
    return 0


def years_since_quit(quantity: float, unit: float) -> float:
    if quantity == 66666:
        return 50.0
    if np.isnan(quantity) or quantity in (77777, 99999):
        return np.nan
    per_year = {1: 365.25, 2: 52.18, 3: 12.0, 4: 1.0}.get(unit)
    return quantity / per_year if per_year else np.nan


def nicotine_points(ever: float, now: float, quit_years: float, cigar_days: float, ecig_days: float, home_smoker: bool) -> float:
    """AHA: never 100; quit 5+ years 75; 1 to under 5 years 50; under 1 year, or using an e-cigarette now, 25; smoking 0.
    Living with a smoker takes off 20, unless the score is already 0."""
    if np.isnan(ever):
        return np.nan
    smokes_now = (ever == 1 and now in (1, 2)) or (not np.isnan(cigar_days) and cigar_days > 0)
    if smokes_now:
        return 0
    if ever == 1:
        if np.isnan(quit_years):
            return np.nan
        points = 75 if quit_years >= 5 else 50 if quit_years >= 1 else 25
    else:
        points = 100
    if not np.isnan(ecig_days) and ecig_days > 0:
        points = min(points, 25)
    return max(0, points - HOME_SMOKER_DEDUCTION) if home_smoker else points


def treated(points: float, on_medicine: bool) -> float:
    """AHA: take off 20 for a treated level."""
    if np.isnan(points):
        return np.nan
    return max(0, points - TREATED_DEDUCTION) if on_medicine else points


def weighted_percentile(values: pd.Series, weights: pd.Series) -> pd.Series:
    """Each person's percentile in the survey-weighted population: the weighted share strictly below them."""
    known = values.notna() & weights.gt(0)
    order = values[known].sort_values().index
    w = weights[order].to_numpy()
    below = np.concatenate([[0.0], np.cumsum(w)[:-1]])
    share = pd.Series(below / w.sum() * 100, index=order)
    # People with the same value get the same percentile
    share = share.groupby(values[order]).transform("min")
    return share.reindex(values.index)


def diet_points_from_percentile(percentile: float) -> float:
    """AHA's population method: at least the 95th percentile 100, 75th 80, 50th 50, 25th 25, below that 0."""
    if np.isnan(percentile):
        return np.nan
    for floor, points in ((95, 100), (75, 80), (50, 50), (25, 25)):
        if percentile >= floor:
            return points
    return 0


# ── From NHANES files to scores ───────────────────────────────────────────────────────────────────────────────────


def load_fped(folder: str) -> pd.DataFrame:
    """USDA's Food Patterns Equivalents for 2017-2018, saved as CSV from FPED_1718.xls: food groups per 100 g of each food."""
    fped = pd.read_csv(os.path.join(folder, "FPED_1718.csv"))
    fped.columns = [str(c).split(" (")[0].strip() for c in fped.columns]
    return fped.rename(columns={"FOODCODE": "food_code"})


def hei_scores(folder: str) -> pd.DataFrame:
    """HEI-2015 per person, adding up every day with a reliable recall. Includes the day 1 survey weight."""
    fped = load_fped(folder)
    day1 = read(folder, "DR1TOT_J")
    day2 = read(folder, "DR2TOT_J")
    good1 = day1.index[day1.DR1DRSTZ == 1]
    good2 = day2.index[day2.DR2DRSTZ == 1]

    def nutrients(frame: pd.DataFrame, good, prefix: str) -> pd.DataFrame:
        return pd.DataFrame({
            "kcal": frame.loc[good, f"{prefix}TKCAL"],
            "sodium_mg": frame.loc[good, f"{prefix}TSODI"],
            "saturated_fat_g": frame.loc[good, f"{prefix}TSFAT"],
            "mono_fat_g": frame.loc[good, f"{prefix}TMFAT"],
            "poly_fat_g": frame.loc[good, f"{prefix}TPFAT"],
        })

    totals = nutrients(day1, good1, "DR1").add(nutrients(day2, good2, "DR2"), fill_value=0)

    def foods(name: str, prefix: str, good) -> pd.DataFrame:
        f = read(folder, name)
        f = f[f.index.isin(good)]
        return pd.DataFrame({"SEQN": f.index, "food_code": f[f"{prefix}IFDCD"].to_numpy(), "grams": f[f"{prefix}IGRMS"].to_numpy()})

    eaten = pd.concat([foods("DR1IFF_J", "DR1", good1), foods("DR2IFF_J", "DR2", good2)], ignore_index=True)
    eaten["food_code"] = eaten["food_code"].astype("int64")
    groups = hei2015.totals_from_foods(eaten, fped)
    joined = totals.join(groups, how="left").fillna({c: 0.0 for c in groups.columns})
    scored = hei2015.score(joined)
    scored["weight"] = day1["WTDRD1"].reindex(scored.index)
    return scored


def build_labels(folder: str) -> pd.DataFrame:
    """One row per adult 20 and over: each area's points, both total scores and the survey weight."""
    demo = read(folder, "DEMO_J")
    d = demo.loc[demo.RIDAGEYR >= 20, ["RIDAGEYR", "RIAGENDR", "RIDEXPRG"]]
    bpx = read(folder, "BPX_J")
    bpq = read(folder, "BPQ_J")
    bmx = read(folder, "BMX_J")
    smq = read(folder, "SMQ_J")
    fam = read(folder, "SMQFAM_J")
    paq = read(folder, "PAQ_J")
    slq = read(folder, "SLQ_J")
    tchol = read(folder, "TCHOL_J")
    hdl = read(folder, "HDL_J")
    ghb = read(folder, "GHB_J")
    glu = read(folder, "GLU_J")
    diq = read(folder, "DIQ_J")

    out = pd.DataFrame(index=d.index)
    out["age"] = d.RIDAGEYR
    out["male"] = (d.RIAGENDR == 1).astype(float)
    out["pregnant"] = d.RIDEXPRG == 1
    # The AHA's own NHANES analysis left out people with heart disease or stroke, and so does the app's intended audience
    mcq = read(folder, "MCQ_J").reindex(d.index)
    out["heart_disease"] = (mcq[["MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E", "MCQ160F"]] == 1).any(axis=1)

    # Blood pressure: the average of the exam's readings. A diastolic of 0 is a measuring artefact.
    sys_bp = bpx[["BPXSY1", "BPXSY2", "BPXSY3", "BPXSY4"]].mean(axis=1).round().reindex(d.index)
    dia = bpx[["BPXDI1", "BPXDI2", "BPXDI3", "BPXDI4"]].where(lambda v: v > 0).mean(axis=1).round().reindex(d.index)
    bp_meds = (bpq.BPQ050A == 1).reindex(d.index, fill_value=False)
    out["bp"] = [
        np.nan if np.isnan(s) or np.isnan(v) else treated(bp_points(s, v), bool(m))
        for s, v, m in zip(sys_bp, dia, bp_meds)
    ]

    # Activity: getting around and leisure, moderate or harder; vigorous counts double. Work activity is left out: with it,
    # activity isn't among the lowest areas as the AHA reports, and the overall average moves away from theirs.
    p = paq.reindex(d.index)
    out["activity_minutes"] = (2 * weekly_minutes(p.PAQ650, p.PAQ655, p.PAD660)
                               + weekly_minutes(p.PAQ635, p.PAQ640, p.PAD645)
                               + weekly_minutes(p.PAQ665, p.PAQ670, p.PAD675))
    out["activity"] = out["activity_minutes"].map(lambda m: np.nan if np.isnan(m) else activity_points(m))

    # Sleep: weekdays and weekends, weighted to a 7-day week
    s = slq.reindex(d.index)
    hours = (5 * clean(s.SLD012, [77, 99]) + 2 * clean(s.SLD013, [77, 99])) / 7
    out["sleep_hours"] = hours
    out["sleep"] = hours.map(lambda h: np.nan if np.isnan(h) else sleep_points(h))

    # Nicotine
    q = smq.reindex(d.index)
    quit_years = pd.Series([years_since_quit(a, b) for a, b in zip(q.SMQ050Q, q.SMQ050U)], index=d.index)
    home = clean(fam.SMD460, [777, 999]).reindex(d.index).fillna(0) > 0
    ever = clean(q.SMQ020, [7, 9])
    now = clean(q.SMQ040, [7, 9])
    cigar = clean(q.SMQ895, [77, 99])
    ecig = clean(q.SMQ905, [77, 99])
    out["nicotine"] = [
        nicotine_points(*row) for row in zip(ever, now, quit_years, cigar, ecig, home)
    ]

    # BMI
    bmi = bmx.BMXBMI.reindex(d.index)
    out["bmi_value"] = bmi
    out["bmi_asian"] = bmi.map(lambda b: np.nan if np.isnan(b) else bmi_feature_points(b))
    out["bmi_standard"] = bmi.map(lambda b: np.nan if np.isnan(b) else standard_bmi_points(b))

    # Cholesterol: total minus HDL
    non_hdl = tchol.LBXTC.reindex(d.index) - hdl.LBDHDD.reindex(d.index)
    lipid_meds = (bpq.BPQ100D == 1).reindex(d.index, fill_value=False)
    out["lipids"] = [np.nan if np.isnan(n) else treated(non_hdl_points(n), bool(m)) for n, m in zip(non_hdl, lipid_meds)]

    # Blood sugar
    told = (diq.DIQ010 == 1).reindex(d.index, fill_value=False)
    a1c = ghb.LBXGH.reindex(d.index)
    fasting = glu.LBXGLU.reindex(d.index)
    out["glucose"] = [glucose_points(a, f, bool(t)) for a, f, t in zip(a1c, fasting, told)]

    # Diet: HEI-2015, as a percentile among these adults
    hei = hei_scores(folder).reindex(d.index)
    out["hei"] = hei["total"]
    out["weight"] = hei["weight"]
    out["diet"] = weighted_percentile(out["hei"], out["weight"]).map(diet_points_from_percentile)

    shared = ["bp", "activity", "sleep", "nicotine", "lipids", "glucose", "diet"]
    out["le8_asian"] = out[shared + ["bmi_asian"]].mean(axis=1, skipna=False)
    out["le8_standard"] = out[shared + ["bmi_standard"]].mean(axis=1, skipna=False)
    return out


def weighted_mean(values: pd.Series, weights: pd.Series) -> Optional[float]:
    known = values.notna() & weights.gt(0)
    return float(np.average(values[known], weights=weights[known])) if known.any() else None
