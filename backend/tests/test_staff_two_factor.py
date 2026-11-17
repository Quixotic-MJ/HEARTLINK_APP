"""Two-factor sign-in for the web portal: after the password, a 6-digit code is emailed to the staff account."""
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import HTTPException

from app.services import auth_service, email_service
from app.services.auth_service import (
    STAFF_CODE_EMAIL_FAILED_DETAIL,
    STAFF_CODE_EXPIRED_DETAIL,
    STAFF_CODE_NO_EMAIL_DETAIL,
    STAFF_CODE_TOO_MANY_TRIES_DETAIL,
    STAFF_CODE_UNAVAILABLE_DETAIL,
    SupabaseAuthService,
)
from app.utils.security import verify_token
from tests.test_password_reset import GMAIL, FakeResetRepo, Outbox, wrong

STAFF_ID = "22222222-2222-2222-2222-222222222222"
STAFF_EMAIL = "dietitian@example.com"


class FakeProfileRepo:
    def __init__(self):
        self.profile = {
            "id": STAFF_ID, "email": STAFF_EMAIL, "phone": "+639201111111", "role": "medical_expert",
            "expert_type": "Dietitian", "first_name": "Ana", "last_name": "Cruz", "account_status": "active",
            "must_change_password": False,
        }

    def get_by_id(self, user_id):
        return dict(self.profile) if user_id == STAFF_ID else None


@pytest.fixture
def outbox(monkeypatch):
    for name in ("ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE", "BREVO_API_KEY", "STAFF_2FA_ENABLED"):
        monkeypatch.delenv(name, raising=False)
    for name, value in GMAIL.items():
        monkeypatch.setenv(name, value)
    box = Outbox()
    monkeypatch.setattr(email_service, "send_staff_login_code", box)
    return box


@pytest.fixture
def profiles(monkeypatch):
    fake = FakeProfileRepo()
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: fake)
    return fake


@pytest.fixture
def resets():
    return FakeResetRepo()


@pytest.fixture
def svc(resets, profiles, monkeypatch):
    service = SupabaseAuthService(MagicMock(), reset_repo=resets)
    # The password check itself is tested elsewhere; here it always passes
    monkeypatch.setattr(service, "login", lambda identifier, password: {"user_id": STAFF_ID, "token": "password-token"})
    return service


def sign_in(svc):
    return svc.web_login(STAFF_EMAIL, "right-password")


def verify_fails(svc, token, code):
    with pytest.raises(HTTPException) as exc:
        svc.verify_2fa(token, code)
    return exc.value


# --- the password step -------------------------------------------------------------------------------------------

def test_the_right_password_only_sends_a_code(outbox, svc):
    res = sign_in(svc)
    assert res["requires_2fa"] is True and res["token_2fa"]
    assert res["email_hint"] == "d***@example.com"
    # No login token and nothing about the account before the code
    assert "token" not in res and "role" not in res and "user_id" not in res
    assert outbox.sent == [{"to": STAFF_EMAIL, "code": outbox.last_code, "minutes": 10}]


def test_only_a_hash_of_the_code_is_kept_and_it_cannot_reset_a_password(outbox, svc, resets):
    sign_in(svc)
    row = resets.rows[STAFF_ID]
    assert outbox.last_code not in row["code_hash"]
    assert row["code_hash"] != auth_service._hash_reset_code(STAFF_ID, outbox.last_code)


def test_the_waiting_token_is_never_a_login_token(outbox, svc):
    token = sign_in(svc)["token_2fa"]
    with pytest.raises(HTTPException) as exc:
        verify_token(token)
    assert exc.value.status_code == 401


def test_an_account_without_email_gets_no_code(outbox, svc, profiles):
    profiles.profile["email"] = ""
    with pytest.raises(HTTPException) as exc:
        sign_in(svc)
    assert exc.value.status_code == 403 and exc.value.detail == STAFF_CODE_NO_EMAIL_DETAIL


def test_a_failed_email_says_so_and_leaves_no_code(outbox, svc, resets):
    outbox.fail = True
    with pytest.raises(HTTPException) as exc:
        sign_in(svc)
    assert exc.value.status_code == 503 and exc.value.detail == STAFF_CODE_EMAIL_FAILED_DETAIL
    assert resets.rows == {}


