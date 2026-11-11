"""HL-138: optional lab results join the Heart score as the AHA's cholesterol and blood sugar areas for 12 months."""
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.user import BloodSugarResult, CholesterolResult
from app.services import heart_score as hs
from app.services import lab_results as labs
from app.utils import security

# 6 pm in Manila
NOW = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)
TODAY = date(2026, 10, 30)
ANSWERS = {"created_at": (NOW - timedelta(days=60)).isoformat(), "ever_smoked": False, "smoke_now": None,
           "fruit_veg_servings": "4-5", "fried_food_freq": "rarely", "salty_food_freq": "rarely"}
PROFILE = {"height_cm": 170, "weight_kg": 62}  # BMI 21.5: 100 points


def reading(sys_bp, dia_bp):
    return {"systolic_bp": sys_bp, "diastolic_bp": dia_bp, "logged_at": NOW.isoformat()}


def score(labs_rows=(), **kw):
    args = {"baseline": ANSWERS, "profile": PROFILE, "health_logs": [reading(118, 76)], "exercise_logs": [],
            "sleep_logs": [], "meal_logs": [], "routines": [], "sodium_limit": 1500.0, "now": NOW,
            "lab_results": list(labs_rows)}
    return hs.score_from(**{**args, **kw})


def cholesterol(total=180, hdl=60, medicine=False, days_ago=30):
    return {"kind": "cholesterol", "total_cholesterol": total, "hdl": hdl, "cholesterol_medicine": medicine,
            "test_date": (TODAY - timedelta(days=days_ago)).isoformat()}


def sugar(fasting=None, hba1c=None, diabetes=False, days_ago=30):
    return {"kind": "blood_sugar", "fasting_glucose": fasting, "hba1c": hba1c, "has_diabetes": diabetes,
            "test_date": (TODAY - timedelta(days=days_ago)).isoformat()}


# ── The AHA tables ──────────────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("non_hdl,points", [(129, 100), (130, 60), (159, 60), (160, 40), (189, 40), (190, 20), (219, 20), (220, 0)])
def test_cholesterol_points(non_hdl, points):
    assert hs.cholesterol_points(non_hdl + 50, 50, False) == points


def test_cholesterol_medicine_takes_off_20_but_never_below_0():
    assert hs.cholesterol_points(170, 50, True) == 80   # non-HDL 120: 100 - 20
    assert hs.cholesterol_points(300, 50, True) == 0    # 0 stays 0


@pytest.mark.parametrize("fasting,hba1c,points", [
    (99, None, 100), (100, None, 60), (140, None, 60),   # without diabetes, a high result is still 60
    (None, 5.6, 100), (None, 5.7, 60), (None, 7.5, 60),
    (99, 5.8, 60),                                        # HbA1c is used when both are given
])
def test_blood_sugar_without_diabetes(fasting, hba1c, points):
    assert hs.blood_sugar_points(fasting, hba1c, False) == points


@pytest.mark.parametrize("hba1c,points", [(6.9, 40), (7, 30), (7.9, 30), (8, 20), (9, 10), (9.9, 10), (10, 0)])
def test_blood_sugar_with_diabetes_uses_hba1c(hba1c, points):
    assert hs.blood_sugar_points(None, hba1c, True) == points


def test_diabetes_with_only_a_fasting_result_isnt_scored():
    assert hs.blood_sugar_points(110, None, True) is None


# ── In the score ────────────────────────────────────────────────────────────────────────────────────────────────


def test_without_lab_results_nothing_changes():
    result = score()
    assert "cholesterol" not in result["areas"] and "blood_sugar" not in result["areas"]
    assert result == score(labs_rows=[])


def test_lab_results_add_areas_to_the_average():
    six = score()
    seven = score([cholesterol(total=260, hdl=40)])          # non-HDL 220: 0 points
    eight = score([cholesterol(total=260, hdl=40), sugar(hba1c=5.5)])
    base = six["areas_used"]  # no sleep logged here, so 5
    assert (seven["areas_used"], eight["areas_used"]) == (base + 1, base + 2)
    assert eight["areas_total"] == 8
    assert seven["areas"]["cholesterol"] == {"points": 0, "non_hdl": 220, "medicine": False, "test_date": "2026-09-30"}
    assert seven["average"] < six["average"]
    assert eight["areas"]["blood_sugar"]["points"] == 100


