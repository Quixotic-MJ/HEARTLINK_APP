"""HL-139 and HL-142: Heart risk from the AHA PREVENT equations."""
from datetime import datetime, timezone

import pytest

from app.services import heart_risk as hr

NOW = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)  # 6 pm in Manila
PROFILE = {"sex": "female", "date_of_birth": "1976-01-15", "height_cm": 160, "weight_kg": 60}  # 50 years old
BASELINE = {"ever_smoked": False, "smoke_now": None, "bp_medicine": True, "has_diabetes": True, "cholesterol_medicine": False}
CHOL = {"kind": "cholesterol", "test_date": "2026-09-01", "total_cholesterol": 200, "hdl": 45, "cholesterol_medicine": False}
KIDNEY = {"kind": "kidney", "test_date": "2026-09-01", "egfr": 90}
MORNING = "2026-10-30T01:00:00+00:00"  # 9 am in Manila
NIGHT = "2026-10-29T15:00:00+00:00"  # 11 pm in Manila


def reading(sbp, when=MORNING):
    return {"systolic_bp": sbp, "diastolic_bp": 80, "logged_at": when}


def risk(profile=PROFILE, baseline=BASELINE, logs=None, sleep=None, labs=(CHOL, KIDNEY), model=None):
    return hr.risk_for(profile=profile, baseline=baseline, health_logs=[reading(160)] if logs is None else logs,
                       sleep_logs=sleep or [], lab_results=list(labs), now=NOW, model=model)


# ── The equations against the preventr package's published results ───────────────────────────────────────────────

EXAMPLE = dict(age=50, total_cholesterol=200, hdl=45, sbp=160, bp_medicine=True, statin=False, diabetes=True,
               smoking=False, egfr=90, bmi=35)


@pytest.mark.parametrize("sex,ten,thirty", [
    ("female", {"total_cvd": 0.147, "ascvd": 0.092, "heart_failure": 0.081}, {"total_cvd": 0.53, "ascvd": 0.354, "heart_failure": 0.39}),
    ("male", {"total_cvd": 0.163, "ascvd": 0.102, "heart_failure": 0.106}, {"total_cvd": 0.514, "ascvd": 0.349, "heart_failure": 0.424}),
])
def test_prevent_matches_the_official_package(sex, ten, thirty):
    result = hr.prevent(sex=sex, **EXAMPLE)
    assert {k: round(v, 3) for k, v in result[10].items()} == ten
    assert {k: round(v, 3) for k, v in result[30].items()} == thirty


def test_ckd_epi_2021():
    assert hr.egfr_from_creatinine(0.8, 50, "female") == pytest.approx(89.7, abs=0.2)
    assert hr.egfr_from_creatinine(1.0, 50, "male") == pytest.approx(91.7, abs=0.2)


@pytest.mark.parametrize("percent,band", [(2.9, "low"), (3.0, "borderline"), (4.99, "borderline"), (5.0, "intermediate"),
                                          (9.99, "intermediate"), (10.0, "high"), (35, "high")])
def test_bands_follow_the_2026_guideline(percent, band):
    assert hr.risk_band(percent) == band


# ── A person's risk ───────────────────────────────────────────────────────────────────────────────────────────────


def test_calculated_from_lab_results():
    result = risk()
    assert result["available"] and result["kind"] == "calculated"
    assert result["ascvd_10"] == 9.2 and result["total_cvd_10"] == 14.7 and result["ascvd_30"] == 35.4
    assert result["band"] == "intermediate" and result["note"] == hr.DOCTOR_NOTE and result["urgent"] is False
    assert result["sbp"] == {"value": 160, "from": "daytime_average", "readings": 1}
    assert hr.risk_probability(result) == 0.092


def test_a_high_risk_is_urgent():
    result = risk(baseline={**BASELINE, "ever_smoked": True, "smoke_now": "Every day"}, logs=[reading(178)])
    assert result["band"] == "high" and result["urgent"] is True


def test_creatinine_works_like_egfr():
    result = risk(labs=(CHOL, {"kind": "kidney", "test_date": "2026-09-01", "creatinine": 0.8}))
    assert result["kind"] == "calculated" and result["egfr"] == 90


@pytest.mark.parametrize("born,available", [("1997-06-01", False), ("1996-10-01", True), ("1947-06-01", True), ("1946-10-01", False)])
def test_ages_30_to_79_only(born, available):
    result = risk(profile={**PROFILE, "date_of_birth": born})
    assert result["available"] is available
    if not available:
        assert result["reason"] == "age"


def test_thirty_year_risk_only_up_to_59():
    assert risk(profile={**PROFILE, "date_of_birth": "1960-01-01"})["ascvd_30"] is None


