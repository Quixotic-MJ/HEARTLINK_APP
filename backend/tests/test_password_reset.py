"""Forgot password on the phone: a 6-digit code emailed to the account, then the code and a new password."""
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services import auth_service, email_service
from app.services.auth_service import (
    RESET_EMAIL_FAILED_DETAIL,
    RESET_EXPIRED_DETAIL,
    RESET_SENT_MESSAGE,
    RESET_TOO_MANY_TRIES_DETAIL,
    RESET_UNAVAILABLE_DETAIL,
    SupabaseAuthService,
)
from app.utils.time import utc_now

USER_ID = "11111111-1111-1111-1111-111111111111"
EMAIL = "patient@example.com"
PHONE = "+639201234567"
NEW_PASSWORD = "A-brand-new-password-2026!"

GMAIL = {
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "heartlink.app@gmail.com",
    "SMTP_PASSWORD": "abcd efgh ijkl mnop",
    "MAIL_FROM": "heartlink.app@gmail.com",
}


class FakeProfileRepo:
    def __init__(self):
        self.profiles = [
            {"id": USER_ID, "email": EMAIL, "phone": PHONE, "role": "patient", "account_status": "active"},
        ]

    def get_by_identifier(self, identifier):
        return next((p for p in self.profiles if identifier in (p.get("phone"), p.get("email"))), None)


class FakeResetRepo:
    def __init__(self):
        self.rows = {}

    def save(self, user_id, code_hash, expires_at):
        self.rows[user_id] = {"user_id": user_id, "code_hash": code_hash, "attempts": 0, "expires_at": expires_at}

    def get(self, user_id):
        row = self.rows.get(user_id)
        return dict(row) if row else None

    def claim_attempt(self, user_id, seen_attempts):
        row = self.rows.get(user_id)
        if not row or row["attempts"] != seen_attempts:
            return False
        row["attempts"] += 1
        return True

    def consume_code(self, user_id, code_hash):
        row = self.rows.get(user_id)
        if not row or row["code_hash"] != code_hash:
            return False
        row["code_hash"] = None
        return True

    def restore_code(self, user_id, code_hash):
        row = self.rows.get(user_id)
        if row and row["code_hash"] is None:
            row["code_hash"] = code_hash

    def delete(self, user_id):
        self.rows.pop(user_id, None)

    def delete_expired(self):
        pass


class Outbox:
    def __init__(self):
        self.sent = []
        self.fail = False

    def __call__(self, to_email, code, minutes):
        if self.fail:
            raise email_service.EmailSendError("SMTPAuthenticationError")
        self.sent.append({"to": to_email, "code": code, "minutes": minutes})

    @property
    def last_code(self):
        return self.sent[-1]["code"]


class FakeRefreshRepo:
    def __init__(self):
        self.revoked = []

    def revoke_all_for_user(self, user_id, reason):
        self.revoked.append((user_id, reason))


@pytest.fixture
def outbox(monkeypatch):
    for name in ("ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE", "BREVO_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    for name, value in GMAIL.items():
        monkeypatch.setenv(name, value)
    box = Outbox()
    monkeypatch.setattr(email_service, "send_reset_code", box)
    return box


@pytest.fixture
def profiles(monkeypatch):
    fake = FakeProfileRepo()
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: fake)
    return fake


@pytest.fixture
def sessions(monkeypatch):
    fake = FakeRefreshRepo()
    monkeypatch.setattr(auth_service, "get_refresh_token_repo", lambda: fake)
    return fake


@pytest.fixture
def resets():
    return FakeResetRepo()


@pytest.fixture
def svc(resets, profiles, sessions):
    return SupabaseAuthService(MagicMock(), reset_repo=resets)


def wrong(code):
    return f"{(int(code) + 1) % 1_000_000:06d}"


def reset_fails(svc, code, identifier=EMAIL):
    with pytest.raises(HTTPException) as exc:
        svc.reset_password(identifier, code, NEW_PASSWORD)
    return exc.value


# --- sending the code ------------------------------------------------------------------------------------------

def test_code_is_emailed_to_the_account_by_email_or_any_phone_format(outbox, svc):
    for identifier in (EMAIL, "PATIENT@example.com", PHONE, "09201234567", "9201234567"):
        assert svc.request_password_reset(identifier) == {"success": True, "message": RESET_SENT_MESSAGE}
    assert [m["to"] for m in outbox.sent] == [EMAIL] * 5
    assert all(len(m["code"]) == 6 and m["code"].isdigit() and m["minutes"] == 10 for m in outbox.sent)


def test_unknown_accounts_get_the_same_answer_and_no_email(outbox, svc, resets):
    assert svc.request_password_reset("nobody@example.com") == {"success": True, "message": RESET_SENT_MESSAGE}
    assert outbox.sent == [] and resets.rows == {}


def test_staff_and_inactive_accounts_get_no_code(outbox, svc, profiles):
    profiles.profiles[0]["role"] = "doctor"
    svc.request_password_reset(EMAIL)
    profiles.profiles[0].update(role="patient", account_status="archived")
    svc.request_password_reset(EMAIL)
    assert outbox.sent == []


def test_only_a_hash_of_the_code_is_kept(outbox, svc, resets):
    svc.request_password_reset(EMAIL)
    row = resets.rows[USER_ID]
    assert outbox.last_code not in row["code_hash"]


def test_failed_email_says_so_and_leaves_no_code(outbox, svc, resets):
    outbox.fail = True
    with pytest.raises(HTTPException) as exc:
        svc.request_password_reset(EMAIL)
    assert exc.value.status_code == 503 and exc.value.detail == RESET_EMAIL_FAILED_DETAIL
    assert resets.rows == {}


