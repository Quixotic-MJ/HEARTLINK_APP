"""HL-047: short access tokens, plus refresh tokens that rotate and can be revoked."""
from datetime import timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services import session_service
from app.services.session_service import (
    ROTATION_GRACE,
    issue_session,
    refresh_session,
    restart_after_password_change,
    revoke_session,
)
from app.utils.rate_limiter import limiter
from app.utils.security import (
    ALGORITHM,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    REFRESH_COOKIE_NAME,
    SECRET_KEY,
    access_token_lifetime,
    create_access_token,
    revoked_token_hashes,
)
from app.utils.time import utc_now

PATIENT = {"id": "patient-1", "role": "patient", "account_status": "active"}
ADMIN = {"id": "admin-1", "role": "admin", "account_status": "active", "first_name": "Ada", "last_name": "Admin",
         "email": "ada@example.com", "phone": ""}


class FakeProfileRepo:
    def __init__(self):
        self.people = {p["id"]: dict(p) for p in (PATIENT, ADMIN)}

    def get_by_id(self, uid):
        return self.people.get(uid)


@pytest.fixture
def profiles(monkeypatch):
    fake = FakeProfileRepo()
    monkeypatch.setattr(session_service, "get_profile_repo", lambda: fake)
    return fake


def token_life(token):
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return claims["exp"] - utc_now().timestamp()


def age_rotation(repo, seconds):
    """Pretends every rotated token was rotated `seconds` ago."""
    for row in repo.rows.values():
        if row["revoked_reason"] == "rotated":
            row["revoked_at"] = (utc_now() - timedelta(seconds=seconds)).isoformat()


# --- lifetimes ---------------------------------------------------------------------------------------

def test_access_tokens_are_short(monkeypatch):
    for name in ("STAFF_ACCESS_TOKEN_MINUTES", "PATIENT_ACCESS_TOKEN_MINUTES"):
        monkeypatch.delenv(name, raising=False)
    assert access_token_lifetime("admin") == timedelta(hours=1)
    assert access_token_lifetime("medical_expert") == timedelta(hours=1)
    assert access_token_lifetime("patient") == timedelta(hours=24)
    assert 3500 < token_life(create_access_token({"user_id": "a", "role": "super_admin"})) <= 3600


def test_testing_override_can_only_shorten(monkeypatch):
    monkeypatch.setenv("STAFF_ACCESS_TOKEN_MINUTES", "1")
    assert access_token_lifetime("admin") == timedelta(minutes=1)
    monkeypatch.setenv("STAFF_ACCESS_TOKEN_MINUTES", "100000")
    assert access_token_lifetime("admin") == timedelta(hours=1)


def test_refresh_lifetimes(refresh_repo):
    assert issue_session("admin-1", "admin", "web", remember=True)["refresh_expires_in"] > 6.9 * 86400
    assert issue_session("admin-1", "admin", "web", remember=False)["refresh_expires_in"] <= 86400
    assert issue_session("patient-1", "patient", "mobile")["refresh_expires_in"] > 29.9 * 86400


def test_only_a_hash_is_stored(refresh_repo):
    session = issue_session("patient-1", "patient", "mobile")
    assert session["refresh_token"] not in str(refresh_repo.rows)


# --- refreshing --------------------------------------------------------------------------------------

def test_refresh_rotates_the_token(refresh_repo, profiles):
    first = issue_session("patient-1", "patient", "mobile")
    second = refresh_session(first["refresh_token"], "mobile")

    assert second["refresh_token"] != first["refresh_token"]
    assert jwt.decode(second["token"], SECRET_KEY, algorithms=[ALGORITHM])["user_id"] == "patient-1"
    with pytest.raises(HTTPException) as exc:
        refresh_session(first["refresh_token"], "mobile")
    assert exc.value.status_code == 401
    refresh_session(second["refresh_token"], "mobile")        # within the grace window, the family survives


def test_reusing_an_old_token_logs_out_everywhere(refresh_repo, profiles):
    first = issue_session("patient-1", "patient", "mobile")
    second = refresh_session(first["refresh_token"], "mobile")
    age_rotation(refresh_repo, ROTATION_GRACE.total_seconds() + 5)

    with pytest.raises(HTTPException):
        refresh_session(first["refresh_token"], "mobile")      # stolen copy used again
    with pytest.raises(HTTPException):
        refresh_session(second["refresh_token"], "mobile")     # so the real one is revoked too
    assert {r["revoked_reason"] for r in refresh_repo.rows.values()} == {"rotated", "reuse_detected"}


