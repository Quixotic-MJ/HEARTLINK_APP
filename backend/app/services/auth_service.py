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
import secrets
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

from app.db.client import get_supabase_client
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.utils.security import create_access_token
from app.utils.phone import normalize_e164
from app.db.repositories import get_profile_repo, get_pending_registration_repo
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

    def verify_credentials(self, user_id: str, password: str) -> bool:
        raise NotImplementedError

    def delete_user_identity(self, user_id: str) -> bool:
        raise NotImplementedError


class SupabaseAuthService(AuthService):
    def __init__(self, client, pending_repo=None):
        self.client = client
        # HL-046: pending sign-ups live in the database, so a restart or another worker doesn't lose them
        self._pending_repo = pending_repo

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
            print(f"[SupabaseAuthService] Real SMS dispatch failed for {e164_phone}: {sms_err}")
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

            auth_user_id = None

            # --- Method 1: Stateless REST authentication via httpx ---
            # Bypasses supabase-py gotrue client session state issues in multi-request server environments
            import httpx
            supabase_url = os.getenv("SUPABASE_URL", "").strip()
            anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
            service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

            auth_attempts = []
            if profile.get("email"):
                auth_attempts.append({"email": profile["email"].strip().lower()})
            if "@" in identifier and {"email": identifier.strip().lower()} not in auth_attempts:
                auth_attempts.append({"email": identifier.strip().lower()})
            if profile.get("phone"):
                p = profile["phone"].strip()
                auth_attempts.append({"phone": p})
                if p.startswith("63"):
                    auth_attempts.append({"phone": "+" + p})
                elif p.startswith("+63"):
                    auth_attempts.append({"phone": p[1:]})
                elif p.startswith("09"):
                    auth_attempts.append({"phone": "+63" + p[1:]})

            valid_keys = [k for k in [service_key, anon_key] if k]
            for key_to_use in valid_keys:
                if auth_user_id:
                    break
                for cred in auth_attempts:
                    try:
                        headers = {
                            "apikey": key_to_use,
                            "Authorization": f"Bearer {key_to_use}",
                            "Content-Type": "application/json"
                        }
                        with httpx.Client(timeout=10.0) as http:
                            resp = http.post(
                                f"{supabase_url}/auth/v1/token?grant_type=password",
                                headers=headers,
                                json={**cred, "password": password}
                            )
                        if resp.status_code == 200:
                            data = resp.json()
                            user_obj = data.get("user") or {}
                            if user_obj.get("id"):
                                auth_user_id = str(user_obj["id"])
                                print(f"[login] Direct REST login successful for {cred.get('email') or cred.get('phone')} (id={auth_user_id})")
                                break
                        else:
                            print(f"[login] Direct REST attempt failed ({resp.status_code}): {resp.text[:120]}")
                    except Exception as http_err:
                        print(f"[login] httpx auth attempt error: {http_err}")

            # --- Method 2: Fallback to client.auth.sign_in_with_password ---
            if not auth_user_id:
                credentials = {"password": password}
                if profile.get("email"):
                    credentials["email"] = profile["email"]
                elif profile.get("phone"):
                    credentials["phone"] = profile["phone"]
                elif "@" in identifier:
                    credentials["email"] = identifier
                else:
                    credentials["phone"] = identifier

                try:
                    res = self._isolated_auth().sign_in_with_password(credentials)
                    if res and hasattr(res, "user") and res.user:
                        auth_user_id = str(res.user.id)
                except Exception as client_err:
                    print(f"[login] client.auth fallback error: {client_err}")

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
            print(f"[login] Unexpected error: {ex}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

    def web_login(self, identifier: str, password: str, remember: bool = False) -> Dict[str, Any]:
        """
        Specialized web portal authentication endpoint for administrative and clinical staff.
        Executes credential verification via self.login(), resolves the authenticated profile,
        and strictly verifies role membership in ['admin', 'medical_expert', 'super_admin'].
        Rejects patient accounts with HTTP 403 Forbidden.
        """
        login_res = self.login(identifier, password)
        profile = get_profile_repo().get_by_id(login_res["user_id"])
        if not profile:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")
        if profile.get("role") not in ["admin", "medical_expert", "super_admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied. This portal is strictly for Admins and Medical Experts.")

        return {
            "success": True,
            "requires_2fa": False,
            "user_id": profile["id"],
            "role": profile["role"],
            "expert_type": profile.get("expert_type"),
            "first_name": profile.get("first_name", ""),
            "last_name": profile.get("last_name", ""),
            "email": profile.get("email", ""),
            "phone": profile.get("phone", ""),
            "must_change_password": bool(profile.get("must_change_password")),
            "token": login_res["token"]
        }

    def verify_2fa(self, token_2fa: str, code: str) -> Dict[str, Any]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA handled via Supabase MFA")

    def verify_credentials(self, user_id: str, password: str) -> bool:
        try:
            profile = get_profile_repo().get_by_id(user_id)
            if not profile:
                return False
            ident = profile.get("email") or profile.get("phone")
            credentials = {"password": password}
            if profile.get("email"):
                credentials["email"] = profile["email"]
            else:
                credentials["phone"] = profile["phone"]
            res = self._isolated_auth().sign_in_with_password(credentials)
            return bool(res and hasattr(res, "user") and res.user)
        except Exception:
            return False

    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        try:
            profile = get_profile_repo().get_by_id(user_id)
            if not profile:
                return False

            credentials = {"password": current_password}
            if profile.get("email"):
                credentials["email"] = profile["email"]
            elif profile.get("phone"):
                credentials["phone"] = profile["phone"]
            else:
                return False

            auth_res = None
            try:
                auth_res = self._isolated_auth().sign_in_with_password(credentials)
            except Exception as sign_err:
                logger.info(f"[change_password] Current password check failed: {sign_err}")
                return False

            if not auth_res or not hasattr(auth_res, "user") or not auth_res.user:
                return False

            # The admin API changes the password without touching any session on the shared client
            try:
                self.client.auth.admin.update_user_by_id(str(auth_res.user.id), {"password": new_password})
                return True
            except Exception as admin_err:
                logger.error(f"[change_password] Admin update_user_by_id failed: {admin_err}")
                return False
        except Exception as e:
            print(f"[change_password] Error: {e}")
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
