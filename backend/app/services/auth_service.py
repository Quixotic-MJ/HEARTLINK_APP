# backend/app/services/auth_service.py
"""
HeartLink Authentication Service.
Provides a unified interface for Supabase Auth and Mock Auth.
Handles user registration, OTP verification, login, 2FA, password change, recovery, and identity deletion.
"""
import os
import re
import hashlib
import hmac
import bcrypt
import jwt
import secrets
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

from app.db.client import get_supabase_client
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.utils.security import create_access_token
from app.utils.phone import normalize_e164
from app.db.repositories import (
    get_profile_repo, get_pending_registration_repo, get_password_reset_repo, get_refresh_token_repo,
)
from app.services import email_service


LOCAL_DEV_OTP_CODE = "123456"


def get_dev_otp_code() -> Optional[str]:
    """
    HL-045 / HL-052: Returns the shared development sign-up code while it is switched on, else None.

    It is only used when email isn't set up (see email_service), and never in production
    (ENVIRONMENT=production), where every sign-up needs its own emailed code.
    - DEV_OTP_ENABLED: on/off switch. Defaults to on outside production.
    - DEV_OTP_CODE: the 6-digit code. Defaults to 123456.
    """
    enabled_raw = os.getenv("DEV_OTP_ENABLED", "").strip().lower()
    enabled = enabled_raw in ("1", "true", "yes", "on") if enabled_raw else True
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        if enabled_raw and enabled:
            logger.error("DEV_OTP_ENABLED is ignored in production; set up SMTP to send sign-up codes.")
        return None
    if not enabled:
        return None

    code = os.getenv("DEV_OTP_CODE", "").strip() or LOCAL_DEV_OTP_CODE
    if not re.fullmatch(r"\d{6}", code):
        logger.error("DEV_OTP_CODE must be exactly 6 digits; sign-up is closed.")
        return None
    return code


SIGNUP_CLOSED_DETAIL = "Sign-up is currently closed. Contact the system administrator for an account."
ALREADY_REGISTERED_DETAIL = "This account is already registered. Please log in with your password."
SIGNUP_RETRY_DETAIL = "We couldn't finish creating your account. Please try again."
SIGNUP_EXPIRED_DETAIL = "Verification session expired. Please tap 'Send verification code' again to receive a fresh code."
CODE_EMAIL_FAILED_DETAIL = "We couldn't send the code to your email. Check the address and try again in a minute."
TOO_MANY_TRIES_DETAIL = "Too many wrong codes. Go back and tap Continue to get a new code."
CODE_USED_DETAIL = "This code has already been used. Go back and tap Continue to get a new code."
CODE_BUSY_DETAIL = "We're still checking your last try. Please wait a moment and try again."

# HL-052: each sign-up gets its own random code, valid for PENDING_SIGNUP_TTL, with this many tries
SIGNUP_CODE_MAX_ATTEMPTS = 5


def _new_signup_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_signup_code(phone: str, code: str) -> str:
    """
    A keyed hash, so a copy of the table alone can't be used to try all million codes. Including the
    phone means a code only ever matches the sign-up it was made for.
    """
    key = os.getenv("SECRET_KEY", "")
    if not key:
        raise RuntimeError("SECRET_KEY is not set")
    return hmac.new(key.encode("utf-8"), f"{phone}:{code}".encode("utf-8"), hashlib.sha256).hexdigest()


def _wrong_code_detail(tries_left: int) -> str:
    return f"That code isn't right. You have {tries_left} {'try' if tries_left == 1 else 'tries'} left."

# Forgot password on the phone (migration 052): the code is emailed, lasts this long, and has SIGNUP_CODE_MAX_ATTEMPTS tries
# Supabase (or the server) refused a sign-in because of too many attempts, not because of the password
SIGN_IN_BUSY_DETAIL = "Too many sign-in attempts right now. Wait a minute, then try again."

RESET_CODE_TTL = timedelta(minutes=10)
RESET_SENT_MESSAGE = "If an account matches, we've emailed a 6-digit code to its email address."
RESET_EXPIRED_DETAIL = "This code has expired or was already used. Go back and send a new code."
RESET_TOO_MANY_TRIES_DETAIL = "Too many wrong codes. Go back and send a new code."
RESET_EMAIL_FAILED_DETAIL = "We couldn't send the email just now. Please try again in a minute."
RESET_UNAVAILABLE_DETAIL = "Password reset by email isn't available right now. Please contact your care team."
RESET_FAILED_DETAIL = "We couldn't change your password just now. Please try again."


def _hash_reset_code(user_id: str, code: str) -> str:
    """Same keyed hash as the sign-up code, marked as a reset code so the two can never match each other."""
    return _hash_signup_code(f"reset:{user_id}", code)


