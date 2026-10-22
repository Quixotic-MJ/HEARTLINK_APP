"""HL-046: pending sign-ups are kept in the database, with only a bcrypt hash of the password."""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

import bcrypt
import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest
from app.services import auth_service
from app.services.auth_service import SupabaseAuthService
from app.utils.time import parse_utc, utc_now

PHONE = "+639201234567"
EMAIL = "new.user@example.com"
PASSWORD = "a-strong-password-1!"
CODE = "123456"


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


@pytest.fixture
def repo(monkeypatch):
    for name in ("ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE"):
        monkeypatch.delenv(name, raising=False)
    fake = FakeProfileRepo()
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: fake)
    return fake


def new_service(pending_repo):
    """A fresh service, as after a backend restart or on another worker. Only the database is shared."""
    client = MagicMock()
    client.auth.admin.list_users.return_value = []
    client.auth.admin.create_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="new-user-id", email=EMAIL, phone="639201234567")
    )
    return SupabaseAuthService(client, pending_repo)


def test_only_a_bcrypt_hash_of_the_password_is_stored(repo, pending_repo):
    new_service(pending_repo).request_registration_otp(PHONE, EMAIL, PASSWORD)

    row = pending_repo.rows[PHONE]
    assert PASSWORD not in str(row)
    assert row["password_hash"].startswith("$2b$10$")
    assert bcrypt.checkpw(PASSWORD.encode(), row["password_hash"].encode())


def test_sign_up_survives_a_restart(repo, pending_repo):
    new_service(pending_repo).request_registration_otp(PHONE, EMAIL, PASSWORD)

    after_restart = new_service(pending_repo)
    assert after_restart.verify_registration_otp(PHONE, CODE)["user_id"] == "new-user-id"
    assert PHONE not in pending_repo.rows


def test_login_is_created_from_the_hash_not_the_password(repo, pending_repo):
    svc = new_service(pending_repo)
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    svc.verify_registration_otp(PHONE, CODE)

    attrs = svc.client.auth.admin.create_user.call_args.args[0]
    assert "password" not in attrs
    assert bcrypt.checkpw(PASSWORD.encode(), attrs["password_hash"].encode())


def test_expired_sign_ups_are_cleaned_up(repo, pending_repo):
    pending_repo.save("+639990000000", "old@example.com", "$2b$10$x", (utc_now() - timedelta(minutes=1)).isoformat(), "old-hash")

    new_service(pending_repo).request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert "+639990000000" not in pending_repo.rows
    assert PHONE in pending_repo.rows


def test_sending_the_code_again_replaces_the_old_sign_up(repo, pending_repo):
    svc = new_service(pending_repo)
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    svc.request_registration_otp(PHONE, "changed@example.com", "another-strong-pass-2!")

    assert len(pending_repo.rows) == 1
    assert pending_repo.rows[PHONE]["email"] == "changed@example.com"


def test_resend_extends_the_expiry(repo, pending_repo):
    svc = new_service(pending_repo)
    svc.request_registration_otp(PHONE, EMAIL, PASSWORD)
    pending_repo.rows[PHONE]["expires_at"] = (utc_now() + timedelta(minutes=1)).isoformat()

    svc.resend_registration_otp(PHONE)
    assert parse_utc(pending_repo.rows[PHONE]["expires_at"]) > utc_now() + timedelta(minutes=9)


def test_passwords_longer_than_72_characters_are_rejected():
    with pytest.raises(ValidationError, match="72 characters or fewer"):
        RegisterRequest(phone=PHONE, email=EMAIL, password="Aa1!" + "x" * 69)
    assert RegisterRequest(phone=PHONE, email=EMAIL, password="Aa1!" + "x" * 68).password