def test_without_email_in_production_sign_in_codes_are_unavailable(monkeypatch, svc):
    for name in ("BREVO_API_KEY", "STAFF_2FA_ENABLED", *GMAIL):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(HTTPException) as exc:
        sign_in(svc)
    assert exc.value.status_code == 503 and exc.value.detail == STAFF_CODE_UNAVAILABLE_DETAIL


def test_without_email_locally_the_dev_code_works(monkeypatch, svc):
    for name in ("BREVO_API_KEY", "ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE", "STAFF_2FA_ENABLED", *GMAIL):
        monkeypatch.delenv(name, raising=False)
    token = sign_in(svc)["token_2fa"]
    assert svc.verify_2fa(token, "123456")["success"] is True


def test_the_emergency_switch_turns_codes_off(outbox, svc, monkeypatch):
    monkeypatch.setenv("STAFF_2FA_ENABLED", "false")
    res = sign_in(svc)
    assert res["requires_2fa"] is False and res["token"] == "password-token" and res["role"] == "medical_expert"
    assert outbox.sent == []


# --- the code step -----------------------------------------------------------------------------------------------

def test_the_right_code_signs_in_once(outbox, svc, resets):
    token = sign_in(svc)["token_2fa"]
    res = svc.verify_2fa(token, outbox.last_code)
    assert res["success"] is True and res["user_id"] == STAFF_ID and res["role"] == "medical_expert"
    assert res["expert_type"] == "Dietitian" and res["first_name"] == "Ana"
    assert verify_token(res["token"])["user_id"] == STAFF_ID
    assert resets.rows == {}
    assert verify_fails(svc, token, outbox.last_code).detail == STAFF_CODE_EXPIRED_DETAIL


def test_a_wrong_code_counts_down_then_locks(outbox, svc, resets):
    token = sign_in(svc)["token_2fa"]
    code = outbox.last_code
    for tries_left in (4, 3, 2, 1):
        assert verify_fails(svc, token, wrong(code)).detail.endswith(f"{tries_left} {'try' if tries_left == 1 else 'tries'} left.")
    assert verify_fails(svc, token, wrong(code)).detail == STAFF_CODE_TOO_MANY_TRIES_DETAIL
    assert resets.rows == {}
    assert verify_fails(svc, token, code).detail == STAFF_CODE_EXPIRED_DETAIL


def test_signing_in_again_replaces_the_old_code(outbox, svc):
    first_token = sign_in(svc)["token_2fa"]
    old_code = outbox.last_code
    sign_in(svc)
    if outbox.last_code != old_code:
        assert verify_fails(svc, first_token, old_code).status_code == 400
    assert svc.verify_2fa(first_token, outbox.last_code)["success"] is True


def test_an_expired_code_does_not_work(outbox, svc, resets):
    token = sign_in(svc)["token_2fa"]
    resets.rows[STAFF_ID]["expires_at"] = "2000-01-01T00:00:00+00:00"
    assert verify_fails(svc, token, outbox.last_code).detail == STAFF_CODE_EXPIRED_DETAIL


def test_a_forged_or_expired_waiting_token_does_not_work(outbox, svc):
    sign_in(svc)
    forged = jwt.encode({"user_id": STAFF_ID, "typ": "staff_2fa", "exp": 9999999999}, "not-the-key", algorithm="HS256")
    assert verify_fails(svc, forged, outbox.last_code).detail == STAFF_CODE_EXPIRED_DETAIL
    expired = jwt.encode({"user_id": STAFF_ID, "typ": "staff_2fa", "exp": 1}, auth_service._staff_token_key(), algorithm="HS256")
    assert verify_fails(svc, expired, outbox.last_code).detail == STAFF_CODE_EXPIRED_DETAIL
    assert verify_fails(svc, "", outbox.last_code).detail == STAFF_CODE_EXPIRED_DETAIL


def test_an_account_disabled_after_the_password_cannot_finish(outbox, svc, profiles):
    token = sign_in(svc)["token_2fa"]
    profiles.profile["account_status"] = "deactivated"
    assert verify_fails(svc, token, outbox.last_code).detail == STAFF_CODE_EXPIRED_DETAIL