# Two-factor sign-in for the web portal: after the password, a 6-digit code is emailed to the staff account.
# It lasts STAFF_CODE_TTL, has SIGNUP_CODE_MAX_ATTEMPTS tries and works once. The code is kept in password_resets
# (migration 052), one row per account: phone password resets are for patients only (_reset_account), so a staff
# account never has a reset row, and the hashes are marked differently so a sign-in code can never reset a password.
STAFF_CODE_TTL = timedelta(minutes=10)
STAFF_2FA_TOKEN_TYPE = "staff_2fa"
STAFF_CODE_EXPIRED_DETAIL = "This code has expired or was already used. Go back and sign in again for a new code."
STAFF_CODE_TOO_MANY_TRIES_DETAIL = "Too many wrong codes. Go back and sign in again for a new code."
STAFF_CODE_EMAIL_FAILED_DETAIL = "We couldn't email your sign-in code just now. Please try again in a minute."
STAFF_CODE_UNAVAILABLE_DETAIL = "Sign-in codes can't be sent right now. Please contact the system administrator."
STAFF_CODE_NO_EMAIL_DETAIL = "This account has no email address for its sign-in code. Please contact the system administrator."


def staff_two_factor_enabled() -> bool:
    """On unless STAFF_2FA_ENABLED is false: an emergency switch in case email stops working and staff are locked out."""
    return os.getenv("STAFF_2FA_ENABLED", "").strip().lower() not in ("0", "false", "no", "off")


def _hash_staff_code(user_id: str, code: str) -> str:
    return _hash_signup_code(f"staff2fa:{user_id}", code)


def _staff_token_key() -> str:
    """A key of its own, so the waiting-for-code token can never pass as a login token."""
    key = os.getenv("SECRET_KEY", "")
    if not key:
        raise RuntimeError("SECRET_KEY is not set")
    return f"{key}:{STAFF_2FA_TOKEN_TYPE}"


def _new_staff_token(user_id: str) -> str:
    expires = utc_now() + STAFF_CODE_TTL
    return jwt.encode(
        {"user_id": user_id, "typ": STAFF_2FA_TOKEN_TYPE, "exp": int(expires.timestamp())},
        _staff_token_key(), algorithm="HS256",
    )


def _staff_token_user(token: str) -> str:
    try:
        claims = jwt.decode(token or "", _staff_token_key(), algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=STAFF_CODE_EXPIRED_DETAIL)
    if claims.get("typ") != STAFF_2FA_TOKEN_TYPE or not claims.get("user_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=STAFF_CODE_EXPIRED_DETAIL)
    return str(claims["user_id"])


def _email_hint(email: str) -> str:
    """j***@gmail.com: enough for staff to know which inbox to check."""
    name, _, domain = email.partition("@")
    return f"{name[:1]}***@{domain}" if domain else "your email"


def _staff_info(profile: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": profile["id"],
        "role": profile["role"],
        "expert_type": profile.get("expert_type"),
        "first_name": profile.get("first_name", ""),
        "last_name": profile.get("last_name", ""),
        "email": profile.get("email", ""),
        "phone": profile.get("phone", ""),
        "must_change_password": bool(profile.get("must_change_password")),
    }


# HL-051: a login with no profile that is at most this old is the half-finished result of the same
# sign-up (for example the first try timed out), so a retry may finish it instead of being blocked
HALF_FINISHED_SIGNUP_WINDOW = timedelta(minutes=15)
AUTH_USERS_PAGE_SIZE = 1000
AUTH_USERS_MAX_PAGES = 50


# HL-046: how long a sign-up waits for its code. Only a bcrypt hash of the password is kept meanwhile
# (cost 10, Supabase's own default); Supabase Auth takes that hash directly as password_hash.
PENDING_SIGNUP_TTL = timedelta(minutes=10)
PENDING_PASSWORD_HASH_ROUNDS = 10


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=PENDING_PASSWORD_HASH_ROUNDS)).decode("utf-8")


def _digits(value: Optional[str]) -> str:
    return "".join(filter(str.isdigit, value or ""))


def _is_duplicate_error(err: Exception) -> bool:
    text = str(err).lower()
    return "already" in text or "duplicate" in text or "exists" in text


def _is_timeout_error(err: Exception) -> bool:
    text = f"{type(err).__name__} {err}".lower()
    return "timeout" in text or "timed out" in text

