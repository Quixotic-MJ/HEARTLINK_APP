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
    # email first (as sign-in does), then the phone once, in +63 form (2026-11-17: no more repeats in every format,
    # which used up Supabase's sign-in limit)
    assert GoTrue.calls == [{"email": "ana.test@example.com"}, {"phone": "+639170000101"}]


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


# --- 2026-11-17: sign-in no longer uses up Supabase's limit, and "too many" never reads as a wrong password ---------

class Scripted:
    """Answers Supabase sign-in requests from a list of status codes, and counts them."""
    codes = []
    calls = []

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, url, headers=None, json=None):
        Scripted.calls.append((headers["apikey"], {k: v for k, v in json.items() if k != "password"}))
        code = Scripted.codes.pop(0) if Scripted.codes else 400
        body = {"user": {"id": USER_ID}} if code == 200 else {"error": "x"}
        return SimpleNamespace(status_code=code, json=lambda: body)


@pytest.fixture
def scripted(monkeypatch, svc):
    service, _ = svc
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setattr("httpx.Client", Scripted)
    Scripted.codes, Scripted.calls = [], []
    return service


def test_a_right_password_takes_one_request(scripted):
    Scripted.codes = [200]
    assert scripted.verify_credentials(USER_ID, PASSWORD) is True
    assert len(Scripted.calls) == 1


def test_a_wrong_password_takes_at_most_two_requests(scripted):
    assert scripted.verify_credentials(USER_ID, "Wrong-password-123!") is False
    assert [c[1] for c in Scripted.calls] == [{"email": "ana.test@example.com"}, {"phone": "+639170000101"}]
    assert all(c[0] == "service-key" for c in Scripted.calls)  # the second key only when a key is refused


def test_supabase_busy_is_too_many_attempts_not_a_wrong_password(scripted):
    from fastapi import HTTPException
    Scripted.codes = [429]
    with pytest.raises(HTTPException) as exc:
        scripted.verify_credentials(USER_ID, PASSWORD)
    assert exc.value.status_code == 429 and "Too many sign-in attempts" in exc.value.detail
    assert len(Scripted.calls) == 1


def test_a_refused_key_tries_the_other_key(scripted):
    Scripted.codes = [401, 200]
    assert scripted.verify_credentials(USER_ID, PASSWORD) is True
    assert [c[0] for c in Scripted.calls] == ["service-key", "anon-key"]


# --- 2026-11-17: an invisible space at the start or end of a password ---------------------------------------------

def test_new_passwords_are_saved_without_spaces_at_the_ends():
    from app.schemas.auth import PasswordResetConfirm
    from app.utils.password_policy import validate_strong_password
    assert validate_strong_password("  A-long-password-2026! ") == "A-long-password-2026!"
    body = PasswordResetConfirm(identifier="a@example.com", code="123456", new_password="A-long-password-2026! ")
    assert body.new_password == "A-long-password-2026!"
    # spaces in the middle are part of the password
    assert validate_strong_password("A long password 2026!") == "A long password 2026!"


def test_a_space_the_keyboard_added_still_signs_in(scripted):
    # the saved password has no space; the typed one has one at the end: as typed fails, then without it works
    Scripted.codes = [400, 400, 200]
    assert scripted.verify_credentials(USER_ID, PASSWORD + " ") is True
    assert len(Scripted.calls) == 3


def test_a_password_without_spaces_is_only_tried_once(scripted):
    assert scripted.verify_credentials(USER_ID, "Wrong-password-123!") is False
    assert len(Scripted.calls) == 2  # email and phone, never a second round
