"""HL-045: shared development sign-up code behind DEV_OTP_ENABLED / DEV_OTP_CODE."""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services import auth_service
from app.services.auth_service import SupabaseAuthService, get_dev_otp_code
from app.utils.time import utc_now

PHONE = "+639201234567"
EMAIL = "new.user@example.com"
PASSWORD = "a-strong-password-1!"


class FakeProfileRepo:
    def __init__(self, profiles=None):
        self.profiles = list(profiles or [])

    def get_by_identifier(self, identifier):
        for p in self.profiles:
            if identifier in (p.get("phone"), p.get("email")):
                return p
        return None

    def get_by_id(self, user_id):
        return next((p for p in self.profiles if p["id"] == user_id), None)

    def create(self, profile):
        self.profiles.append(profile)
        return profile


@pytest.fixture
def otp_env(monkeypatch):
    for name in ("ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE"):
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


@pytest.fixture
def repo(monkeypatch):
    fake = FakeProfileRepo()
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: fake)
    return fake


@pytest.fixture
def svc():
    client = MagicMock()
    client.auth.admin.list_users.return_value = []
    client.auth.admin.create_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="new-user-id", email=EMAIL, phone=PHONE)
    )
    return SupabaseAuthService(client)


# --- get_dev_otp_code ---------------------------------------------------------

def test_local_defaults_to_on_with_public_code(otp_env):
    assert get_dev_otp_code() == "123456"


def test_local_can_be_switched_off(otp_env):
    otp_env.setenv("DEV_OTP_ENABLED", "false")
    assert get_dev_otp_code() is None


def test_production_defaults_to_off(otp_env):
    otp_env.setenv("ENVIRONMENT", "production")
    assert get_dev_otp_code() is None


def test_production_needs_a_private_code(otp_env):
    otp_env.setenv("ENVIRONMENT", "production")
    otp_env.setenv("DEV_OTP_ENABLED", "true")
    assert get_dev_otp_code() is None

    otp_env.setenv("DEV_OTP_CODE", "123456")
    assert get_dev_otp_code() is None

    otp_env.setenv("DEV_OTP_CODE", "481920")
    assert get_dev_otp_code() == "481920"


@pytest.mark.parametrize("bad_code", ["12345", "1234567", "abcdef", "12 456"])
def test_code_must_be_six_digits(otp_env, bad_code):
    otp_env.setenv("DEV_OTP_CODE", bad_code)
    assert get_dev_otp_code() is None


# --- sign-up flow -------------------------------------------------------------

def test_any_number_can_sign_up_with_the_code(otp_env, repo, svc):
    otp_env.setenv("DEV_OTP_CODE", "481920")
    assert svc.request_registration_otp(PHONE, EMAIL, PASSWORD)["success"]

    result = svc.verify_registration_otp(PHONE, "481920")

    assert result["success"] and result["token"]
    assert result["user_id"] == "new-user-id"
    assert repo.get_by_id("new-user-id")["role"] == "patient"


def test_local_format_number_matches_its_pending_sign_up(otp_env, repo, svc):
    svc.request_registration_otp("09201234567", EMAIL, PASSWORD)
    assert svc.verify_registration_otp("+639201234567", "123456")["success"]


def test_wrong_code_is_rejected(otp_env, repo, svc):
    otp_env.setenv("DEV_OTP_CODE", "481920")
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    with pytest.raises(HTTPException) as exc:
        svc.verify_registration_otp(PHONE, "123456")
    assert exc.value.status_code == 400
    svc.client.auth.admin.create_user.assert_not_called()


def test_signup_closed_when_disabled(otp_env, repo, svc):
    otp_env.setenv("DEV_OTP_ENABLED", "false")
    for call in (
        lambda: svc.request_registration_otp(PHONE, EMAIL, PASSWORD),
        lambda: svc.verify_registration_otp(PHONE, "123456"),
    ):
        with pytest.raises(HTTPException) as exc:
            call()
        assert exc.value.status_code == 403


def test_code_cannot_log_into_an_existing_account(otp_env, repo, svc):
    """The old flow returned a token for any existing profile when given 123456 and its phone."""
    repo.create({"id": "victim-id", "phone": PHONE, "email": "victim@example.com", "role": "patient"})

    with pytest.raises(HTTPException) as exc:
        svc.verify_registration_otp(PHONE, "123456")
    assert exc.value.status_code == 400


def test_code_cannot_complete_another_numbers_sign_up(otp_env, repo, svc):
    """The old flow matched pending sign-ups by digit substrings, so '9201' could claim this one."""
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    for other in ("9201", "+639201234568"):
        with pytest.raises(HTTPException) as exc:
            svc.verify_registration_otp(other, "123456")
        assert exc.value.status_code == 400
    svc.client.auth.admin.create_user.assert_not_called()


def test_expired_pending_sign_up_is_rejected(otp_env, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    svc._pending_registrations[PHONE]["expires_at"] = (utc_now() - timedelta(seconds=1)).isoformat()

    with pytest.raises(HTTPException) as exc:
        svc.verify_registration_otp(PHONE, "123456")
    assert exc.value.status_code == 400
    assert PHONE not in svc._pending_registrations


def test_existing_account_password_is_never_reset(otp_env, repo, svc):
    """If Supabase says the user exists and a profile matches, the sign-up must fail, not take it over."""
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    repo.create({"id": "victim-id", "phone": PHONE, "email": EMAIL, "role": "patient"})
    svc.client.auth.admin.create_user.side_effect = Exception("User already registered")

    with pytest.raises(HTTPException) as exc:
        svc.verify_registration_otp(PHONE, "123456")
    assert exc.value.status_code == 400
    svc.client.auth.admin.update_user_by_id.assert_not_called()
