# backend/app/services/auth_service.py
"""
HeartLink Authentication Service.
Provides a unified interface for Supabase Auth and Mock Auth.
Handles user registration, OTP verification, login, 2FA, password change, recovery, and identity deletion.
"""
import os
import re
import uuid
import hashlib
import hmac
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
from app.db.repositories import get_profile_repo


LOCAL_DEV_OTP_CODE = "123456"


def get_dev_otp_code() -> Optional[str]:
    """
    HL-045: Returns the shared sign-up code while development OTP mode is on, else None.

    There is no SMS gateway yet, so every sign-up is verified with one shared code.
    - DEV_OTP_ENABLED: on/off switch. Defaults to on outside production, off in production.
    - DEV_OTP_CODE: the 6-digit code. Outside production it defaults to 123456; in production
      it must be set (and must not be 123456), otherwise sign-up stays closed.
    """
    is_production = os.getenv("ENVIRONMENT", "").lower() == "production"
    enabled_raw = os.getenv("DEV_OTP_ENABLED", "").strip().lower()
    enabled = enabled_raw in ("1", "true", "yes", "on") if enabled_raw else not is_production
    if not enabled:
        return None

    code = os.getenv("DEV_OTP_CODE", "").strip()
    if not code:
        if is_production:
            logger.error("DEV_OTP_ENABLED is on but DEV_OTP_CODE is not set; sign-up is closed.")
            return None
        return LOCAL_DEV_OTP_CODE
    if not re.fullmatch(r"\d{6}", code):
        logger.error("DEV_OTP_CODE must be exactly 6 digits; sign-up is closed.")
        return None
    if is_production and code == LOCAL_DEV_OTP_CODE:
        logger.error("DEV_OTP_CODE must not be the public default in production; sign-up is closed.")
        return None
    return code


SIGNUP_CLOSED_DETAIL = "Sign-up is currently closed. Contact the system administrator for an account."

