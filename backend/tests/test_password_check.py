"""Deleting an account and changing a password accept the password exactly the way sign-in does.

They used to try only the profile's email with the SDK, so an account whose login works by phone number (and not by
email) could sign in but never delete itself or change its password: every try came back 400 "Incorrect password".
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.services import auth_service
from app.services.auth_service import SupabaseAuthService

USER_ID = "3823f2ff-0000-4000-8000-000000000001"
PASSWORD = "Correct-horse-battery-9!"
PROFILE = {"id": USER_ID, "role": "patient", "account_status": "active", "email": "Ana.Test@Example.com",
           "phone": "639170000101"}


class Profiles:
    def get_by_id(self, uid):
        return dict(PROFILE) if uid == USER_ID else None


class GoTrue:
    """Stands in for Supabase Auth: only the phone login in +63 form, with the right password, works."""
    calls = []

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, url, headers=None, json=None):
        GoTrue.calls.append({k: v for k, v in json.items() if k != "password"})
        if json.get("phone") == "+639170000101" and json.get("password") == PASSWORD:
            return SimpleNamespace(status_code=200, json=lambda: {"user": {"id": USER_ID}})
        return SimpleNamespace(status_code=400, json=lambda: {"error": "invalid_grant"})


@pytest.fixture
def svc(monkeypatch):
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: Profiles())
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.setattr("httpx.Client", GoTrue)
    GoTrue.calls = []
    shared = MagicMock()
    service = SupabaseAuthService(shared)
    isolated = MagicMock()
    isolated.sign_in_with_password.side_effect = Exception("400 Invalid login credentials")
    monkeypatch.setattr(service, "_isolated_auth", lambda: isolated)
    return service, shared


def test_a_phone_login_passes_the_delete_check(svc):
    service, _ = svc
    assert service.verify_credentials(USER_ID, PASSWORD) is True
    # email first (as sign-in does), then the phone in its saved form, then +63
    assert GoTrue.calls == [{"email": "ana.test@example.com"}, {"phone": "639170000101"}, {"phone": "+639170000101"}]


def test_a_wrong_password_still_fails(svc):
    service, _ = svc
    assert service.verify_credentials(USER_ID, "Wrong-password-123!") is False
    assert service.verify_credentials("someone-else", PASSWORD) is False


def test_a_phone_login_can_change_its_password(svc):
    service, shared = svc
    assert service.change_password(USER_ID, PASSWORD, "New-long-password-456!") is True
    shared.auth.admin.update_user_by_id.assert_called_once_with(USER_ID, {"password": "New-long-password-456!"})
    assert service.change_password(USER_ID, "Wrong-password-123!", "New-long-password-456!") is False


def test_sign_in_uses_the_same_check(svc, monkeypatch):
    service, _ = svc
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: SimpleNamespace(get_by_identifier=lambda i: dict(PROFILE)))
    assert service.login("09170000101", PASSWORD)["user_id"] == USER_ID
