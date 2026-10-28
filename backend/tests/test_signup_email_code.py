"""HL-052: each sign-up gets its own one-time code by email: hashed, 10 minutes, 5 tries, used once."""
import smtplib
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services import auth_service, email_service
from app.services.auth_service import (
    CODE_EMAIL_FAILED_DETAIL,
    SIGNUP_CLOSED_DETAIL,
    SIGNUP_EXPIRED_DETAIL,
    TOO_MANY_TRIES_DETAIL,
    SupabaseAuthService,
)
from app.utils.time import utc_now

PHONE = "+639201234567"
EMAIL = "new.user@example.com"
PASSWORD = "a-strong-password-1!"

GMAIL = {
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "heartlink.app@gmail.com",
    "SMTP_PASSWORD": "abcd efgh ijkl mnop",
    "MAIL_FROM": "heartlink.app@gmail.com",
}


class FakeProfileRepo:
    def __init__(self):
        self.profiles = []

    def get_by_identifier(self, identifier):
        return next((p for p in self.profiles if identifier in (p.get("phone"), p.get("email"))), None)

    def get_by_id(self, user_id):
        return next((p for p in self.profiles if p["id"] == user_id), None)

    def create(self, profile):
        self.profiles.append(profile)
        return profile


class Outbox:
    """Stands in for send_signup_code and keeps every email it was asked to send."""

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


@pytest.fixture
def outbox(monkeypatch):
    for name in ("ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE", "BREVO_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    for name, value in GMAIL.items():
        monkeypatch.setenv(name, value)
    box = Outbox()
    monkeypatch.setattr(email_service, "send_signup_code", box)
    return box


@pytest.fixture
def repo(monkeypatch):
    fake = FakeProfileRepo()
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: fake)
    return fake


@pytest.fixture
def svc(pending_repo):
    client = MagicMock()
    client.auth.admin.list_users.return_value = []
    client.auth.admin.create_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="new-user-id", email=EMAIL, phone=PHONE)
    )
    return SupabaseAuthService(client, pending_repo)


def wrong(code):
    return f"{(int(code) + 1) % 1_000_000:06d}"


def verify_fails(svc, code, status_code=400):
    with pytest.raises(HTTPException) as exc:
        svc.verify_registration_otp(PHONE, code)
    assert exc.value.status_code == status_code
    return exc.value.detail


# --- sending the code --------------------------------------------------------------------------------

