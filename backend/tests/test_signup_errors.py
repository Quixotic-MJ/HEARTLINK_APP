"""HL-051: sign-up never invents user ids, and never leaves a login without a profile."""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

import bcrypt
import pytest
from fastapi import HTTPException

from app.services import auth_service
from app.services.auth_service import (
    ALREADY_REGISTERED_DETAIL,
    AUTH_USERS_PAGE_SIZE,
    SIGNUP_RETRY_DETAIL,
    SupabaseAuthService,
)
from app.utils.time import utc_now

PHONE = "+639201234567"
EMAIL = "new.user@example.com"
PASSWORD = "a-strong-password-1!"
CODE = "123456"


class FakeProfileRepo:
    def __init__(self):
        self.profiles = []
        self.fail_with = None

    def get_by_identifier(self, identifier):
        return next((p for p in self.profiles if identifier in (p.get("phone"), p.get("email"))), None)

    def get_by_id(self, user_id):
        return next((p for p in self.profiles if p["id"] == user_id), None)

    def create(self, profile):
        if self.fail_with:
            raise self.fail_with
        self.profiles.append(profile)
        return profile


def login(uid, email=EMAIL, phone="639201234567", age=timedelta(minutes=2)):
    return SimpleNamespace(id=uid, email=email, phone=phone, created_at=(utc_now() - age).isoformat())


@pytest.fixture
def repo(monkeypatch):
    for name in ("ENVIRONMENT", "DEV_OTP_ENABLED", "DEV_OTP_CODE"):
        monkeypatch.delenv(name, raising=False)
    fake = FakeProfileRepo()
    monkeypatch.setattr(auth_service, "get_profile_repo", lambda: fake)
    return fake


@pytest.fixture
def svc(pending_repo):
    client = MagicMock()
    client.auth.admin.list_users.return_value = []
    client.auth.admin.create_user.return_value = SimpleNamespace(user=login("new-user-id"))
    service = SupabaseAuthService(client, pending_repo)
    service.request_registration_otp(PHONE, EMAIL, PASSWORD)
    return service


def verify_fails(svc, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        svc.verify_registration_otp(PHONE, CODE)
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


# --- the login already exists ------------------------------------------------------------------------

def test_half_finished_sign_up_is_redone_with_a_real_login(repo, svc):
    """The first try created the login, then timed out. The retry replaces it with a real login, not a made-up id."""
    svc.client.auth.admin.create_user.side_effect = [
        Exception("A user with this email address has already been registered"),
        SimpleNamespace(user=login("fresh-login-id")),
    ]
    svc.client.auth.admin.list_users.return_value = [login("half-made-id")]

    result = svc.verify_registration_otp(PHONE, CODE)

    svc.client.auth.admin.delete_user.assert_called_once_with("half-made-id")
    assert result["user_id"] == "fresh-login-id"
    assert [p["id"] for p in repo.profiles] == ["fresh-login-id"]
    attrs = svc.client.auth.admin.create_user.call_args.args[0]
    assert "password" not in attrs and bcrypt.checkpw(PASSWORD.encode(), attrs["password_hash"].encode())
    svc.client.auth.admin.update_user_by_id.assert_not_called()


def test_half_finished_sign_up_that_cannot_be_redone_can_be_retried(repo, svc):
    svc.client.auth.admin.create_user.side_effect = [Exception("User already registered"), Exception("Request timed out")]
    svc.client.auth.admin.list_users.return_value = [login("half-made-id")]

    verify_fails(svc, 503, SIGNUP_RETRY_DETAIL)
    assert PHONE in svc.pending.rows and repo.profiles == []


@pytest.mark.parametrize("existing", [
    login("old-login-id", age=timedelta(days=3)),                    # someone's real account
    login("other-login-id", email="someone.else@example.com"),       # same phone, different email
    None,                                                            # Supabase says duplicate, but no login found
])
def test_existing_login_is_never_taken_over(repo, svc, existing):
    svc.client.auth.admin.create_user.side_effect = Exception("User already registered")
    svc.client.auth.admin.list_users.return_value = [existing] if existing else []

    verify_fails(svc, 400, ALREADY_REGISTERED_DETAIL)

    assert repo.profiles == []
    svc.client.auth.admin.update_user_by_id.assert_not_called()
    assert PHONE not in svc.pending.rows


# --- creating the login fails ------------------------------------------------------------------------

def test_timeout_fails_cleanly_and_can_be_retried(repo, svc):
    svc.client.auth.admin.create_user.side_effect = Exception("Request timed out")

    verify_fails(svc, 503, SIGNUP_RETRY_DETAIL)
    assert repo.profiles == []
    assert PHONE in svc.pending.rows          # the same code still works for the retry

    svc.client.auth.admin.create_user.side_effect = None
    assert svc.verify_registration_otp(PHONE, CODE)["user_id"] == "new-user-id"


def test_other_login_errors_fail_without_a_profile(repo, svc):
    svc.client.auth.admin.create_user.side_effect = Exception("Password should be at least 6 characters")

    verify_fails(svc, 400, SIGNUP_RETRY_DETAIL)
    assert repo.profiles == []


# --- creating the profile fails ----------------------------------------------------------------------

def test_profile_failure_removes_the_new_login(repo, svc):
    repo.fail_with = HTTPException(status_code=503, detail="Database service temporarily unavailable.")

    verify_fails(svc, 503, SIGNUP_RETRY_DETAIL)
    svc.client.auth.admin.delete_user.assert_called_once_with("new-user-id")
    assert PHONE in svc.pending.rows


def test_profile_taken_by_another_account_is_rejected(repo, svc):
    repo.fail_with = HTTPException(status_code=409, detail="A resource with these details already exists.")

    verify_fails(svc, 400, ALREADY_REGISTERED_DETAIL)
    svc.client.auth.admin.delete_user.assert_called_once_with("new-user-id")


def test_duplicate_profile_for_the_same_login_is_fine(repo, svc):
    """Two taps at once: the other request saved this login's profile first, so ours hits a duplicate."""
    def create_raced(profile):
        repo.profiles.append(profile)
        raise HTTPException(status_code=409, detail="A resource with these details already exists.")
    repo.create = create_raced

    assert svc.verify_registration_otp(PHONE, CODE)["user_id"] == "new-user-id"
    svc.client.auth.admin.delete_user.assert_not_called()


# --- the login lookup reads every page ---------------------------------------------------------------

def test_existing_login_on_a_later_page_blocks_sign_up(repo, pending_repo):
    first_page = [login(f"user-{i}", email=f"u{i}@example.com", phone=f"63900000{i:04d}") for i in range(AUTH_USERS_PAGE_SIZE)]
    client = MagicMock()
    client.auth.admin.list_users.side_effect = lambda page, per_page: first_page if page == 1 else [login("match")]

    with pytest.raises(HTTPException) as exc:
        SupabaseAuthService(client, pending_repo).request_registration_otp(PHONE, EMAIL, PASSWORD)
    assert exc.value.status_code == 400
    assert "email address is already registered" in exc.value.detail
