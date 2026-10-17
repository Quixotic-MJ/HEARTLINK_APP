"""HL-033: Admin web portal auth via HttpOnly cookies + double-submit CSRF."""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.main import app
from app.utils.rate_limiter import limiter
from app.utils.security import (
    AUTH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    create_access_token,
    get_current_admin_user,
    revoked_token_hashes,
)

ADMIN_ID = "admin-123"
ADMIN_PROFILE = {
    "id": ADMIN_ID,
    "role": "admin",
    "account_status": "active",
    "first_name": "Ada",
    "last_name": "Admin",
    "email": "ada@example.com",
    "phone": "",
}


class FakeProfileRepo:
    def get_by_id(self, user_id):
        return ADMIN_PROFILE if user_id == ADMIN_ID else None


class FakeAuthService:
    def web_login(self, identifier, password, remember=False):
        return {
            "success": True,
            "requires_2fa": False,
            "user_id": ADMIN_ID,
            "role": "admin",
            "first_name": "Ada",
            "last_name": "Admin",
            "email": "ada@example.com",
            "phone": "",
            "token": create_access_token({"user_id": ADMIN_ID, "role": "admin"}),
        }


class FakeSupabase:
    def __getattr__(self, name):
        return lambda *a, **k: self


# Minimal app exposing a state-changing admin route to exercise CSRF.
protected_app = FastAPI()


@protected_app.get("/protected")
def protected_get(user: dict = Depends(get_current_admin_user)):
    return {"user_id": user["user_id"]}


@protected_app.post("/protected")
def protected_post(user: dict = Depends(get_current_admin_user)):
    return {"user_id": user["user_id"]}


@pytest.fixture(autouse=True)
def fakes(monkeypatch, refresh_repo):
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.services.session_service.get_profile_repo", lambda: FakeProfileRepo())
    limiter.reset()  # web-login is limited to 5/minute; keep this module independent of others
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: FakeProfileRepo())
    monkeypatch.setattr("app.api.auth.auth.get_profile_repo", lambda: FakeProfileRepo())
    monkeypatch.setattr("app.api.auth.auth.get_auth_service", lambda: FakeAuthService())
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: FakeSupabase())
    # Other modules install app-wide dependency overrides at import time; exercise the real auth here.
    saved_overrides = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.update(saved_overrides)
    revoked_token_hashes.clear()


def _web_login(client, remember=False):
    return client.post(
        "/api/auth/web-login",
        json={"identifier": "ada@example.com", "password": "pw", "remember": remember},
    )


def _set_cookie_headers(response):
    return [v for k, v in response.headers.multi_items() if k.lower() == "set-cookie"]


def test_web_login_sets_httponly_strict_cookie_and_hides_token():
    client = TestClient(app, base_url="https://testserver")
    res = _web_login(client, remember=True)
    assert res.status_code == 200
    body = res.json()
    assert "token" not in body
    assert body["user_id"] == ADMIN_ID

    headers = _set_cookie_headers(res)
    auth = next(h for h in headers if h.startswith(f"{AUTH_COOKIE_NAME}="))
    csrf = next(h for h in headers if h.startswith(f"{CSRF_COOKIE_NAME}="))
    assert "httponly" in auth.lower()
    assert "secure" in auth.lower()
    assert "samesite=strict" in auth.lower()
    assert "max-age" in auth.lower()
    assert "httponly" not in csrf.lower()
    assert "samesite=strict" in csrf.lower()


def test_web_login_without_remember_sets_session_cookie():
    client = TestClient(app, base_url="https://testserver")
    res = _web_login(client, remember=False)
    auth = next(h for h in _set_cookie_headers(res) if h.startswith(f"{AUTH_COOKIE_NAME}="))
    assert "max-age" not in auth.lower()
    assert "expires" not in auth.lower()


def test_me_uses_cookie_session():
    client = TestClient(app, base_url="https://testserver")
    assert client.get("/api/auth/me").status_code == 401
    _web_login(client)
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


def _cookie_client():
    token = create_access_token({"user_id": ADMIN_ID, "role": "admin"})
    client = TestClient(protected_app, base_url="https://testserver")
    client.cookies.set(AUTH_COOKIE_NAME, token)
    client.cookies.set(CSRF_COOKIE_NAME, "csrf-abc")
    return client, token


def test_cookie_get_does_not_need_csrf():
    client, _ = _cookie_client()
    assert client.get("/protected").status_code == 200


def test_cookie_post_requires_matching_csrf_header():
    client, _ = _cookie_client()
    assert client.post("/protected").status_code == 403
    assert client.post("/protected", headers={CSRF_HEADER_NAME: "wrong"}).status_code == 403
    assert client.post("/protected", headers={CSRF_HEADER_NAME: "csrf-abc"}).status_code == 200


def test_bearer_requests_skip_csrf():
    token = create_access_token({"user_id": ADMIN_ID, "role": "admin"})
    client = TestClient(protected_app, base_url="https://testserver")
    res = client.post("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200


def test_missing_credentials_is_401():
    client = TestClient(protected_app, base_url="https://testserver")
    assert client.get("/protected").status_code == 401


def test_logout_requires_csrf_revokes_and_clears_cookies():
    client = TestClient(app, base_url="https://testserver")
    _web_login(client)
    old_token = client.cookies.get(AUTH_COOKIE_NAME)
    csrf = client.cookies.get(CSRF_COOKIE_NAME)

    assert client.post("/api/auth/logout").status_code == 403

    res = client.post("/api/auth/logout", headers={CSRF_HEADER_NAME: csrf})
    assert res.status_code == 200
    cleared = _set_cookie_headers(res)
    assert any(h.startswith(f'{AUTH_COOKIE_NAME}=""') or h.startswith(f"{AUTH_COOKIE_NAME}=;") for h in cleared)
    assert client.cookies.get(AUTH_COOKIE_NAME) is None

    # Replaying the old session cookie is rejected.
    replay = TestClient(app, base_url="https://testserver")
    replay.cookies.set(AUTH_COOKIE_NAME, old_token)
    assert replay.get("/api/auth/me").status_code == 401
