"""HL-014: one Super Admin role with full staff access, kept apart from the Expert sub-roles."""
import re
from pathlib import Path

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.admin_api.admin_api import _resolve_expert_type
from app.utils.security import (
    STAFF_ROLES,
    create_access_token,
    get_current_admin_user,
    get_current_super_admin,
    revoked_token_hashes,
    verify_user_access,
)

PROFILES = {
    "super-1": {"id": "super-1", "role": "super_admin", "account_status": "active"},
    "admin-1": {"id": "admin-1", "role": "admin", "account_status": "active"},
    "expert-1": {"id": "expert-1", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
    "patient-1": {"id": "patient-1", "role": "patient", "account_status": "active"},
}


class FakeProfileRepo:
    def get_by_id(self, user_id):
        return PROFILES.get(user_id)


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


guarded_app = FastAPI()


@guarded_app.get("/staff")
def staff_only(user: dict = Depends(get_current_admin_user)):
    return {"role": user["role"]}


@guarded_app.get("/super")
def super_only(user: dict = Depends(get_current_super_admin)):
    return {"role": user["role"]}


@pytest.fixture(autouse=True)
def fakes(monkeypatch):
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: FakeProfileRepo())
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    yield
    revoked_token_hashes.clear()


def _get(path, user_id):
    token = create_access_token({"user_id": user_id, "role": PROFILES[user_id]["role"]})
    return TestClient(guarded_app).get(path, headers={"Authorization": f"Bearer {token}"})


def test_super_admin_passes_staff_and_super_admin_guards():
    assert _get("/staff", "super-1").status_code == 200
    assert _get("/super", "super-1").status_code == 200


@pytest.mark.parametrize("user_id", ["admin-1", "expert-1"])
def test_other_staff_cannot_use_super_admin_routes(user_id):
    assert _get("/staff", user_id).status_code == 200
    assert _get("/super", user_id).status_code == 403


def test_patient_is_not_staff():
    assert _get("/staff", "patient-1").status_code == 403


def test_super_admin_can_open_any_patient_record():
    verify_user_access({"user_id": "super-1", "role": "super_admin"}, "patient-1")


@pytest.mark.parametrize("legacy_role", ["doctor", "clinician", "superadmin", "Super Admin"])
def test_unknown_role_names_get_no_access(legacy_role):
    with pytest.raises(HTTPException) as exc:
        verify_user_access({"user_id": "x", "role": legacy_role}, "patient-1")
    assert exc.value.status_code == 403


def test_super_admin_never_carries_an_expert_type():
    assert _resolve_expert_type("super_admin", "Cardiologist") is None


def test_only_one_super_admin_role_exists():
    assert STAFF_ROLES == {"admin", "super_admin", "medical_expert"}
    sql = (Path(__file__).resolve().parents[1] / "supabase/migrations/002_profiles.sql").read_text(encoding="utf-8")
    allowed = re.search(r"CHECK \(role IN \(([^)]*)\)\)", sql).group(1)
    assert sorted(r.strip(" '") for r in allowed.split(",")) == ["admin", "medical_expert", "patient", "super_admin"]
