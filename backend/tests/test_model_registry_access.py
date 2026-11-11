"""HL-106: only an Admin can register a model or change its status (approved, deployed...). Experts can still read the list."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.admin_api import case_review_api
from app.main import app
from app.utils import security

PEOPLE = {
    "admin-1": {"id": "admin-1", "role": "admin", "account_status": "active"},
    "diet-1": {"id": "diet-1", "role": "medical_expert", "expert_type": "Dietitian", "account_status": "active"},
    "pt-1": {"id": "pt-1", "role": "medical_expert", "expert_type": "Physical Therapist", "account_status": "active"},
    "cardio-1": {"id": "cardio-1", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
}
MODEL = {"model_id": "m1", "artifact_filename": "m.json", "model_hash": "abc", "dataset_id": "d1"}


class Registry:
    def __init__(self):
        self.models = []

    def list_candidate_models(self):
        return list(self.models)

    def register_candidate_model(self, record):
        self.models.append(record)
        return record

    def update_candidate_model_status(self, model_id, status):
        for m in self.models:
            if m["model_id"] == model_id:
                m["status"] = status
                return m
        return None


@pytest.fixture
def client(monkeypatch):
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    registry = Registry()
    monkeypatch.setattr(case_review_api, "get_case_review_repo", lambda: registry)
    monkeypatch.setattr(security, "get_profile_repo", lambda: SimpleNamespace(get_by_id=lambda uid: dict(PEOPLE.get(uid, {}))))
    token = lambda uid: {"Authorization": f"Bearer {security.create_access_token({'user_id': uid, 'role': PEOPLE[uid]['role']})}"}
    try:
        yield TestClient(app), token, registry
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)


@pytest.mark.parametrize("expert", ["diet-1", "pt-1", "cardio-1"])
def test_experts_cant_register_or_approve_a_model(client, expert):
    http, token, registry = client
    registry.models.append({**MODEL, "status": "candidate"})
    assert http.post("/api/admin/models", json={**MODEL, "model_id": "m2"}, headers=token(expert)).status_code == 403
    assert http.put("/api/admin/models/m1/status", json={"status": "deployed"}, headers=token(expert)).status_code == 403
    assert registry.models[0]["status"] == "candidate"
    assert http.get("/api/admin/models", headers=token(expert)).status_code == 200  # they can still see the list


def test_an_admin_can(client):
    http, token, registry = client
    assert http.post("/api/admin/models", json=MODEL, headers=token("admin-1")).status_code == 200
    res = http.put("/api/admin/models/m1/status", json={"status": "approved"}, headers=token("admin-1"))
    assert res.status_code == 200 and registry.models[0]["status"] == "approved"
