"""HL-139: Heart risk, the chance of a heart attack or stroke in the next 10 years (ASCVD).

It uses the American Heart Association's PREVENT equations, base model (Khan SS et al., Circulation 2024;149:430-449),
which the 2026 ACC/AHA cholesterol guideline uses for ages 30 to 79. The numbers below are the paper's base-model
coefficients. They were checked against the preventr package's published results (a woman: 10-year ASCVD 9.2%; a man:
10.2%), and `tests/test_heart_risk.py` keeps checking them.

It's an estimate to discuss with a doctor, not a diagnosis. The habits score (`heart_score.py`) is worked out separately
and doesn't change it. Every rule and where it comes from is in app/ml/HEART_RISK.md.

Without cholesterol and kidney results, the machine learning model (HL-143, `app/ml/heart_risk_model.json`) predicts those
lab values from setup answers, PREVENT gives the risk from them, and the result says "estimated".
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from app.services.coach_note import _alive, _day, _local_now
from app.services.feature_transform import _age, _bmi, _number
from app.utils.time import parse_utc

logger = logging.getLogger(__name__)

METHOD = "prevent-base-2024"
AGE_MIN, AGE_MAX = 30, 79
THIRTY_YEAR_MAX_AGE = 59  # PREVENT's 30-year risk is for ages 30 to 59
LAB_VALID_DAYS = 365  # the same 12 months as the habits score's lab results
WEEK_DAYS = 7
READING_LIMIT_DAYS = 30
DAYTIME_HOURS = 12  # the Cardiologist: the first 12 hours after waking
DEFAULT_WAKE_HOUR = 6  # 6 am to 6 pm when there's no sleep log that day
MG_DL_TO_MMOL_L = 0.02586  # cholesterol, as PREVENT uses it

# The equations' valid ranges (the preventr package's limits). Values outside are set to the nearest limit and the
# result lists them: HeartLink's choice, so a reading or result outside the range still gives an estimate.
RANGES: Dict[str, Tuple[float, float]] = {
    "sbp": (90.0, 180.0),
    "total_cholesterol": (130.0, 320.0),
    "hdl": (20.0, 100.0),
    "egfr": (15.0, 140.0),
    "bmi": (18.5, 39.9),
}

# The 2026 ACC/AHA cholesterol guideline's 10-year ASCVD bands, lower is better: (upper limit in %, band)
BANDS: List[Tuple[float, str]] = [(3.0, "low"), (5.0, "borderline"), (10.0, "intermediate"), (math.inf, "high")]
NOTE_BANDS = ("intermediate", "high")
URGENT_BAND = "high"
DOCTOR_NOTE = "Discuss your heart risk with your doctor at your next checkup."

# PREVENT base model, logistic: risk = 1 / (1 + exp(-x)). Keys: years -> outcome -> sex -> term.
COEFFICIENTS: Dict[int, Dict[str, Dict[str, Dict[str, float]]]] = {
    10: {
        "total_cvd": {
            "female": {"const": -3.307728, "age": 0.7939329, "age2": 0, "non_hdl": 0.0305239, "hdl": -0.1606857, "sbp_lt110": -0.2394003, "sbp_gte110": 0.3600781, "dm": 0.8667604, "smk": 0.5360739, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.6045917, "egfr_gte60": 0.0433769, "bptx": 0.3151672, "statin": -0.1477655, "bptx_sbp": -0.0663612, "statin_non_hdl": 0.1197879, "age_non_hdl": -0.0819715, "age_hdl": 0.0306769, "age_sbp": -0.0946348, "age_dm": -0.27057, "age_smk": -0.078715, "age_bmi": 0, "age_egfr": -0.1637806},
            "male": {"const": -3.031168, "age": 0.7688528, "age2": 0, "non_hdl": 0.0736174, "hdl": -0.0954431, "sbp_lt110": -0.4347345, "sbp_gte110": 0.3362658, "dm": 0.7692857, "smk": 0.4386871, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.5378979, "egfr_gte60": 0.0164827, "bptx": 0.288879, "statin": -0.1337349, "bptx_sbp": -0.0475924, "statin_non_hdl": 0.150273, "age_non_hdl": -0.0517874, "age_hdl": 0.0191169, "age_sbp": -0.1049477, "age_dm": -0.2251948, "age_smk": -0.0895067, "age_bmi": 0, "age_egfr": -0.1543702},
        },
        "ascvd": {
            "female": {"const": -3.819975, "age": 0.719883, "age2": 0, "non_hdl": 0.1176967, "hdl": -0.151185, "sbp_lt110": -0.0835358, "sbp_gte110": 0.3592852, "dm": 0.8348585, "smk": 0.4831078, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.4864619, "egfr_gte60": 0.0397779, "bptx": 0.2265309, "statin": -0.0592374, "bptx_sbp": -0.0395762, "statin_non_hdl": 0.0844423, "age_non_hdl": -0.0567839, "age_hdl": 0.0325692, "age_sbp": -0.1035985, "age_dm": -0.2417542, "age_smk": -0.0791142, "age_bmi": 0, "age_egfr": -0.1671492},
            "male": {"const": -3.500655, "age": 0.7099847, "age2": 0, "non_hdl": 0.1658663, "hdl": -0.1144285, "sbp_lt110": -0.2837212, "sbp_gte110": 0.3239977, "dm": 0.7189597, "smk": 0.3956973, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.3690075, "egfr_gte60": 0.0203619, "bptx": 0.2036522, "statin": -0.0865581, "bptx_sbp": -0.0322916, "statin_non_hdl": 0.114563, "age_non_hdl": -0.0300005, "age_hdl": 0.0232747, "age_sbp": -0.0927024, "age_dm": -0.2018525, "age_smk": -0.0970527, "age_bmi": 0, "age_egfr": -0.1217081},
        },
        "heart_failure": {
            "female": {"const": -4.310409, "age": 0.8998235, "age2": 0, "non_hdl": 0, "hdl": 0, "sbp_lt110": -0.4559771, "sbp_gte110": 0.3576505, "dm": 1.038346, "smk": 0.583916, "bmi_lt30": -0.0072294, "bmi_gte30": 0.2997706, "egfr_lt60": 0.7451638, "egfr_gte60": 0.0557087, "bptx": 0.3534442, "statin": 0, "bptx_sbp": -0.0981511, "statin_non_hdl": 0, "age_non_hdl": 0, "age_hdl": 0, "age_sbp": -0.0946663, "age_dm": -0.3581041, "age_smk": -0.1159453, "age_bmi": -0.003878, "age_egfr": -0.1884289},
            "male": {"const": -3.946391, "age": 0.8972642, "age2": 0, "non_hdl": 0, "hdl": 0, "sbp_lt110": -0.6811466, "sbp_gte110": 0.3634461, "dm": 0.923776, "smk": 0.5023736, "bmi_lt30": -0.0485841, "bmi_gte30": 0.3726929, "egfr_lt60": 0.6926917, "egfr_gte60": 0.0251827, "bptx": 0.2980922, "statin": 0, "bptx_sbp": -0.0497731, "statin_non_hdl": 0, "age_non_hdl": 0, "age_hdl": 0, "age_sbp": -0.1289201, "age_dm": -0.3040924, "age_smk": -0.1401688, "age_bmi": 0.0068126, "age_egfr": -0.1797778},
        },
    },
    30: {
        "total_cvd": {
            "female": {"const": -1.318827, "age": 0.5503079, "age2": -0.0928369, "non_hdl": 0.0409794, "hdl": -0.1663306, "sbp_lt110": -0.1628654, "sbp_gte110": 0.3299505, "dm": 0.6793894, "smk": 0.3196112, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.1857101, "egfr_gte60": 0.0553528, "bptx": 0.2894, "statin": -0.075688, "bptx_sbp": -0.056367, "statin_non_hdl": 0.1071019, "age_non_hdl": -0.0751438, "age_hdl": 0.0301786, "age_sbp": -0.0998776, "age_dm": -0.3206166, "age_smk": -0.1607862, "age_bmi": 0, "age_egfr": -0.1450788},
            "male": {"const": -1.148204, "age": 0.4627309, "age2": -0.0984281, "non_hdl": 0.0836088, "hdl": -0.1029824, "sbp_lt110": -0.2140352, "sbp_gte110": 0.2904325, "dm": 0.5331276, "smk": 0.2141914, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.1155556, "egfr_gte60": 0.0603775, "bptx": 0.232714, "statin": -0.0272112, "bptx_sbp": -0.0384488, "statin_non_hdl": 0.134192, "age_non_hdl": -0.0511759, "age_hdl": 0.0165865, "age_sbp": -0.1101437, "age_dm": -0.2585943, "age_smk": -0.1566406, "age_bmi": 0, "age_egfr": -0.1166776},
        },
        "ascvd": {
            "female": {"const": -1.974074, "age": 0.4669202, "age2": -0.0893118, "non_hdl": 0.1256901, "hdl": -0.1542255, "sbp_lt110": -0.0018093, "sbp_gte110": 0.322949, "dm": 0.6296707, "smk": 0.268292, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": 0.100106, "egfr_gte60": 0.0499663, "bptx": 0.1875292, "statin": 0.0152476, "bptx_sbp": -0.0276123, "statin_non_hdl": 0.0736147, "age_non_hdl": -0.0521962, "age_hdl": 0.0316918, "age_sbp": -0.1046101, "age_dm": -0.2727793, "age_smk": -0.1530907, "age_bmi": 0, "age_egfr": -0.1299149},
            "male": {"const": -1.736444, "age": 0.3994099, "age2": -0.0937484, "non_hdl": 0.1744643, "hdl": -0.120203, "sbp_lt110": -0.0665117, "sbp_gte110": 0.2753037, "dm": 0.4790257, "smk": 0.1782635, "bmi_lt30": 0, "bmi_gte30": 0, "egfr_lt60": -0.0218789, "egfr_gte60": 0.0602553, "bptx": 0.1421182, "statin": 0.0135996, "bptx_sbp": -0.0218265, "statin_non_hdl": 0.1013148, "age_non_hdl": -0.0312619, "age_hdl": 0.020673, "age_sbp": -0.0920935, "age_dm": -0.2159947, "age_smk": -0.1548811, "age_bmi": 0, "age_egfr": -0.0712547},
        },
        "heart_failure": {
            "female": {"const": -2.205379, "age": 0.6254374, "age2": -0.0983038, "non_hdl": 0, "hdl": 0, "sbp_lt110": -0.3919241, "sbp_gte110": 0.3142295, "dm": 0.8330787, "smk": 0.3438651, "bmi_lt30": 0.0594874, "bmi_gte30": 0.2525536, "egfr_lt60": 0.2981642, "egfr_gte60": 0.0667159, "bptx": 0.333921, "statin": 0, "bptx_sbp": -0.0893177, "statin_non_hdl": 0, "age_non_hdl": 0, "age_hdl": 0, "age_sbp": -0.0974299, "age_dm": -0.404855, "age_smk": -0.1982991, "age_bmi": -0.0035619, "age_egfr": -0.1564215},
            "male": {"const": -1.95751, "age": 0.5681541, "age2": -0.1048388, "non_hdl": 0, "hdl": 0, "sbp_lt110": -0.4761564, "sbp_gte110": 0.30324, "dm": 0.6840338, "smk": 0.2656273, "bmi_lt30": 0.0833107, "bmi_gte30": 0.26999, "egfr_lt60": 0.2541805, "egfr_gte60": 0.0638923, "bptx": 0.2583631, "statin": 0, "bptx_sbp": -0.0391938, "statin_non_hdl": 0, "age_non_hdl": 0, "age_hdl": 0, "age_sbp": -0.1269124, "age_dm": -0.3273572, "age_smk": -0.2043019, "age_bmi": -0.0182831, "age_egfr": -0.1342618},
        },
    },
}


def risk_band(percent: float) -> str:
    for limit, band in BANDS:
        if percent < limit:
            return band
    return BANDS[-1][1]


def egfr_from_creatinine(creatinine_mg_dl: float, age: float, sex: str) -> float:
    """Kidney function (eGFR, mL/min/1.73m²) from blood creatinine, with the race-free CKD-EPI 2021 equation
    (Inker LA et al., N Engl J Med 2021)."""
    female = sex == "female"
    kappa, alpha = (0.7, -0.241) if female else (0.9, -0.302)
    ratio = creatinine_mg_dl / kappa
    egfr = 142 * min(ratio, 1) ** alpha * max(ratio, 1) ** -1.200 * 0.9938 ** age
    return egfr * 1.012 if female else egfr


def _clamp(name: str, value: float, adjusted: List[str]) -> float:
    low, high = RANGES[name]
    if value < low or value > high:
        adjusted.append(name)
        return min(max(value, low), high)
    return value


def prevent(
    *, age: float, sex: str, total_cholesterol: float, hdl: float, sbp: float, bp_medicine: bool, statin: bool,
    diabetes: bool, smoking: bool, egfr: float, bmi: float,
) -> Dict[int, Dict[str, float]]:
    """PREVENT base model: {10: {...}, 30: {...}} with total_cvd, ascvd and heart_failure as fractions (0 to 1).
    Cholesterol in mg/dL, SBP in mmHg, eGFR in mL/min/1.73m². The caller keeps inputs inside RANGES."""
    a = (age - 55) / 10
    non_hdl = (total_cholesterol - hdl) * MG_DL_TO_MMOL_L - 3.5
    h = (hdl * MG_DL_TO_MMOL_L - 1.3) / 0.3
    sbp_low, sbp_high = (min(sbp, 110) - 110) / 20, (max(sbp, 110) - 130) / 20
    bmi_low, bmi_high = (min(bmi, 30) - 25) / 5, (max(bmi, 30) - 30) / 5
    egfr_low, egfr_high = (min(egfr, 60) - 60) / -15, (max(egfr, 60) - 90) / -15
    dm, smk, bptx, st = float(diabetes), float(smoking), float(bp_medicine), float(statin)
    out: Dict[int, Dict[str, float]] = {}
    for years, outcomes in COEFFICIENTS.items():
        out[years] = {}
        for outcome, by_sex in outcomes.items():
            c = by_sex[sex]
            x = (
                c["const"] + c["age"] * a + c["age2"] * a * a + c["non_hdl"] * non_hdl + c["hdl"] * h
                + c["sbp_lt110"] * sbp_low + c["sbp_gte110"] * sbp_high + c["dm"] * dm + c["smk"] * smk
                + c["bmi_lt30"] * bmi_low + c["bmi_gte30"] * bmi_high + c["egfr_lt60"] * egfr_low
                + c["egfr_gte60"] * egfr_high + c["bptx"] * bptx + c["statin"] * st
                + c["bptx_sbp"] * bptx * sbp_high + c["statin_non_hdl"] * st * non_hdl
                + c["age_non_hdl"] * a * non_hdl + c["age_hdl"] * a * h + c["age_sbp"] * a * sbp_high
                + c["age_dm"] * a * dm + c["age_smk"] * a * smk + c["age_bmi"] * a * bmi_high
                + c["age_egfr"] * a * egfr_low
            )
            out[years][outcome] = 1 / (1 + math.exp(-x))
    return out


# ── Blood pressure for the risk (HL-142) ──────────────────────────────────────────────────────────────────────────


def _wake_times(sleep_logs: Iterable[Dict[str, Any]]) -> Dict[Any, datetime]:
    """The local wake time for each day that has a sleep log."""
    wakes: Dict[Any, datetime] = {}
    for s in sleep_logs:
        woke = parse_utc(s.get("wake_time")) if _alive(s) else None
        if woke:
            local = _local_now(woke)
            day = local.date()
            wakes[day] = min(wakes.get(day, local), local)
    return wakes


def _is_daytime(logged: datetime, wakes: Dict[Any, datetime]) -> bool:
    local = _local_now(logged)
    woke = wakes.get(local.date()) or local.replace(hour=DEFAULT_WAKE_HOUR, minute=0, second=0, microsecond=0)
    return woke <= local < woke + timedelta(hours=DAYTIME_HOURS)


def risk_sbp(health_logs: List[Dict[str, Any]], sleep_logs: List[Dict[str, Any]], now: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
    """The systolic pressure the risk uses: the average of daytime readings (the 12 hours after waking) in the last 7
    days; with none, the latest reading from the last 30 days. A phone can't do 24-hour ABPM, so this is the closest
    home-reading version of the Cardiologist's advice."""
    today = _local_now(now).date()
    readings = []
    for r in health_logs:
        logged = parse_utc(r.get("logged_at"))
        if _alive(r) and r.get("systolic_bp") and logged:
            readings.append((logged, float(r["systolic_bp"])))
    if not readings:
        return None
    wakes = _wake_times(sleep_logs)
    daytime = [sbp for logged, sbp in readings
               if (today - _local_now(logged).date()).days < WEEK_DAYS and _is_daytime(logged, wakes)]
    if daytime:
        return {"value": round(sum(daytime) / len(daytime)), "from": "daytime_average", "readings": len(daytime)}
    logged, sbp = max(readings, key=lambda pair: pair[0])
    if (today - _local_now(logged).date()).days < READING_LIMIT_DAYS:
        return {"value": round(sbp), "from": "latest", "readings": 1}
    return None


