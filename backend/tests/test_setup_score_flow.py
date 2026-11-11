"""The real requests: setup saves the model's starting score, and later answers and logs move to the Heart score."""
import pytest
from fastapi.testclient import TestClient

import app.db.repositories as repos
from app.main import app
from app.utils.security import create_access_token, revoked_token_hashes

PATIENT_ID = "11111111-1111-1111-1111-111111111111"
PROFILE = {
    "id": PATIENT_ID, "role": "patient", "account_status": "active", "first_name": "Ana", "date_of_birth": "1990-01-01",
    "sex": "female", "height_cm": 160, "weight_kg": 60,
}
SETUP = dict(
    vigorous_activity=False, moderate_activity=True, moderate_days=3, moderate_minutes=30, walk_bike_transport=False,
    sedentary_hours="4-6h", sleep_hours=7.5, ever_smoked=True, smoke_now="Not at all", smoke_quit_when="5_plus_years",
    ever_drank=False, diet_level="average", fried_food_freq="sometimes", salty_food_freq="sometimes", fruit_veg_servings="2-3",
)
ANSWERS = dict(ever_smoked=True, smoke_now="Not at all", smoke_quit_when="1_to_5_years", fruit_veg_servings="4-5", fried_food_freq="rarely", salty_food_freq="rarely")


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


class Profiles:
    def get_by_id(self, user_id):
        return PROFILE

    def update(self, user_id, data):
        return PROFILE


class Baseline:
    def __init__(self):
        self.saved = {}

    def get_baseline(self, user_id):
        return self.saved or None

    def save_baseline(self, user_id, data):
        self.saved = {**self.saved, "created_at": "2026-01-01T00:00:00+00:00", **data}
        return self.saved

    def get_thresholds(self, user_id):
        return {"sodium_limit_mg": 1500}

    def update_thresholds(self, user_id, data):
        return data


class Scores:
    def __init__(self):
        self.saved = []

    def create_hss_record(self, user_id, data):
        self.saved.append(data)
        return data


class Rows:
    def __getattr__(self, name):
        return lambda *a, **k: []


@pytest.fixture
def world(monkeypatch):
    revoked_token_hashes.clear()
    baseline, scores = Baseline(), Scores()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles())
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    monkeypatch.setattr(repos, "get_profile_repo", lambda: Profiles())
    monkeypatch.setattr(repos, "get_baseline_repo", lambda: baseline)
    monkeypatch.setattr(repos, "get_hss_repo", lambda: scores)
    for name in ("get_meals_repo", "get_exercises_repo", "get_sleep_repo", "get_content_repo"):
        monkeypatch.setattr(repos, name, lambda: Rows())
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: [])
    monkeypatch.setattr("app.services.users.get_profile_repo", lambda: Profiles())
    monkeypatch.setattr("app.services.users.get_baseline_repo", lambda: baseline)
    monkeypatch.setattr("app.services.heart_score._sodium_limit", lambda uid: 1500.0)
    overrides = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield baseline, scores
    app.dependency_overrides.update(overrides)
    revoked_token_hashes.clear()


def call(method, path, body=None):
    token = create_access_token({"user_id": PATIENT_ID, "role": "patient"})
    client = TestClient(app, base_url="https://testserver")
    return client.request(method, f"/api/users/{PATIENT_ID}{path}", json=body, headers={"Authorization": f"Bearer {token}"})


def test_setup_saves_the_models_starting_estimate(world):
    baseline, scores = world
    res = call("POST", "/baseline/complete", SETUP)
    assert res.status_code == 201
    record = scores.saved[-1]
    assert record["source"] == "baseline" and record["model_version"].startswith("starting-score-le8")
    assert 50 <= record["score"] <= 79
    # HL-139: no risk answers in this setup, so the risk waits for them
    assert record["risk_probability"] is None and record["contributing_factors"]["risk"]["reason"] == "questions"
    factors = record["contributing_factors"]
    assert factors["source"] == "starting_model" and factors["model_estimate"] >= record["score"]
    assert res.json()["initial_hss"]["score"] == record["score"]
    assert baseline.saved["smoke_quit_when"] == "5_plus_years"