def test_results_count_for_12_months_only():
    assert "cholesterol" in score([cholesterol(days_ago=364)])["areas"]
    assert "cholesterol" not in score([cholesterol(days_ago=365)])["areas"]
    assert "cholesterol" not in score([cholesterol(days_ago=-1)])["areas"]  # a future date never counts


def test_blood_pressure_limits_still_apply():
    great_labs = [cholesterol(total=150, hdl=60), sugar(fasting=85)]
    result = score(great_labs, health_logs=[reading(150, 95)])
    assert result["score"] == 59 and result["rule"] == "stage_2_limit"


def test_a_lab_read_failure_leaves_the_areas_out():
    def broken():
        raise RuntimeError("table missing")
    assert hs._lab_results(broken, "u1") == []


# ── Checks and the doctor note ──────────────────────────────────────────────────────────────────────────────────


def test_input_checks():
    with pytest.raises(ValidationError):
        CholesterolResult(test_date=TODAY, total_cholesterol=150, hdl=160, cholesterol_medicine=False)
    with pytest.raises(ValidationError):
        CholesterolResult(test_date=TODAY, total_cholesterol=5000, hdl=50, cholesterol_medicine=False)
    with pytest.raises(ValidationError):
        BloodSugarResult(test_date=TODAY, has_diabetes=False)
    assert BloodSugarResult(test_date=TODAY, hba1c=5.4, has_diabetes=False).hba1c == 5.4


def test_doctor_note_is_gentle_and_only_outside_the_healthy_range():
    assert labs.doctor_note("cholesterol", cholesterol(total=250, hdl=50)) == labs.DOCTOR_NOTE   # non-HDL 200
    assert labs.doctor_note("cholesterol", cholesterol(total=180, hdl=60)) is None
    assert labs.doctor_note("blood_sugar", sugar(fasting=130)) == labs.DOCTOR_NOTE
    assert labs.doctor_note("blood_sugar", sugar(hba1c=6.5)) == labs.DOCTOR_NOTE
    assert labs.doctor_note("blood_sugar", sugar(hba1c=8, diabetes=True)) is None              # already diagnosed
    assert labs.doctor_note("blood_sugar", sugar(fasting=95)) is None


class Store:
    def __init__(self):
        self.rows = {}

    def list(self, user_id):
        return [dict(r) for (uid, _), r in self.rows.items() if uid == user_id]

    def save(self, user_id, kind, row):
        self.rows[(user_id, kind)] = {"kind": kind, **row}

    def delete(self, user_id, kind):
        self.rows.pop((user_id, kind), None)


class Answers:
    def __init__(self):
        self.saved = {}

    def get_baseline(self, user_id):
        return {"user_id": user_id, **self.saved}

    def save_baseline(self, user_id, data):
        self.saved.update(data)
        return self.saved


@pytest.fixture
def store(monkeypatch):
    s = Store()
    s.answers = Answers()
    monkeypatch.setattr(labs, "_repo", lambda: s)
    monkeypatch.setattr(labs, "_baseline_repo", lambda: s.answers)
    monkeypatch.setattr(labs, "_today", lambda: TODAY)
    return s


def test_save_view_and_remove(store):
    saved = labs.save("u1", "cholesterol", {"test_date": TODAY - timedelta(days=10), "total_cholesterol": 200, "hdl": 50,
                                            "cholesterol_medicine": False})
    assert saved["counts"] is True and saved["counts_until"] == "2027-10-20" and saved["note"] is None
    assert labs.results_for("u1") == {"cholesterol": saved, "blood_sugar": None, "kidney": None}
    labs.remove("u1", "cholesterol")
    assert labs.results_for("u1") == {"cholesterol": None, "blood_sugar": None, "kidney": None}


@pytest.mark.parametrize("days_ago", [-1, 731])
def test_future_or_very_old_test_dates_are_refused(store, days_ago):
    with pytest.raises(HTTPException) as e:
        labs.save("u1", "blood_sugar", {"test_date": TODAY - timedelta(days=days_ago), "fasting_glucose": 90,
                                         "hba1c": None, "has_diabetes": False})
    assert e.value.status_code == 422


