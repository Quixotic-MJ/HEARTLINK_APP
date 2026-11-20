"""2026-11-20: Admins and experts can use the mobile app with the same email and password as the portal. Every app
session acts as a user of their own data, so a staff account's app login never carries staff powers: those stay in the
portal, behind its emailed code."""
import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import family, premium, session_service
from app.services.session_service import issue_session, refresh_session
from app.utils.rate_limiter import limiter
from app.utils.security import ALGORITHM, SECRET_KEY, revoked_token_hashes

ADMIN = {"id": "admin-1", "role": "admin", "account_status": "active", "first_name": "Ada", "last_name": "Admin",
         "email": "ada@example.com", "phone": ""}
EXPERT = {"id": "expert-1", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active",
          "first_name": "Cora", "last_name": "Cardio", "email": "cora@example.com", "phone": ""}
PATIENT = {"id": "patient-1", "role": "patient", "account_status": "active", "first_name": "Pat"}


class Profiles:
    def __init__(self):
        self.people = {p["id"]: dict(p) for p in (ADMIN, EXPERT, PATIENT)}

    def get_by_id(self, uid):
        return self.people.get(uid)


@pytest.fixture
def profiles(monkeypatch):
    fake = Profiles()
    monkeypatch.setattr(session_service, "get_profile_repo", lambda: fake)
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: fake)
    monkeypatch.setattr("app.api.auth.auth.get_profile_repo", lambda: fake)
    return fake


def role_of(token):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["role"]


@pytest.mark.parametrize("uid, role", [("admin-1", "admin"), ("expert-1", "medical_expert")])
def test_an_app_session_is_a_user_session_for_staff_too(refresh_repo, profiles, uid, role):
    app_session = issue_session(uid, role, "mobile")
    assert role_of(app_session["token"]) == "patient"
    assert app_session["refresh_expires_in"] > 29 * 86400  # the app's 30 days, not the portal's 1 or 7
    # ...and it stays one when it's refreshed
    assert role_of(refresh_session(app_session["refresh_token"], "mobile")["token"]) == "patient"


def test_the_portal_keeps_the_staff_role(refresh_repo, profiles):
    web = issue_session("admin-1", "admin", "web")
    assert role_of(web["token"]) == "admin"
    assert role_of(refresh_session(web["refresh_token"], "web")["token"]) == "admin"


@pytest.fixture
def api(refresh_repo, profiles):
    revoked_token_hashes.clear()
    limiter.reset()
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield TestClient(app, base_url="https://testserver")
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


def test_an_app_login_cant_open_the_portal(api):
    """The gap this closes: an Admin's app login used to give a staff token that portal endpoints accepted, without the
    emailed code the portal asks for."""
    app_token = issue_session("admin-1", "admin", "mobile")["token"]
    res = api.get("/api/auth/me", headers={"Authorization": f"Bearer {app_token}"})
    assert res.status_code == 403
    web_token = issue_session("admin-1", "admin", "web")["token"]
    assert api.get("/api/auth/me", headers={"Authorization": f"Bearer {web_token}"}).status_code == 200


def test_staff_use_family_sharing_and_premium_like_any_user(monkeypatch, profiles):
    monkeypatch.setattr(family, "get_profile_repo", lambda: profiles)
    monkeypatch.setattr(premium, "get_profile_repo", lambda: profiles)
    for uid in ("admin-1", "expert-1", "patient-1"):
        assert family._patient_profile(uid)["id"] == uid
        assert premium._patient(uid)["id"] == uid


def test_a_disabled_account_still_cant(monkeypatch, profiles):
    profiles.people["admin-1"]["account_status"] = "disabled"
    monkeypatch.setattr(family, "get_profile_repo", lambda: profiles)
    monkeypatch.setattr(premium, "get_profile_repo", lambda: profiles)
    from fastapi import HTTPException
    for check in (family._patient_profile, premium._patient):
        with pytest.raises(HTTPException):
            check("admin-1")
