"""The clinical facts sent with a case review (app/services/clinical.py): only what the patient actually said or
measured. The removed "What should HeartLink focus on?" answer used to become "Hypertension" / "Hyperlipidemia" and a
made-up cholesterol of 240 or 180 (2026-11-12)."""
from types import SimpleNamespace

import pytest

from app.services import clinical, health_logs, lab_results


@pytest.fixture
def patient(monkeypatch):
    state = {"onboarding": {}, "labs": {"cholesterol": None}, "alerts": []}
    monkeypatch.setattr(clinical, "get_health_logs_repo", lambda: SimpleNamespace(list_alerts=lambda user_id: state["alerts"]))
    monkeypatch.setattr(clinical, "get_baseline_repo", lambda: SimpleNamespace(get_baseline=lambda user_id: state["onboarding"]))
    monkeypatch.setattr(lab_results, "results_for", lambda user_id: state["labs"])
    monkeypatch.setattr(health_logs, "get_health_logs", lambda user_id, **k: [])
    return state


def test_no_conditions_or_cholesterol_are_made_up(patient):
    data = clinical.get_clinical_baseline_data("u1")
    assert data["diagnosed_conditions"] == []
    assert data["serum_cholesterol"] is None


def test_diabetes_comes_from_the_patients_answer(patient):
    patient["onboarding"] = {"has_diabetes": True}
    assert clinical.get_clinical_baseline_data("u1")["diagnosed_conditions"] == ["Diabetes (a doctor told them)"]


def test_cholesterol_comes_from_a_lab_result_that_still_counts(patient):
    patient["labs"] = {"cholesterol": {"total_cholesterol": 212, "counts": True}}
    assert clinical.get_clinical_baseline_data("u1")["serum_cholesterol"] == 212
    patient["labs"] = {"cholesterol": {"total_cholesterol": 212, "counts": False}}
    assert clinical.get_clinical_baseline_data("u1")["serum_cholesterol"] is None


def test_saving_the_profile_no_longer_touches_health_goals(monkeypatch):
    from app.services import users

    saved = {}

    def update(user_id, data):
        saved.update(data)
        return data

    monkeypatch.setattr(users, "get_profile_repo", lambda: SimpleNamespace(update=update))
    users.update_profile("u1", {"first_name": "Ana", "height_cm": 160, "weight_kg": 60})
    assert "health_goals" not in saved