def test_setup_without_a_quit_answer_doesnt_save_an_empty_one(world):
    baseline, _ = world
    never = {**SETUP, "ever_smoked": False, "smoke_now": None, "smoke_quit_when": None}
    assert call("POST", "/baseline/complete", never).status_code == 201
    assert "smoke_quit_when" not in baseline.saved


def test_a_quit_answer_is_cleared_if_they_still_smoke(world):
    baseline, _ = world
    still = {**SETUP, "smoke_now": "Some days"}
    assert call("POST", "/baseline/complete", still).status_code == 201
    assert "smoke_quit_when" not in baseline.saved


def test_changing_answers_moves_to_the_heart_score(world):
    baseline, scores = world
    call("POST", "/baseline/complete", SETUP)
    res = call("PUT", "/baseline/answers", ANSWERS)
    assert res.status_code == 200
    record = scores.saved[-1]
    assert record["source"] == "telemetry" and record["contributing_factors"]["trigger"] == "answers_update"
    assert record["contributing_factors"]["areas"]["nicotine"]["points"] == 50
    assert baseline.saved["fruit_veg_servings"] == "4-5"


def test_answers_need_setup_first_and_a_smoking_answer(world):
    assert call("PUT", "/baseline/answers", ANSWERS).status_code == 404
    call("POST", "/baseline/complete", SETUP)
    assert call("PUT", "/baseline/answers", {**ANSWERS, "smoke_now": None}).status_code == 422


def test_no_one_can_change_someone_elses_answers(world):
    token = create_access_token({"user_id": "22222222-2222-2222-2222-222222222222", "role": "patient"})
    client = TestClient(app, base_url="https://testserver")
    res = client.put(f"/api/users/{PATIENT_ID}/baseline/answers", json=ANSWERS, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


# ── HL-140: the three Heart risk answers ──────────────────────────────────────────────────────────────────────────

RISK_ANSWERS = dict(bp_medicine=True, has_diabetes=False, cholesterol_medicine=False)


def test_setup_saves_the_risk_answers_and_an_estimated_risk(world):
    baseline, scores = world
    res = call("POST", "/baseline/complete", {**SETUP, **RISK_ANSWERS})
    assert res.status_code == 201
    assert {k: baseline.saved[k] for k in RISK_ANSWERS} == RISK_ANSWERS
    risk = scores.saved[-1]["contributing_factors"]["risk"]
    assert risk["kind"] == "estimated" and risk["age"] == 36 and risk["band"] == "low"
    assert scores.saved[-1]["risk_probability"] == round(risk["ascvd_10"] / 100, 4)
    assert res.json()["initial_hss"]["contributing_factors"]["risk"] == risk


def test_an_older_app_without_them_still_finishes_setup(world):
    baseline, _ = world
    assert call("POST", "/baseline/complete", SETUP).status_code == 201
    assert not any(k in baseline.saved for k in RISK_ANSWERS)


def test_existing_users_answer_them_once_and_the_risk_follows(world):
    baseline, scores = world
    assert call("PUT", "/baseline/risk-answers", RISK_ANSWERS).status_code == 404  # setup first
    call("POST", "/baseline/complete", SETUP)
    res = call("PUT", "/baseline/risk-answers", RISK_ANSWERS)
    assert res.status_code == 200 and baseline.saved["bp_medicine"] is True
    risk = scores.saved[-1]["contributing_factors"]["risk"]
    # No lab results, so it's the estimate (or, before the model file exists, "no_estimate"), never "questions"
    assert risk.get("kind") == "estimated" or risk.get("reason") == "no_estimate"
    assert call("PUT", "/baseline/risk-answers", {"bp_medicine": True}).status_code == 422


def test_changing_heart_answers_keeps_the_risk_answers(world):
    baseline, _ = world
    call("POST", "/baseline/complete", {**SETUP, **RISK_ANSWERS})
    assert call("PUT", "/baseline/answers", ANSWERS).status_code == 200
    assert baseline.saved["bp_medicine"] is True