def test_staff_keep_their_end_date_patients_are_extended(refresh_repo, profiles):
    staff = issue_session("admin-1", "admin", "web", remember=True)
    for row in refresh_repo.rows.values():
        row["expires_at"] = (utc_now() + timedelta(days=2)).isoformat()
    assert refresh_session(staff["refresh_token"], "web")["refresh_expires_in"] <= 2 * 86400

    patient = issue_session("patient-1", "patient", "mobile")
    for row in refresh_repo.rows.values():
        if row["user_id"] == "patient-1":
            row["expires_at"] = (utc_now() + timedelta(days=2)).isoformat()
    assert refresh_session(patient["refresh_token"], "mobile")["refresh_expires_in"] > 29 * 86400


@pytest.mark.parametrize("break_it", ["expired", "disabled", "other_app", "unknown"])
def test_invalid_refresh_is_rejected(refresh_repo, profiles, break_it):
    session = issue_session("patient-1", "patient", "mobile")
    raw, client = session["refresh_token"], "mobile"
    if break_it == "expired":
        next(iter(refresh_repo.rows.values()))["expires_at"] = (utc_now() - timedelta(seconds=1)).isoformat()
    elif break_it == "disabled":
        profiles.people["patient-1"]["account_status"] = "archived"
    elif break_it == "other_app":
        client = "web"
    else:
        raw = "made-up-token"
    with pytest.raises(HTTPException) as exc:
        refresh_session(raw, client)
    assert exc.value.status_code == 401


def test_role_comes_from_the_profile_at_refresh(refresh_repo, profiles):
    session = issue_session("admin-1", "admin", "web")
    profiles.people["admin-1"]["role"] = "medical_expert"
    claims = jwt.decode(refresh_session(session["refresh_token"], "web")["token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["role"] == "medical_expert"


# --- revoking ----------------------------------------------------------------------------------------

def test_logout_revokes_the_refresh_token(refresh_repo, profiles):
    session = issue_session("patient-1", "patient", "mobile")
    revoke_session(session["refresh_token"])
    with pytest.raises(HTTPException):
        refresh_session(session["refresh_token"], "mobile")


def test_password_change_ends_other_sessions_but_not_this_one(refresh_repo, profiles):
    phone = issue_session("admin-1", "admin", "mobile")
    laptop = issue_session("admin-1", "admin", "web", remember=False)

    fresh = restart_after_password_change("admin-1", "admin", "web", current_refresh=laptop["refresh_token"])

    for old in (phone, laptop):
        with pytest.raises(HTTPException):
            refresh_session(old["refresh_token"], "mobile" if old is phone else "web")
    assert fresh["remember"] is False                          # keeps the "Stay signed in" choice
    refresh_session(fresh["refresh_token"], "web")


# --- routes ------------------------------------------------------------------------------------------

@pytest.fixture
def api(monkeypatch, refresh_repo, profiles):
    revoked_token_hashes.clear()
    limiter.reset()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: profiles)
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield TestClient(app, base_url="https://testserver")
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


def test_mobile_refresh_route(api):
    session = issue_session("patient-1", "patient", "mobile")
    res = api.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert res.status_code == 200
    assert set(res.json()) == {"token", "refresh_token", "expires_in"}
    assert api.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code == 401


def test_web_refresh_route_needs_csrf_and_rotates_cookies(api):
    session = issue_session("admin-1", "admin", "web")
    api.cookies.set(REFRESH_COOKIE_NAME, session["refresh_token"], path="/api/auth")
    api.cookies.set(CSRF_COOKIE_NAME, "csrf-abc")

    assert api.post("/api/auth/refresh").status_code == 403
    res = api.post("/api/auth/refresh", headers={CSRF_HEADER_NAME: "csrf-abc"})
    assert res.status_code == 200 and "token" not in res.json()

    cookies = [v for k, v in res.headers.multi_items() if k.lower() == "set-cookie"]
    refresh_cookie = next(c for c in cookies if c.startswith(f"{REFRESH_COOKIE_NAME}="))
    assert "httponly" in refresh_cookie.lower() and "path=/api/auth" in refresh_cookie.lower()
    assert session["refresh_token"] not in refresh_cookie


def test_mobile_logout_revokes_the_refresh_token(api):
    session = issue_session("patient-1", "patient", "mobile")
    res = api.post("/api/auth/logout", json={"refresh_token": session["refresh_token"]},
                   headers={"Authorization": f"Bearer {session['token']}"})
    assert res.status_code == 200
    assert api.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code == 401