def test_the_three_questions_are_needed():
    result = risk(baseline={"ever_smoked": False}, labs=(KIDNEY,))  # no cholesterol result to answer the statin question
    assert result =={"available": False, "reason": "questions", "method": hr.METHOD,
                      "missing": ["bp_medicine", "diabetes", "statin"]}


def test_lab_answers_fill_in_until_the_questions_are_answered():
    sugar = {"kind": "blood_sugar", "test_date": "2026-09-01", "hba1c": 7.2, "has_diabetes": True}
    result = risk(baseline={"ever_smoked": False, "bp_medicine": True}, labs=(CHOL, KIDNEY, sugar))
    assert result["kind"] == "calculated" and result["answers"] == {"bp_medicine": True, "diabetes": True, "statin": False}


def test_values_outside_the_range_use_the_nearest_limit():
    result = risk(logs=[reading(200)])
    assert result["adjusted"] == ["sbp"] and result["sbp"]["value"] == 200
    assert result["ascvd_10"] == risk(logs=[reading(180)])["ascvd_10"]


def test_old_lab_results_dont_count():
    old = {**KIDNEY, "test_date": "2025-10-30"}
    assert risk(labs=(CHOL, old))["missing_labs"] == ["kidney"]


# ── Estimated, without lab results ────────────────────────────────────────────────────────────────────────────────

FEATURES = ["age", "male", "bmi", "current_smoker", "bp_medicine", "diabetes", "cholesterol_medicine", "sbp"]
FLAT = {"weights": {k: 0.0 for k in FEATURES}}
MODEL = {"features": FEATURES, "means": {k: 0.0 for k in FEATURES}, "scales": {k: 1.0 for k in FEATURES},
         "medians": {"age": 50, "male": 0, "bmi": 25, "current_smoker": 0, "bp_medicine": 0, "diabetes": 0,
                     "cholesterol_medicine": 0, "sbp": 160},
         # Predicts the example's lab values whatever the answers, so the estimate must equal the real calculation
         "lab_models": {"total_cholesterol": {**FLAT, "intercept": 200.0}, "hdl": {**FLAT, "intercept": 45.0},
                        "egfr": {**FLAT, "intercept": 90.0}}}


def test_estimated_without_lab_results_uses_predicted_labs_in_prevent():
    result = risk(labs=(), model=MODEL)
    assert result["kind"] == "estimated" and result["missing_labs"] == ["cholesterol", "kidney"]
    assert result["ascvd_10"] == 9.2 and result["ascvd_30"] is None  # the same as the example with those labs
    assert result["estimated_labs"] == {"total_cholesterol": 200.0, "hdl": 45.0, "egfr": 90.0}


def test_the_real_model_file_gives_sensible_estimates():
    model = hr.load_estimate_model()
    assert model and model["features"] == FEATURES
    healthy = risk(baseline={**BASELINE, "bp_medicine": False, "has_diabetes": False}, logs=[reading(115)], labs=())
    sicker = risk(baseline={**BASELINE, "ever_smoked": True, "smoke_now": "Every day"}, logs=[reading(165)], labs=())
    assert healthy["kind"] == sicker["kind"] == "estimated"
    assert healthy["ascvd_10"] < sicker["ascvd_10"] and healthy["band"] == "low"


def test_estimated_without_a_reading():
    assert risk(logs=[], model=MODEL)["kind"] == "estimated"


def test_no_model_yet_means_not_available():
    assert risk(labs=(), model={})["reason"] == "no_estimate"


# ── Daytime blood pressure (HL-142) ───────────────────────────────────────────────────────────────────────────────


def test_night_readings_are_left_out():
    sbp = hr.risk_sbp([reading(120), reading(170, NIGHT)], [], NOW)
    assert sbp == {"value": 120, "from": "daytime_average", "readings": 1}


def test_the_12_hours_follow_the_wake_time():
    late_riser = [{"wake_time": "2026-10-29T03:00:00+00:00", "logged_at": "2026-10-29T03:00:00+00:00"}]  # 11 am
    evening = "2026-10-29T13:30:00+00:00"  # 9:30 pm, inside 11 am + 12 h
    assert hr.risk_sbp([reading(150, evening)], late_riser, NOW)["from"] == "daytime_average"
    assert hr.risk_sbp([reading(150, evening)], [], NOW)["from"] == "latest"  # outside 6 am to 6 pm


def test_latest_reading_when_none_are_daytime_and_nothing_older_than_30_days():
    assert hr.risk_sbp([reading(140, NIGHT)], [], NOW) == {"value": 140, "from": "latest", "readings": 1}
    assert hr.risk_sbp([reading(140, "2026-09-01T01:00:00+00:00")], [], NOW) is None