def test_without_email_in_production_reset_is_unavailable(monkeypatch, svc):
    for name in ("BREVO_API_KEY", *GMAIL):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(HTTPException) as exc:
        svc.request_password_reset(EMAIL)
    assert exc.value.status_code == 503 and exc.value.detail == RESET_UNAVAILABLE_DETAIL


def test_without_email_locally_the_dev_code_works(monkeypatch, svc):
    for name in ("BREVO_API_KEY", "ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE", *GMAIL):
        monkeypatch.delenv(name, raising=False)
    svc.request_password_reset(EMAIL)
    assert svc.reset_password(EMAIL, "123456", NEW_PASSWORD)["success"] is True


# --- setting the new password ----------------------------------------------------------------------------------

def test_right_code_changes_the_password_and_logs_out_every_device(outbox, svc, resets, sessions):
    svc.request_password_reset(PHONE)
    result = svc.reset_password("0920 123 4567", outbox.last_code, NEW_PASSWORD)

    assert result["success"] is True
    svc.client.auth.admin.update_user_by_id.assert_called_once_with(USER_ID, {"password": NEW_PASSWORD})
    assert sessions.revoked == [(USER_ID, "password_reset")]
    assert resets.rows == {}


def test_code_works_only_once(outbox, svc):
    svc.request_password_reset(EMAIL)
    code = outbox.last_code
    svc.reset_password(EMAIL, code, NEW_PASSWORD)
    err = reset_fails(svc, code)
    assert err.status_code == 400 and err.detail == RESET_EXPIRED_DETAIL


def test_a_new_code_replaces_the_old_one(outbox, svc):
    svc.request_password_reset(EMAIL)
    old = outbox.last_code
    svc.request_password_reset(EMAIL)
    if old != outbox.last_code:
        assert "isn't right" in reset_fails(svc, old).detail
    assert svc.reset_password(EMAIL, outbox.last_code, NEW_PASSWORD)["success"] is True


def test_wrong_codes_count_down_then_lock(outbox, svc, resets):
    svc.request_password_reset(EMAIL)
    code = outbox.last_code
    for left in (4, 3, 2, 1):
        assert reset_fails(svc, wrong(code)).detail.endswith(f"{left} {'try' if left == 1 else 'tries'} left.")
    assert reset_fails(svc, wrong(code)).detail == RESET_TOO_MANY_TRIES_DETAIL
    assert resets.rows == {}
    # The right code no longer works either
    assert reset_fails(svc, code).detail == RESET_EXPIRED_DETAIL
    svc.client.auth.admin.update_user_by_id.assert_not_called()


def test_expired_code_is_refused(outbox, svc, resets):
    svc.request_password_reset(EMAIL)
    resets.rows[USER_ID]["expires_at"] = (utc_now() - timedelta(seconds=1)).isoformat()
    assert reset_fails(svc, outbox.last_code).detail == RESET_EXPIRED_DETAIL


def test_code_for_one_account_never_resets_another(outbox, svc, profiles):
    profiles.profiles.append(
        {"id": "22222222-2222-2222-2222-222222222222", "email": "other@example.com", "phone": "+639209999999",
         "role": "patient", "account_status": "active"}
    )
    svc.request_password_reset(EMAIL)
    assert reset_fails(svc, outbox.last_code, identifier="other@example.com").detail == RESET_EXPIRED_DETAIL


def test_if_the_password_change_fails_the_same_code_works_again(outbox, svc, sessions):
    svc.request_password_reset(EMAIL)
    code = outbox.last_code
    svc.client.auth.admin.update_user_by_id.side_effect = RuntimeError("Auth is down")
    assert reset_fails(svc, code).status_code == 503
    assert sessions.revoked == []

    svc.client.auth.admin.update_user_by_id.side_effect = None
    assert svc.reset_password(EMAIL, code, NEW_PASSWORD)["success"] is True


# --- the API ---------------------------------------------------------------------------------------------------

client = TestClient(app)


@patch("app.api.auth.auth.get_auth_service")
def test_api_routes_reach_the_service(mock_svc):
    mock_svc.return_value.request_password_reset.return_value = {"success": True, "message": RESET_SENT_MESSAGE}
    mock_svc.return_value.reset_password.return_value = {"success": True, "message": "Password changed."}

    res = client.post("/api/auth/password-reset/request", json={"identifier": EMAIL})
    assert res.status_code == 200
    mock_svc.return_value.request_password_reset.assert_called_once_with(identifier=EMAIL)

    res = client.post("/api/auth/password-reset/confirm",
                      json={"identifier": EMAIL, "code": "123456", "new_password": NEW_PASSWORD})
    assert res.status_code == 200
    mock_svc.return_value.reset_password.assert_called_once_with(
        identifier=EMAIL, code="123456", new_password=NEW_PASSWORD
    )


@patch("app.api.auth.auth.get_auth_service")
def test_api_refuses_a_weak_password_or_a_bad_code(mock_svc):
    for body in (
        {"identifier": EMAIL, "code": "123456", "new_password": "short1!"},
        {"identifier": EMAIL, "code": "12345", "new_password": NEW_PASSWORD},
        {"identifier": EMAIL, "code": "abcdef", "new_password": NEW_PASSWORD},
    ):
        assert client.post("/api/auth/password-reset/confirm", json=body).status_code == 422
    mock_svc.return_value.reset_password.assert_not_called()


def test_reset_email_says_reset_not_sign_up():
    msg = email_service._signup_code_message("s@example.com", EMAIL, "123456", 10, "reset")
    text = email_service._part(msg, "plain")
    html = email_service._part(msg, "html")
    assert "password reset code" in text and "sign-up" not in text
    assert "Your password reset code" in html and "sign-up" not in html