def normalize_e164(phone: str) -> str:
    if not phone:
        return ""
    e164 = re.sub(r"[\s\-\(\)\.]", "", str(phone).strip())
    if not e164.startswith("+"):
        if e164.startswith("0"):
            e164 = "+63" + e164[1:]
        elif e164.startswith("63"):
            e164 = "+" + e164
        else:
            e164 = "+63" + e164
    return e164


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
    def __init__(self, client):
        self.client = client
        self._pending_registrations = {}

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
                users_res = self.client.auth.admin.list_users()
                users_list = users_res if isinstance(users_res, list) else (getattr(users_res, 'users', []) or [])
                for u in users_list:
                    u_email = (getattr(u, 'email', None) or "").lower()
                    u_phone = getattr(u, 'phone', None) or ""
                    clean_phone = "".join(filter(str.isdigit, phone))
                    if u_email and u_email == email.lower():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="This email address is already registered in Auth. Please log in instead."
                        )
                    if u_phone:
                        clean_u_phone = "".join(filter(str.isdigit, u_phone))
                        if clean_u_phone and clean_phone and clean_u_phone == clean_phone:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="This phone number is already registered in Auth. Please log in instead."
                            )
            except HTTPException:
                raise
            except Exception:
                pass

            # HL-045: no SMS gateway yet, so sign-up is only open while dev OTP mode is on
            if get_dev_otp_code() is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=SIGNUP_CLOSED_DETAIL)

            self._pending_registrations[e164_phone] = {
                "email": email,
                "password": password,
                "e164_phone": e164_phone,
                "expires_at": (utc_now() + timedelta(minutes=10)).isoformat()
            }

            logger.info("Pending registration created for a new phone number")
            return {"success": True, "message": "Verification code dispatched"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration failed: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

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

    def resend_registration_otp(self, phone: str) -> Dict[str, Any]:
        try:
            # HL-045: codes are not sent by SMS yet, so resending only extends the pending window
            pending = self._pending_registrations.get(normalize_e164(phone))
            if pending:
                pending["expires_at"] = (utc_now() + timedelta(minutes=10)).isoformat()
            return {"success": True, "message": "Code resent successfully"}
        except Exception as e:
            logger.error(f"Resend failed: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resend failed")

    def verify_registration_otp(self, phone: str, code: str) -> Dict[str, Any]:
        try:
            e164_phone = normalize_e164(phone)

            dev_code = get_dev_otp_code()
            if dev_code is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=SIGNUP_CLOSED_DETAIL)

            # HL-045: a code only ever completes the pending sign-up for this exact number. It never
            # logs in an existing account (that needs the password), and never matches another number.
            pending = self._pending_registrations.get(e164_phone)
            if pending and parse_utc(pending["expires_at"]) < utc_now():
                self._pending_registrations.pop(e164_phone, None)
                pending = None
            if not pending:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification session expired. Please tap 'Send verification code' again to receive a fresh code."
                )

            if not hmac.compare_digest(str(code).strip(), dev_code):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Verification Code")

            auth_user = None

            email = pending["email"]
            password = pending["password"]
            e164_val = pending.get("e164_phone") or e164_phone

            # Create user directly in Supabase Auth via Admin API
            try:
                res = self.client.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "phone": e164_val,
                    "email_confirm": True,
                    "phone_confirm": True
                })
                auth_user = res.user if hasattr(res, "user") else res
            except Exception as create_err:
                profile_repo = get_profile_repo()
                prof = profile_repo.get_by_identifier(e164_val) or profile_repo.get_by_identifier(email)
                if prof:
                    # HL-045: never take over (or reset the password of) an account that already exists
                    self._pending_registrations.pop(e164_phone, None)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This account is already registered. Please log in with your password."
                    )
                else:
                    err_str = str(create_err).lower()
                    if "already" in err_str or "duplicate" in err_str or "timeout" in err_str or "timed out" in err_str:
                        new_uuid = str(uuid.uuid4())
                        class UserWrapper:
                            def __init__(self, uid, em, ph):
                                self.id = uid
                                self.email = em
                                self.phone = ph
                        auth_user = UserWrapper(new_uuid, email, e164_val)
                    else:
                        raise create_err

            if not auth_user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Verification Code")

            auth_user_id = str(auth_user.id)
            user_email = getattr(auth_user, "email", None) or (pending.get("email") if pending else None)

            # Create corresponding public.profiles row
            profile_repo = get_profile_repo()
            e164_check = e164_val if "e164_val" in locals() else e164_phone
            existing = (
                profile_repo.get_by_id(auth_user_id) 
                or profile_repo.get_by_identifier(phone) 
                or profile_repo.get_by_identifier(e164_check)
                or (profile_repo.get_by_identifier(user_email) if user_email else None)
            )
            if not existing:
                new_profile = {
                    "id": auth_user_id,
                    "phone": phone,
                    "email": user_email,
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
                    profile_repo.create(new_profile)
                except Exception as p_err:
                    if "duplicate" not in str(p_err).lower() and "already" not in str(p_err).lower():
                        pass

            # Clean up pending registration
            self._pending_registrations.pop(e164_phone, None)

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
        2. Tier 2 (SDK Client Fallback): Falls back to self.client.auth.sign_in_with_password() if REST
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
                    res = self.client.auth.sign_in_with_password(credentials)
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
            res = self.client.auth.sign_in_with_password(credentials)
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
                auth_res = self.client.auth.sign_in_with_password(credentials)
            except Exception as sign_err:
                print(f"[change_password] Sign-in verification failed: {sign_err}")
                return False

            if not auth_res or not hasattr(auth_res, "user") or not auth_res.user:
                return False

            # Update password with authenticated session
            try:
                self.client.auth.update_user({"password": new_password})
                return True
            except Exception as update_err:
                print(f"[change_password] Session update_user failed: {update_err}, attempting admin fallback")
                try:
                    self.client.auth.admin.update_user_by_id(user_id, {"password": new_password})
                    return True
                except Exception as admin_err:
                    print(f"[change_password] Admin update_user_by_id failed: {admin_err}")
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