def test_each_sign_up_gets_its_own_emailed_code(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    assert len(outbox.sent) == 1
    sent = outbox.sent[0]
    assert sent["to"] == EMAIL and sent["minutes"] == 10
    assert len(sent["code"]) == 6 and sent["code"].isdigit()


def test_codes_are_random(outbox, repo, svc):
    for _ in range(5):
        svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert len({m["code"] for m in outbox.sent}) > 1


def test_only_a_hash_of_the_code_is_stored(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    row = svc.pending.rows[PHONE]
    assert outbox.last_code not in str(row)
    assert row["code_hash"] and row["attempts"] == 0


def test_email_failure_gives_a_clear_error(outbox, repo, svc):
    outbox.fail = True

    with pytest.raises(HTTPException) as exc:
        svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert exc.value.status_code == 503
    assert exc.value.detail == CODE_EMAIL_FAILED_DETAIL
    assert PHONE not in svc.pending.rows


# --- checking the code -------------------------------------------------------------------------------

def test_right_code_creates_the_account(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    result = svc.verify_registration_otp(PHONE, outbox.last_code)

    assert result["success"] and result["token"] and result["user_id"] == "new-user-id"
    assert repo.get_by_id("new-user-id")["role"] == "patient"
    assert PHONE not in svc.pending.rows


def test_wrong_code_is_rejected_and_counted(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    detail = verify_fails(svc, wrong(outbox.last_code))

    assert detail == "That code isn't right. You have 4 tries left."
    assert svc.pending.rows[PHONE]["attempts"] == 1
    svc.client.auth.admin.create_user.assert_not_called()


def test_shared_dev_code_does_not_work_when_codes_are_emailed(outbox, repo, svc, monkeypatch):
    monkeypatch.setattr(auth_service, "_new_signup_code", lambda: "654321")
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)

    verify_fails(svc, "123456")
    assert svc.verify_registration_otp(PHONE, "654321")["success"]


def test_expired_code_is_rejected(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    svc.pending.rows[PHONE]["expires_at"] = (utc_now() - timedelta(seconds=1)).isoformat()

    assert verify_fails(svc, outbox.last_code) == SIGNUP_EXPIRED_DETAIL
    assert PHONE not in svc.pending.rows
    svc.client.auth.admin.create_user.assert_not_called()


def test_code_locks_after_five_tries(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    code = outbox.last_code

    for _ in range(4):
        verify_fails(svc, wrong(code))
    assert verify_fails(svc, wrong(code)) == TOO_MANY_TRIES_DETAIL
    assert PHONE not in svc.pending.rows

    # Even the right code no longer works
    verify_fails(svc, code)
    svc.client.auth.admin.create_user.assert_not_called()


def test_code_can_only_be_used_once(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    code = outbox.last_code
    svc.verify_registration_otp(PHONE, code)

    verify_fails(svc, code)
    assert svc.client.auth.admin.create_user.call_count == 1


def test_code_being_used_by_another_request_cannot_be_used_again(outbox, repo, svc):
    """Two taps at once: the first request has already taken the code."""
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    svc.pending.rows[PHONE]["code_hash"] = None

    verify_fails(svc, outbox.last_code)
    svc.client.auth.admin.create_user.assert_not_called()


def test_code_works_for_a_retry_after_a_timeout(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    svc.client.auth.admin.create_user.side_effect = Exception("Request timed out")
    verify_fails(svc, outbox.last_code, 503)

    svc.client.auth.admin.create_user.side_effect = None
    assert svc.verify_registration_otp(PHONE, outbox.last_code)["user_id"] == "new-user-id"


# --- resending ---------------------------------------------------------------------------------------

def test_resend_replaces_the_old_code(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    old_code = outbox.last_code
    verify_fails(svc, wrong(old_code))

    svc.resend_registration_otp(PHONE)
    new_code = outbox.last_code
    assert len(outbox.sent) == 2 and outbox.sent[1]["to"] == EMAIL
    assert svc.pending.rows[PHONE]["attempts"] == 0

    if old_code != new_code:
        verify_fails(svc, old_code)
    assert svc.verify_registration_otp(PHONE, new_code)["success"]


def test_resend_without_a_pending_sign_up_is_rejected(outbox, repo, svc):
    with pytest.raises(HTTPException) as exc:
        svc.resend_registration_otp(PHONE)
    assert exc.value.status_code == 400
    assert outbox.sent == []


def test_resend_email_failure_gives_a_clear_error(outbox, repo, svc):
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    outbox.fail = True

    with pytest.raises(HTTPException) as exc:
        svc.resend_registration_otp(PHONE)
    assert exc.value.status_code == 503
    assert exc.value.detail == CODE_EMAIL_FAILED_DETAIL


# --- without email set up ----------------------------------------------------------------------------

def test_without_email_the_dev_code_works_outside_production(outbox, repo, svc, monkeypatch):
    for name in GMAIL:
        monkeypatch.delenv(name)

    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert outbox.sent == []
    assert svc.verify_registration_otp(PHONE, "123456")["success"]


def test_without_email_production_sign_up_stays_closed(outbox, repo, svc, monkeypatch):
    for name in GMAIL:
        monkeypatch.delenv(name)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEV_OTP_ENABLED", "true")
    monkeypatch.setenv("DEV_OTP_CODE", "481920")

    with pytest.raises(HTTPException) as exc:
        svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert exc.value.status_code == 403 and exc.value.detail == SIGNUP_CLOSED_DETAIL


def test_production_with_email_sends_real_codes(outbox, repo, svc, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")

    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert svc.verify_registration_otp(PHONE, outbox.last_code)["success"]


# --- the email itself (SMTP) -------------------------------------------------------------------------

class FakeSMTP:
    instances = []
    fail_login = False

    def __init__(self, host, port, timeout=None):
        self.host, self.port, self.timeout = host, port, timeout
        self.calls = []
        FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        self.calls.append("starttls")

    def login(self, user, password):
        if FakeSMTP.fail_login:
            raise smtplib.SMTPAuthenticationError(535, b"Username and Password not accepted")
        self.calls.append(("login", user, password))

    def send_message(self, msg):
        self.calls.append(("send", msg))


@pytest.fixture
def fake_smtp(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY", raising=False)
    for name, value in GMAIL.items():
        monkeypatch.setenv(name, value)
    FakeSMTP.instances = []
    FakeSMTP.fail_login = False
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)
    return FakeSMTP


def test_gmail_is_sent_over_starttls_with_the_app_password(fake_smtp):
    email_service.send_signup_code(EMAIL, "482913", 10)

    smtp = fake_smtp.instances[0]
    assert (smtp.host, smtp.port) == ("smtp.gmail.com", 587)
    assert smtp.calls[0] == "starttls"
    assert smtp.calls[1] == ("login", "heartlink.app@gmail.com", "abcdefghijklmnop")

    msg = smtp.calls[2][1]
    body = msg.get_body(preferencelist=("plain",)).get_content()  # the plain-text copy beside the designed one
    assert msg["To"] == EMAIL and "heartlink.app@gmail.com" in msg["From"]
    assert "482913" in body
    assert "expires in 10 minutes" in body
    assert "didn't try to sign up" in body


def test_smtp_failure_raises_a_send_error(fake_smtp):
    fake_smtp.fail_login = True
    with pytest.raises(email_service.EmailSendError):
        email_service.send_signup_code(EMAIL, "482913", 10)


def test_email_is_off_until_every_setting_is_there(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY", raising=False)
    for name, value in GMAIL.items():
        monkeypatch.setenv(name, value)
    assert email_service.is_email_configured()

    monkeypatch.delenv("SMTP_PASSWORD")
    assert not email_service.is_email_configured()
    with pytest.raises(email_service.EmailSendError):
        email_service.send_signup_code(EMAIL, "482913", 10)


# --- the email itself (Brevo, for hosts that block SMTP) ---------------------------------------------

class FakeResponse:
    def __init__(self, status_code, text=""):
        self.status_code, self.text = status_code, text


@pytest.fixture
def brevo(monkeypatch):
    for name in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setenv("MAIL_FROM", "heartlink.app@gmail.com")
    calls = []
    reply = {"response": FakeResponse(201)}

    def fake_post(url, json=None, headers=None, timeout=None):
        calls.append({"url": url, "json": json, "headers": headers})
        return reply["response"]

    monkeypatch.setattr(email_service.httpx, "post", fake_post)
    return calls, reply


def test_brevo_alone_turns_email_on(brevo):
    assert email_service.is_email_configured()


def test_brevo_sends_the_code_over_https(brevo):
    calls, _ = brevo
    email_service.send_signup_code(EMAIL, "482913", 10)

    call = calls[0]
    assert call["url"] == "https://api.brevo.com/v3/smtp/email"
    assert call["headers"]["api-key"] == "xkeysib-test"
    assert call["json"]["sender"]["email"] == "heartlink.app@gmail.com"
    assert call["json"]["to"] == [{"email": EMAIL}]
    assert "482913" in call["json"]["subject"] and "482913" in call["json"]["textContent"]


def test_brevo_refusal_raises_a_send_error(brevo):
    _, reply = brevo
    reply["response"] = FakeResponse(401, '{"code":"unauthorized"}')
    with pytest.raises(email_service.EmailSendError):
        email_service.send_signup_code(EMAIL, "482913", 10)