# ── The routes ──────────────────────────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def client(store, monkeypatch):
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    people = {"p1": {"id": "p1", "role": "patient", "account_status": "active"},
              "a1": {"id": "a1", "role": "admin", "account_status": "active"}}
    monkeypatch.setattr(security, "get_profile_repo", lambda: SimpleNamespace(get_by_id=lambda uid: dict(people.get(uid, {}))))
    import app.api.users.profile as profile_api
    monkeypatch.setattr(profile_api, "recalculate_score", lambda uid, trigger: {"score": 80, "trigger": trigger})
    token = lambda uid, role: {"Authorization": f"Bearer {security.create_access_token({'user_id': uid, 'role': role})}"}
    try:
        yield TestClient(app), token
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)


def test_a_patient_saves_their_own_results_and_the_score_updates(client):
    http, token = client
    body = {"test_date": (TODAY - timedelta(days=5)).isoformat(), "total_cholesterol": 190, "hdl": 55, "cholesterol_medicine": False}
    res = http.put("/api/users/p1/lab-results/cholesterol", json=body, headers=token("p1", "patient"))
    assert res.status_code == 200 and res.json()["hss"]["trigger"] == "lab_results"
    got = http.get("/api/users/p1/lab-results", headers=token("p1", "patient")).json()
    assert got["cholesterol"]["total_cholesterol"] == 190 and got["blood_sugar"] is None
    assert http.delete("/api/users/p1/lab-results/cholesterol", headers=token("p1", "patient")).status_code == 200


def test_nobody_else_can_read_or_change_them(client):
    http, token = client
    assert http.get("/api/users/p1/lab-results", headers=token("a1", "admin")).status_code == 403
    body = {"test_date": TODAY.isoformat(), "fasting_glucose": 90, "has_diabetes": False}
    assert http.put("/api/users/p1/lab-results/blood_sugar", json=body, headers=token("a1", "admin")).status_code == 403


def test_bad_values_are_refused_with_422(client):
    http, token = client
    body = {"test_date": TODAY.isoformat(), "total_cholesterol": 150, "hdl": 200, "cholesterol_medicine": False}
    assert http.put("/api/users/p1/lab-results/cholesterol", json=body, headers=token("p1", "patient")).status_code == 422


# ── HL-140 and HL-141 ─────────────────────────────────────────────────────────────────────────────────────────────


def test_lab_answers_update_the_matching_setup_answers(store):
    labs.save("u1", "cholesterol", {"test_date": TODAY, "total_cholesterol": 200, "hdl": 50, "cholesterol_medicine": True})
    labs.save("u1", "blood_sugar", {"test_date": TODAY, "fasting_glucose": 90, "hba1c": None, "has_diabetes": False})
    assert store.answers.saved == {"cholesterol_medicine": True, "has_diabetes": False}


def test_kidney_from_creatinine_uses_age_and_sex(store, monkeypatch):
    import app.db.repositories as repos
    monkeypatch.setattr(repos, "get_profile_repo",
                        lambda: SimpleNamespace(get_by_id=lambda uid: {"sex": "male", "date_of_birth": "1976-10-01"}))
    saved = labs.save("u1", "kidney", {"test_date": TODAY, "creatinine": 1.0, "egfr": None})
    assert saved["egfr"] == pytest.approx(91.7, abs=0.2) and saved["note"] is None
    low = labs.save("u1", "kidney", {"test_date": TODAY, "creatinine": None, "egfr": 52})
    assert low["egfr"] == 52 and low["note"] == labs.DOCTOR_NOTE


def test_kidney_route_and_checks(client):
    http, token = client
    assert http.put("/api/users/p1/lab-results/kidney", json={"test_date": TODAY.isoformat()},
                    headers=token("p1", "patient")).status_code == 422
    res = http.put("/api/users/p1/lab-results/kidney", json={"test_date": TODAY.isoformat(), "egfr": 95},
                   headers=token("p1", "patient"))
    assert res.status_code == 200 and res.json()["result"]["egfr"] == 95
    assert http.put("/api/users/p1/lab-results/kidney", json={"test_date": TODAY.isoformat(), "egfr": 95},
                    headers=token("a1", "admin")).status_code == 403