class AuthService:
    def request_registration_otp(self, phone: str, email: str, password: str) -> Dict[str, Any]:
        raise NotImplementedError

    def resend_registration_otp(self, phone: str) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_registration_otp(self, phone: str, code: str) -> Dict[str, Any]:
        raise NotImplementedError

    def login(self, identifier: str, password: str) -> Dict[str, Any]:
        raise NotImplementedError

    def web_login(self, identifier: str, password: str, remember: bool = False) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_2fa(self, token_2fa: str, code: str) -> Dict[str, Any]:
        raise NotImplementedError

    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        raise NotImplementedError

    def forgot_password(self, identifier: str) -> Dict[str, Any]:
        raise NotImplementedError

    def request_password_reset(self, identifier: str) -> Dict[str, Any]:
        raise NotImplementedError

    def reset_password(self, identifier: str, code: str, new_password: str) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_credentials(self, user_id: str, password: str) -> bool:
        raise NotImplementedError

    def delete_user_identity(self, user_id: str) -> bool:
        raise NotImplementedError


class SupabaseAuthService(AuthService):
    def __init__(self, client, pending_repo=None, reset_repo=None):
        self.client = client
        # HL-046: pending sign-ups live in the database, so a restart or another worker doesn't lose them
        self._pending_repo = pending_repo
        self._reset_repo = reset_repo

    @property
    def pending(self):
        if self._pending_repo is None:
            self._pending_repo = get_pending_registration_repo()
        return self._pending_repo

    def _isolated_auth(self):
        """
        A throwaway auth client for password checks. Signing in on the shared service-role client
        makes supabase-py switch every later database call to that user's token, so password
        checks must never run on self.client.
        """
        from supabase import create_client
        from supabase.lib.client_options import SyncClientOptions

        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_ANON_KEY", "").strip() or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        options = SyncClientOptions(auto_refresh_token=False, persist_session=False)
        return create_client(url, key, options=options).auth

    def _password_matches(self, profile: Dict[str, Any], password: str, identifier: str = "") -> Optional[str]:
        """The password exactly as typed, then (only if that fails and it has spaces at the start or end) without them.
        New passwords are saved without those spaces (password_policy), while one an older account set with a space
        still works when typed as it was (2026-11-17)."""
        user_id = self._password_matches_exactly(profile, password, identifier)
        trimmed = password.strip()
        if not user_id and trimmed and trimmed != password:
            user_id = self._password_matches_exactly(profile, trimmed, identifier)
        return user_id

    def _password_matches_exactly(self, profile: Dict[str, Any], password: str, identifier: str = "") -> Optional[str]:
        """
        The Supabase Auth user id when the password is right for this profile, else None. Used by sign-in,
        account deletion and password change, so all three accept a password the same way.

        Supabase limits sign-in attempts per address, and every HeartLink sign-in reaches it from the server's one
        address. This used to try up to 7 requests per sign-in (each login name in three phone formats, with two keys,
        then the SDK), so a few wrong passwords used up the limit and everyone's right password was then refused as
        "Invalid Credentials" (2026-11-17). Now: one request when the password is right, at most two when it's wrong
        (the email, then the phone), the second key only when the first key itself is refused, and a 429 from Supabase
        is reported as "too many attempts", never as a wrong password.
        """
        import httpx
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        keys = [k for k in (os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip(), os.getenv("SUPABASE_ANON_KEY", "").strip()) if k]

        email = (profile.get("email") or "").strip().lower()
        typed = identifier.strip().lower() if "@" in identifier else ""
        attempts: List[Dict[str, str]] = []
        if email:
            attempts.append({"email": email})
        if typed and typed != email:
            attempts.append({"email": typed})
        if profile.get("phone"):
            attempts.append({"phone": normalize_e164(str(profile["phone"]))})

        unreachable = not keys  # no keys set: only the SDK can check the password
        for cred in attempts:
            for key in keys:
                try:
                    with httpx.Client(timeout=10.0) as http:
                        resp = http.post(
                            f"{supabase_url}/auth/v1/token?grant_type=password",
                            headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                            json={**cred, "password": password},
                        )
                except Exception as http_err:
                    logger.warning("[password check] Supabase couldn't be reached (%s)", type(http_err).__name__)
                    unreachable = True
                    break
                if resp.status_code == 200:
                    user_id = (resp.json().get("user") or {}).get("id")
                    if user_id:
                        return str(user_id)
                    break
                if resp.status_code == 429:
                    logger.warning("[password check] Supabase's sign-in limit was reached")
                    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=SIGN_IN_BUSY_DETAIL)
                if resp.status_code in (401, 403):
                    # This key isn't accepted (not the password): try the other key
                    logger.warning("[password check] A Supabase key was refused (%s)", resp.status_code)
                    continue
                if resp.status_code >= 500:
                    unreachable = True
                    break
                break  # 400: not the right password for this login name; the other key won't change that

        if not unreachable:
            return None

        # Only when Supabase couldn't be reached over REST: one try through the SDK
        credentials = {"password": password, **({"email": email} if email else {"phone": normalize_e164(str(profile.get("phone") or identifier))})}
        try:
            res = self._isolated_auth().sign_in_with_password(credentials)
            if res and getattr(res, "user", None):
                return str(res.user.id)
        except Exception as client_err:
            if "rate limit" in str(client_err).lower() or "429" in str(client_err):
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=SIGN_IN_BUSY_DETAIL)
            logger.warning("[password check] SDK sign-in failed (%s)", type(client_err).__name__)
        return None

    def _find_auth_user(self, email: str, phone: str):
        """
        Returns the Supabase Auth login whose email or phone matches, or None. supabase-py has no
        lookup by email, so this pages through the whole user list (one page is only 50 by default).
        """
        email = (email or "").strip().lower()
        phone_digits = _digits(normalize_e164(phone) if phone else "")
        for page in range(1, AUTH_USERS_MAX_PAGES + 1):
            res = self.client.auth.admin.list_users(page=page, per_page=AUTH_USERS_PAGE_SIZE)
            users = res if isinstance(res, list) else (getattr(res, "users", []) or [])
            for u in users:
                if email and (getattr(u, "email", None) or "").lower() == email:
                    return u
                if phone_digits and _digits(getattr(u, "phone", None)) == phone_digits:
                    return u
            if len(users) < AUTH_USERS_PAGE_SIZE:
                return None
        return None

    def _resumable_login(self, email: str, phone: str):
        """
        HL-051: the existing login a retry may finish, or None. Only a login with this exact email AND
        phone that was created in the last few minutes counts; anything older is someone's real account.
        """
        try:
            auth_user = self._find_auth_user(email, phone)
        except Exception as lookup_err:
            logger.warning("Could not look up the existing login (%s)", type(lookup_err).__name__)
            return None
        if not auth_user:
            return None

        same_details = (
            (getattr(auth_user, "email", None) or "").lower() == email.strip().lower()
            and _digits(getattr(auth_user, "phone", None)) == _digits(phone)
        )
        created_at = parse_utc(getattr(auth_user, "created_at", None))
        recent = created_at is not None and utc_now() - created_at <= HALF_FINISHED_SIGNUP_WINDOW
        if same_details and recent:
            return auth_user
        logger.warning("Sign-up blocked: login %s already exists without a profile", auth_user.id)
        return None

    def _new_login(self, email: str, password_hash: str, phone: str):
        res = self.client.auth.admin.create_user({
            "email": email,
            "password_hash": password_hash,
            "phone": phone,
            "email_confirm": True,
            "phone_confirm": True
        })
        auth_user = res.user if hasattr(res, "user") else res
        if not getattr(auth_user, "id", None):
            raise ValueError("Supabase returned no user id")
        return auth_user

    def _create_login(self, pending_key: str, email: str, password_hash: str, phone: str, profile_repo):
        """HL-051: creates the Supabase Auth login, or finishes a half-made one. Never invents an id."""
        try:
            return self._new_login(email, password_hash, phone)
        except Exception as create_err:
            if _is_duplicate_error(create_err):
                if profile_repo.get_by_identifier(phone) or profile_repo.get_by_identifier(email):
                    # HL-045: never take over (or reset the password of) an account that already exists
                    self.pending.delete(pending_key)
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ALREADY_REGISTERED_DETAIL)

                auth_user = self._resumable_login(email, phone)
                if auth_user is None:
                    self.pending.delete(pending_key)
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ALREADY_REGISTERED_DETAIL)
                # HL-046: Supabase only takes a password hash when a login is created, not on update, so the
                # half-made login (no profile, minutes old) is replaced by a fresh one with this sign-up's hash
                try:
                    self.client.auth.admin.delete_user(str(auth_user.id))
                    fresh = self._new_login(email, password_hash, phone)
                except Exception as redo_err:
                    logger.error("Could not finish the half-made login (%s)", type(redo_err).__name__)
                    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SIGNUP_RETRY_DETAIL)
                logger.info("Replaced half-made login %s with %s", auth_user.id, fresh.id)
                return fresh

            # The pending sign-up is kept, so the person can retry with the same code
            if _is_timeout_error(create_err):
                logger.warning("Creating the login timed out (%s)", type(create_err).__name__)
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SIGNUP_RETRY_DETAIL)
            logger.error("Creating the login failed (%s): %s", type(create_err).__name__, str(create_err)[:200])
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=SIGNUP_RETRY_DETAIL)

    def _create_patient_profile(self, pending_key: str, user_id: str, phone: str, email: str, profile_repo) -> None:
        """HL-051: creates the patient's profile. If that fails, the new login is removed again."""
        new_profile = {
            "id": user_id,
            "phone": phone,
            "email": email,
            "role": "patient",
            "first_name": "",
            "last_name": "",
            "date_of_birth": None,
            "sex": None,
            "height_cm": None,
            "weight_kg": None,
            "avatar_url": None,
            "health_goals": [],
            "onboarding_status": "pending",
            "account_status": "active"
        }
        try:
            if profile_repo.create(new_profile):
                return
            failure = HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SIGNUP_RETRY_DETAIL)
        except HTTPException as p_err:
            # A duplicate is fine only when the profile really belongs to this login
            if p_err.status_code == status.HTTP_409_CONFLICT and profile_repo.get_by_id(user_id):
                return
            if p_err.status_code == status.HTTP_409_CONFLICT:
                # The phone or email is taken by another profile; retrying won't help
                self.pending.delete(pending_key)
                failure = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ALREADY_REGISTERED_DETAIL)
            else:
                failure = HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SIGNUP_RETRY_DETAIL)
        except Exception as p_err:
            logger.error("Creating the profile failed (%s)", type(p_err).__name__)
            failure = HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SIGNUP_RETRY_DETAIL)

        # Roll back, so no login is left without a profile (same idea as staff creation)
        try:
            self.client.auth.admin.delete_user(user_id)
            logger.warning("Removed login %s after its profile could not be created", user_id)
        except Exception as del_err:
            logger.error("Could not remove login %s after a failed sign-up (%s)", user_id, type(del_err).__name__)
        raise failure

    def request_registration_otp(self, phone: str, email: str, password: str) -> Dict[str, Any]:
        try:
            profile_repo = get_profile_repo()
            e164_phone = normalize_e164(phone)
            clean_digits = "".join(filter(str.isdigit, phone))
            clean_email = email.strip().lower()
            
            # Check existing profiles across normalized identifiers
            existing_phone = (
                profile_repo.get_by_identifier(phone)
                or profile_repo.get_by_identifier(e164_phone)
                or profile_repo.get_by_identifier(clean_digits)
            )
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This phone number is already registered. Please log in with your password."
                )
            
            existing_email = profile_repo.get_by_identifier(clean_email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email address is already registered. Please log in with your password."
                )

            # Check if already present in auth.users
            try:
                auth_user = self._find_auth_user(clean_email, e164_phone)
            except Exception as lookup_err:
                # Not fatal: creating the login later fails on a duplicate anyway, and that is handled
                logger.warning("Could not check existing logins (%s)", type(lookup_err).__name__)
                auth_user = None
            if auth_user:
                if (getattr(auth_user, "email", None) or "").lower() == clean_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This email address is already registered in Auth. Please log in instead."
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This phone number is already registered in Auth. Please log in instead."
                )

            code, by_email = self._signup_code()

            self.pending.delete_expired()
            self.pending.save(
                e164_phone,
                clean_email,
                _hash_password(password),
                (utc_now() + PENDING_SIGNUP_TTL).isoformat(),
                _hash_signup_code(e164_phone, code),
            )
            if by_email and not self._email_code(clean_email, code):
                # Nothing to verify against, so tapping Continue again starts cleanly
                self.pending.delete(e164_phone)
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=CODE_EMAIL_FAILED_DETAIL)

            logger.info("Pending registration created for a new phone number")
            return {"success": True, "message": "Verification code dispatched"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration failed: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    def _signup_code(self) -> Tuple[str, bool]:
        """
        HL-052: the code for a new sign-up, and whether it must be emailed. With email set up, every
        sign-up gets its own random code. Without it, the shared development code is used outside
        production only; otherwise sign-up is closed.
        """
        if email_service.is_email_configured():
            return _new_signup_code(), True
        dev_code = get_dev_otp_code()
        if dev_code is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=SIGNUP_CLOSED_DETAIL)
        return dev_code, False

    def _email_code(self, email: str, code: str) -> bool:
        try:
            email_service.send_signup_code(email, code, int(PENDING_SIGNUP_TTL.total_seconds() // 60))
            return True
        except email_service.EmailSendError:
            return False

    def _restore_code(self, phone: str, code_hash: str) -> None:
        try:
            self.pending.restore_code(phone, code_hash)
        except Exception as restore_err:
            logger.error("Could not make the sign-up code usable again (%s)", type(restore_err).__name__)

    def _dispatch_real_sms_otp(self, e164_phone: str) -> Dict[str, Any]:
        """
        Dispatches real SMS OTP via Supabase Auth with non-silent error handling.
        Raises HTTP 503 if SMS gateway delivery fails.
        """
        try:
            self.client.auth.sign_in_with_otp({"phone": e164_phone, "options": {"channel": "sms"}})
            return {"success": True, "message": "Verification code sent via SMS"}
        except Exception as sms_err:
            logger.error("Real SMS dispatch failed (%s)", type(sms_err).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SMS delivery is not currently available. Registration is limited to invited testers during this phase."
            )

    def _live_pending(self, e164_phone: str) -> Optional[Dict[str, Any]]:
        pending = self.pending.get(e164_phone)
        if pending and parse_utc(pending["expires_at"]) < utc_now():
            self.pending.delete(e164_phone)
            return None
        return pending

    def resend_registration_otp(self, phone: str) -> Dict[str, Any]:
        try:
            e164_phone = normalize_e164(phone)
            pending = self._live_pending(e164_phone)
            if not pending:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=SIGNUP_EXPIRED_DETAIL)

            # HL-052: a resend makes a new code; the old one stops working
            code, by_email = self._signup_code()
            self.pending.replace_code(
                e164_phone, _hash_signup_code(e164_phone, code), (utc_now() + PENDING_SIGNUP_TTL).isoformat()
            )
            if by_email and not self._email_code(pending["email"], code):
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=CODE_EMAIL_FAILED_DETAIL)
            return {"success": True, "message": "Code resent successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Resend failed: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resend failed")

    def verify_registration_otp(self, phone: str, code: str) -> Dict[str, Any]:
        try:
            e164_phone = normalize_e164(phone)

            if not email_service.is_email_configured() and get_dev_otp_code() is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=SIGNUP_CLOSED_DETAIL)

            # HL-045: a code only ever completes the pending sign-up for this exact number. It never
            # logs in an existing account (that needs the password), and never matches another number.
            pending = self._live_pending(e164_phone)
            # No code_hash: a sign-up from before HL-052, or its code is being used right now
            if not pending or not pending.get("code_hash"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=SIGNUP_EXPIRED_DETAIL)

            # HL-052: every try counts, and the code locks after SIGNUP_CODE_MAX_ATTEMPTS of them
            attempts = int(pending.get("attempts") or 0)
            if attempts >= SIGNUP_CODE_MAX_ATTEMPTS:
                self.pending.delete(e164_phone)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TOO_MANY_TRIES_DETAIL)
            if not self.pending.claim_attempt(e164_phone, attempts):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=CODE_BUSY_DETAIL)

            code_hash = pending["code_hash"]
            if not hmac.compare_digest(_hash_signup_code(e164_phone, str(code).strip()), code_hash):
                tries_left = SIGNUP_CODE_MAX_ATTEMPTS - (attempts + 1)
                if tries_left <= 0:
                    self.pending.delete(e164_phone)
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TOO_MANY_TRIES_DETAIL)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_wrong_code_detail(tries_left))

            # Only one request can use the code
            if not self.pending.consume_code(e164_phone, code_hash):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=CODE_USED_DETAIL)

            email = pending["email"]
            password_hash = pending["password_hash"]
            e164_val = pending.get("phone") or e164_phone

            # HL-051: sign-up either finishes completely (real login + profile) or fails with nothing
            # left half-made, so the person can simply try again
            try:
                profile_repo = get_profile_repo()
                auth_user = self._create_login(e164_phone, email, password_hash, e164_val, profile_repo)
                auth_user_id = str(auth_user.id)
                user_email = getattr(auth_user, "email", None) or email

                if not profile_repo.get_by_id(auth_user_id):
                    self._create_patient_profile(e164_phone, auth_user_id, e164_val, user_email, profile_repo)
            except Exception:
                # Where the pending sign-up is kept, the same code works for the retry
                self._restore_code(e164_phone, code_hash)
                raise

            # Clean up pending registration
            self.pending.delete(e164_phone)

            access_token = create_access_token(data={"user_id": auth_user_id, "role": "patient"})
            return {
                "success": True,
                "message": "Verified successfully",
                "user_id": auth_user_id,
                "token": access_token
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Verification failed: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification failed")

    def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """
        Authenticates a user against Supabase GoTrue using a hardened two-tier strategy:
        1. Tier 1 (Stateless Direct REST): Dispatches HTTPS POST to /auth/v1/token?grant_type=password
           using httpx with service_key or anon_key. Completely stateless and thread-safe; eliminates
           in-memory session state corruption across concurrent requests in server environments (e.g. Render).
           Supports multi-identity accounts with automatic phone normalization (+63, 63, 09).
        2. Tier 2 (SDK Client Fallback): Falls back to an isolated client's sign_in_with_password() if REST
           communication encounters transient network issues.
        3. Enforces profile account_status == 'active' and returns minted application JWT.
        """
        try:
            profile_repo = get_profile_repo()
            profile = profile_repo.get_by_identifier(identifier)
            if not profile:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            if profile.get("account_status") == "archived":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: Account is archived")
            elif profile.get("account_status") != "active":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: Account is disabled or archived")

            auth_user_id = self._password_matches(profile, password, identifier)

            if not auth_user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            token = create_access_token(data={"user_id": auth_user_id, "role": profile.get("role", "patient")})
            return {
                "success": True,
                "message": "Login Successfully",
                "user_id": auth_user_id,
                "token": token
            }
        except HTTPException:
            raise
        except Exception as ex:
            logger.error(f"[login] Unexpected error: {ex}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

    def web_login(self, identifier: str, password: str, remember: bool = False) -> Dict[str, Any]:
        """
        Specialized web portal authentication endpoint for administrative and clinical staff.
        Executes credential verification via self.login(), resolves the authenticated profile,
        and strictly verifies role membership in ['admin', 'medical_expert'].
        Rejects patient accounts with HTTP 403 Forbidden.
        """
        login_res = self.login(identifier, password)
        profile = get_profile_repo().get_by_id(login_res["user_id"])
        if not profile:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")
        if profile.get("role") not in ["admin", "medical_expert"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied. This portal is strictly for Admins and Medical Experts.")

        if not staff_two_factor_enabled():
            return {"success": True, "requires_2fa": False, **_staff_info(profile), "token": login_res["token"]}

        # Two-factor: the right password only earns an emailed code. Nothing about the account is returned
        # and no login token is made until the code is entered (verify_2fa).
        user_id = str(profile["id"])
        email = (profile.get("email") or "").strip()
        if not email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=STAFF_CODE_NO_EMAIL_DETAIL)
        if email_service.is_email_configured():
            code, by_email = _new_signup_code(), True
        else:
            code, by_email = get_dev_otp_code(), False
            if code is None:
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=STAFF_CODE_UNAVAILABLE_DETAIL)
        self.resets.delete_expired()
        self.resets.save(user_id, _hash_staff_code(user_id, code), (utc_now() + STAFF_CODE_TTL).isoformat())
        if by_email:
            try:
                email_service.send_staff_login_code(email, code, int(STAFF_CODE_TTL.total_seconds() // 60))
            except email_service.EmailSendError:
                self.resets.delete(user_id)
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=STAFF_CODE_EMAIL_FAILED_DETAIL)
        return {
            "success": True,
            "requires_2fa": True,
            "token_2fa": _new_staff_token(user_id),
            "email_hint": _email_hint(email),
        }

    def verify_2fa(self, token_2fa: str, code: str) -> Dict[str, Any]:
        """The second step of the portal sign-in: the emailed code (10 minutes, 5 tries, works once)."""
        user_id = _staff_token_user(token_2fa)
        profile = get_profile_repo().get_by_id(user_id)
        # Checked again, in case the account was disabled or its role changed after the password step
        if not profile or profile.get("role") not in ["admin", "medical_expert"] or profile.get("account_status") != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=STAFF_CODE_EXPIRED_DETAIL)

        self._use_code(
            user_id, _hash_staff_code(user_id, str(code).strip()),
            STAFF_CODE_EXPIRED_DETAIL, STAFF_CODE_TOO_MANY_TRIES_DETAIL,
        )
        self.resets.delete(user_id)
        token = create_access_token(data={"user_id": user_id, "role": profile["role"]})
        return {"success": True, "requires_2fa": False, **_staff_info(profile), "token": token}

    def _use_code(self, user_id: str, entered_hash: str, expired_detail: str, too_many_detail: str) -> str:
        """
        Checks an emailed code kept in password_resets and marks it used, so it works once. Every try counts, and the
        code is deleted after SIGNUP_CODE_MAX_ATTEMPTS. Returns the code's hash (so a failed next step can restore it).
        """
        row = self.resets.get(user_id)
        if row and parse_utc(row["expires_at"]) < utc_now():
            self.resets.delete(user_id)
            row = None
        # No code_hash: the code is being used right now, or was just used
        if not row or not row.get("code_hash"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=expired_detail)

        attempts = int(row.get("attempts") or 0)
        if attempts >= SIGNUP_CODE_MAX_ATTEMPTS:
            self.resets.delete(user_id)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=too_many_detail)
        if not self.resets.claim_attempt(user_id, attempts):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=CODE_BUSY_DETAIL)

        code_hash = row["code_hash"]
        if not hmac.compare_digest(entered_hash, code_hash):
            tries_left = SIGNUP_CODE_MAX_ATTEMPTS - (attempts + 1)
            if tries_left <= 0:
                self.resets.delete(user_id)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=too_many_detail)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_wrong_code_detail(tries_left))

        # Only one request can use the code
        if not self.resets.consume_code(user_id, code_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=expired_detail)
        return code_hash

    def verify_credentials(self, user_id: str, password: str) -> bool:
        try:
            profile = get_profile_repo().get_by_id(user_id)
            if not profile:
                return False
            return bool(self._password_matches(profile, password))
        except HTTPException:
            raise
        except Exception:
            return False

    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        try:
            profile = get_profile_repo().get_by_id(user_id)
            if not profile:
                return False

            try:
                auth_user_id = self._password_matches(profile, current_password)
            except HTTPException:
                raise
            if not auth_user_id:
                logger.info("[change_password] Current password check failed")
                return False

            # The admin API changes the password without touching any session on the shared client
            try:
                self.client.auth.admin.update_user_by_id(auth_user_id, {"password": new_password})
                return True
            except Exception as admin_err:
                logger.error(f"[change_password] Admin update_user_by_id failed: {admin_err}")
                return False
        except Exception as e:
            logger.error(f"[change_password] Error: {e}")
            return False

    def forgot_password(self, identifier: str) -> Dict[str, Any]:
        try:
            if "@" in identifier:
                self.client.auth.reset_password_for_email(identifier)
            else:
                self.client.auth.reset_password_for_phone(identifier)
        except Exception:
            pass
        return {
            "success": True,
            "message": "If the account exists, password recovery instructions have been sent."
        }

    # --- Forgot password on the phone: an emailed 6-digit code, then a new password -------------------------------
    # (The web portal's "Forgot password" still uses forgot_password above.)

    @property
    def resets(self):
        if self._reset_repo is None:
            self._reset_repo = get_password_reset_repo()
        return self._reset_repo

    def _reset_account(self, identifier: str) -> Optional[Dict[str, Any]]:
        """The active patient account for this email or phone number (any Philippine format) that has an email."""
        ident = (identifier or "").strip()
        if not ident:
            return None
        profile_repo = get_profile_repo()
        if "@" in ident:
            profile = profile_repo.get_by_identifier(ident.lower())
        else:
            profile = None
            for variant in dict.fromkeys([normalize_e164(ident), ident, _digits(ident)]):
                if variant:
                    profile = profile_repo.get_by_identifier(variant)
                if profile:
                    break
        if not profile or (profile.get("role") or "patient") != "patient":
            return None
        if profile.get("account_status") != "active" or not (profile.get("email") or "").strip():
            return None
        return profile

    def request_password_reset(self, identifier: str) -> Dict[str, Any]:
        """
        Emails a 6-digit code to the account's address. The answer is the same whether or not an account matched,
        so this can't be used to find out who has an account.
        """
        profile = self._reset_account(identifier)
        if profile:
            user_id = str(profile["id"])
            if email_service.is_email_configured():
                code, by_email = _new_signup_code(), True
            else:
                code, by_email = get_dev_otp_code(), False
                if code is None:
                    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=RESET_UNAVAILABLE_DETAIL)
            self.resets.delete_expired()
            self.resets.save(user_id, _hash_reset_code(user_id, code), (utc_now() + RESET_CODE_TTL).isoformat())
            if by_email:
                try:
                    email_service.send_reset_code(profile["email"].strip(), code, int(RESET_CODE_TTL.total_seconds() // 60))
                except email_service.EmailSendError:
                    self.resets.delete(user_id)
                    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=RESET_EMAIL_FAILED_DETAIL)
        return {"success": True, "message": RESET_SENT_MESSAGE}

    def reset_password(self, identifier: str, code: str, new_password: str) -> Dict[str, Any]:
        """Sets a new password with the emailed code: 10 minutes, 5 tries, works once. Every session then ends."""
        profile = self._reset_account(identifier)
        if not profile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=RESET_EXPIRED_DETAIL)
        user_id = str(profile["id"])
        code_hash = self._use_code(
            user_id, _hash_reset_code(user_id, str(code).strip()), RESET_EXPIRED_DETAIL, RESET_TOO_MANY_TRIES_DETAIL,
        )

        try:
            # The admin API changes the password without touching any session on the shared client
            self.client.auth.admin.update_user_by_id(user_id, {"password": new_password})
        except Exception as e:
            logger.error("Password reset could not change the password (%s)", type(e).__name__)
            try:
                self.resets.restore_code(user_id, code_hash)
            except Exception:
                pass
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=RESET_FAILED_DETAIL)

        self.resets.delete(user_id)
        # Every device that was logged in is logged out, in case someone else had the old password
        try:
            get_refresh_token_repo().revoke_all_for_user(user_id, "password_reset")
        except Exception as e:
            logger.warning("Could not end old sessions after a password reset (%s)", type(e).__name__)
        return {"success": True, "message": "Password changed. Log in with your new password."}

    def delete_user_identity(self, user_id: str) -> bool:
        try:
            self.client.auth.admin.delete_user(user_id)
            return True
        except Exception:
            return False


_auth_service = None

def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = SupabaseAuthService(get_supabase_client())
    return _auth_service