# ── The estimate without lab results (HL-143) ─────────────────────────────────────────────────────────────────────

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "heart_risk_model.json"
_model_cache: Dict[str, Any] = {}


def load_estimate_model() -> Optional[Dict[str, Any]]:
    """The trained model, or None until it exists. Cached after the first read."""
    if "model" not in _model_cache:
        try:
            _model_cache["model"] = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
        except FileNotFoundError:
            _model_cache["model"] = None
        except (OSError, ValueError) as e:
            logger.warning("Heart risk model couldn't be read (%s)", type(e).__name__)
            _model_cache["model"] = None
    return _model_cache["model"]


def estimate(inputs: Dict[str, Optional[float]], sex: str, model: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """The estimate without lab results: the model predicts total cholesterol, HDL and eGFR from setup answers (unknown
    answers get the training median), and the PREVENT equations give the risk from those and the person's own answers.
    Returns {"ascvd_10": fraction, "labs": the predicted values}, or None until the model exists."""
    model = model if model is not None else load_estimate_model()
    if not model:
        return None
    filled = {}
    for name in model["features"]:
        value = inputs.get(name)
        filled[name] = float(model["medians"][name] if value is None else value)
    labs = {}
    for target, fit in model["lab_models"].items():
        labs[target] = fit["intercept"] + sum(
            fit["weights"][name] * (filled[name] - model["means"][name]) / model["scales"][name] for name in model["features"]
        )
    adjusted: List[str] = []
    risks = prevent(
        age=filled["age"], sex=sex,
        total_cholesterol=_clamp("total_cholesterol", labs["total_cholesterol"], adjusted),
        hdl=_clamp("hdl", min(labs["hdl"], labs["total_cholesterol"] - 1), adjusted),
        sbp=_clamp("sbp", filled["sbp"], adjusted),
        bp_medicine=bool(filled["bp_medicine"]), statin=bool(filled["cholesterol_medicine"]),
        diabetes=bool(filled["diabetes"]), smoking=bool(filled["current_smoker"]),
        egfr=_clamp("egfr", labs["egfr"], adjusted), bmi=_clamp("bmi", filled["bmi"], adjusted),
    )
    return {"ascvd_10": risks[10]["ascvd"], "labs": {k: round(v, 1) for k, v in labs.items()}}


# ── Putting it together ───────────────────────────────────────────────────────────────────────────────────────────


def _yes(value: Any) -> Optional[bool]:
    return None if value is None else bool(value)


def answers(baseline: Dict[str, Any], labs: Dict[str, Dict[str, Any]]) -> Dict[str, Optional[bool]]:
    """BP medicine, diabetes and cholesterol medicine (HL-140): the setup or Settings answer, or the lab results answer
    when the question hasn't been answered yet."""
    diabetes = _yes(baseline.get("has_diabetes"))
    if diabetes is None and "blood_sugar" in labs:
        diabetes = _yes(labs["blood_sugar"].get("has_diabetes"))
    statin = _yes(baseline.get("cholesterol_medicine"))
    if statin is None and "cholesterol" in labs:
        statin = _yes(labs["cholesterol"].get("cholesterol_medicine"))
    return {"bp_medicine": _yes(baseline.get("bp_medicine")), "diabetes": diabetes, "statin": statin}


def _current_labs(lab_results: Iterable[Dict[str, Any]], today) -> Dict[str, Dict[str, Any]]:
    current = {}
    for lab in lab_results or []:
        tested = _day(lab.get("test_date"))
        if tested and tested <= today and (today - tested).days < LAB_VALID_DAYS:
            current[lab.get("kind")] = lab
    return current


def _kidney(lab: Optional[Dict[str, Any]], age: float, sex: str) -> Optional[float]:
    if not lab:
        return None
    egfr = _number(lab.get("egfr"))
    if egfr:
        return egfr
    creatinine = _number(lab.get("creatinine"))
    return egfr_from_creatinine(creatinine, age, sex) if creatinine else None


def _unavailable(reason: str, **extra: Any) -> Dict[str, Any]:
    return {"available": False, "reason": reason, "method": METHOD, **extra}


def risk_for(
    *,
    profile: Optional[Dict[str, Any]],
    baseline: Optional[Dict[str, Any]],
    health_logs: List[Dict[str, Any]],
    sleep_logs: List[Dict[str, Any]],
    lab_results: Optional[List[Dict[str, Any]]] = None,
    now: Optional[datetime] = None,
    model: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """A person's Heart risk: calculated from lab results when they have them, estimated otherwise, or not available
    with the reason ("age", "profile", "questions", "no_estimate")."""
    profile, baseline = profile or {}, baseline or {}
    today = _local_now(now).date()
    sex = str(profile.get("sex") or "").strip().lower()
    age = _age(profile.get("date_of_birth"), today)
    if sex not in ("female", "male") or age is None:
        return _unavailable("profile")
    if age < AGE_MIN or age > AGE_MAX:
        return _unavailable("age", age=int(age))

    labs = _current_labs(lab_results or [], today)
    said = answers(baseline, labs)
    if any(v is None for v in said.values()):
        return _unavailable("questions", missing=[k for k, v in said.items() if v is None])
    smoking = bool(baseline.get("ever_smoked")) and baseline.get("smoke_now") not in (None, "Not at all")
    bmi = _bmi(profile)
    sbp = risk_sbp(health_logs, sleep_logs, now)

    chol = labs.get("cholesterol")
    egfr = _kidney(labs.get("kidney"), age, sex)
    missing_labs = [name for name, have in (("cholesterol", chol), ("kidney", egfr)) if not have]
    result: Dict[str, Any] = {
        "available": True,
        "method": METHOD,
        "age": int(age),
        "sbp": sbp,
        "answers": said,
        "smoking": smoking,
        "missing_labs": missing_labs,
        "adjusted": [],
    }

    if not missing_labs and sbp:
        adjusted: List[str] = []
        risks = prevent(
            age=age, sex=sex,
            total_cholesterol=_clamp("total_cholesterol", float(chol["total_cholesterol"]), adjusted),
            hdl=_clamp("hdl", float(chol["hdl"]), adjusted),
            sbp=_clamp("sbp", float(sbp["value"]), adjusted),
            bp_medicine=said["bp_medicine"], statin=said["statin"], diabetes=said["diabetes"], smoking=smoking,
            egfr=_clamp("egfr", egfr, adjusted),
            # BMI only enters the heart failure equation, never ASCVD, so a missing BMI uses the centre value
            bmi=_clamp("bmi", bmi, adjusted) if bmi is not None else 25.0,
        )
        ascvd_10 = risks[10]["ascvd"] * 100
        result.update(
            kind="calculated",
            ascvd_10=round(ascvd_10, 1),
            total_cvd_10=round(risks[10]["total_cvd"] * 100, 1),
            ascvd_30=round(risks[30]["ascvd"] * 100, 1) if age <= THIRTY_YEAR_MAX_AGE else None,
            adjusted=adjusted,
            egfr=round(egfr),
        )
    else:
        guess = estimate({
            "age": age, "male": 1.0 if sex == "male" else 0.0, "bmi": bmi, "current_smoker": float(smoking),
            "bp_medicine": float(said["bp_medicine"]), "diabetes": float(said["diabetes"]),
            "cholesterol_medicine": float(said["statin"]), "sbp": float(sbp["value"]) if sbp else None,
        }, sex, model)
        if guess is None:
            return _unavailable("no_estimate", missing_labs=missing_labs)
        result.update(kind="estimated", ascvd_10=round(guess["ascvd_10"] * 100, 1), total_cvd_10=None, ascvd_30=None,
                      estimated_labs=guess["labs"])

    band = risk_band(result["ascvd_10"])
    result["band"] = band
    result["note"] = DOCTOR_NOTE if band in NOTE_BANDS else None
    result["urgent"] = band == URGENT_BAND
    return result


def risk_probability(risk: Optional[Dict[str, Any]]) -> Optional[float]:
    """The value stored in hss_history.risk_probability (0 to 1), or None."""
    if not risk or not risk.get("available"):
        return None
    return round(risk["ascvd_10"] / 100, 4)


def summary(record: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The short version for lists, the family view and the report: {percent, band, kind, at}, or None."""
    if not record:
        return None
    risk = (record.get("contributing_factors") or {}).get("risk")
    if not isinstance(risk, dict) or not risk.get("available"):
        return None
    return {"percent": risk.get("ascvd_10"), "band": risk.get("band"), "kind": risk.get("kind"), "at": record.get("computed_at")}
