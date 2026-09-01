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
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException, status

from app.db.client import get_supabase_client
from app.utils.security import create_access_token, token_blacklist
from app.db.repositories import get_profile_repo


# Whitelisted test phone numbers and prefixes for zero-cost dev/test registration bypass
TEST_PHONE_PREFIXES = (
    "+63999", "+63900", "+63911", "+63912345", "+63917555", "+63918555", "+1555"
)
TEST_PHONE_NUMBERS = {
    # Default test suite fixtures
    "+639123456789",
    "+639175550192",
    "+639185550144",
    "+639999999999",
    "+639000000000",
    "+639111111111",
    # Invited real tester phone numbers (E.164 normalized)
    "+639171234567",
    "+639281234567",
}

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

# Dynamically include any additional invited tester numbers from environment
_env_testers = os.getenv("INVITED_TESTER_NUMBERS", os.getenv("TEST_PHONE_NUMBERS", ""))
if _env_testers:
    for _raw in _env_testers.split(","):
        _norm = normalize_e164(_raw.strip())
        if _norm:
            TEST_PHONE_NUMBERS.add(_norm)

def is_test_phone_number(phone: str) -> bool:
    """
    Checks if a phone number matches whitelisted test phone numbers/prefixes
    configured for dev/test OTP bypass without incurring SMS gateway charges.
    """
    if not phone:
        return False
    e164 = normalize_e164(phone)
    if e164 in TEST_PHONE_NUMBERS:
        return True
    return any(e164.startswith(pfx) for pfx in TEST_PHONE_PREFIXES)


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

            e164_phone = normalize_e164(phone)
            now = datetime.utcnow()
            clean_digits = "".join(filter(str.isdigit, phone))
            is_whitelisted = is_test_phone_number(phone) or is_test_phone_number(clean_digits) or is_test_phone_number(e164_phone)

            # Phase gate: Lock self-registration strictly to whitelisted test numbers
            if not is_whitelisted:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Self-registration is currently limited to invited testers. Contact the system administrator for an account."
                )

            pending_data = {
                "email": email,
                "password": password,
                "code": "123456",
                "e164_phone": e164_phone,
                "expires_at": (now + timedelta(minutes=10)).isoformat()
            }
            self._pending_registrations[phone] = pending_data
            self._pending_registrations[e164_phone] = pending_data
            self._pending_registrations[clean_digits] = pending_data
            if clean_digits.startswith("63"):
                self._pending_registrations[clean_digits[2:]] = pending_data
                self._pending_registrations["0" + clean_digits[2:]] = pending_data

            print(f"[SupabaseAuthService] Whitelisted test number OTP for {phone} ({e164_phone}): 123456")
            return {"success": True, "message": "Verification code dispatched"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Registration failed: {str(e)}")

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
            pending = self._pending_registrations.get(phone)
            if pending:
                pending["expires_at"] = (datetime.now() + timedelta(minutes=10)).isoformat()
                e164 = pending.get("e164_phone") or phone
                try:
                    self.client.auth.resend({"type": "sms", "phone": e164})
                except Exception:
                    pass
            return {"success": True, "message": "Code resent successfully"}
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Resend failed: {str(e)}")

    def verify_registration_otp(self, phone: str, code: str) -> Dict[str, Any]:
        try:
            clean_phone = "".join(filter(str.isdigit, phone))
            e164_phone = normalize_e164(phone)
            is_whitelisted = is_test_phone_number(phone) or is_test_phone_number(clean_phone) or is_test_phone_number(e164_phone)

            # Registration is limited to whitelisted test numbers for this testing phase
            if not is_whitelisted:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Self-registration is currently limited to invited testers. Contact the system administrator for an account."
                )

            pending = self._pending_registrations.get(phone) or self._pending_registrations.get(clean_phone)
            if not pending:
                for k, v in list(self._pending_registrations.items()):
                    k_digits = "".join(filter(str.isdigit, k))
                    if clean_phone and (clean_phone in k_digits or k_digits in clean_phone):
                        pending = v
                        break

            if not pending and code == "123456" and is_whitelisted:
                # Check if profile already created (e.g. across server restart)
                profile_repo = get_profile_repo()
                existing = profile_repo.get_by_identifier(phone)
                if existing:
                    auth_user_id = existing.get("id")
                    access_token = create_access_token(data={"user_id": auth_user_id, "role": existing.get("role", "patient")})
                    return {
                        "success": True,
                        "message": "Verified successfully",
                        "user_id": auth_user_id,
                        "token": access_token
                    }
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification session expired. Please tap 'Send verification code' again to receive a fresh code."
                )

            auth_user = None

            # 1. Whitelisted test code verification
            if code == "123456" and is_whitelisted and pending:
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
                        auth_user_id = prof.get("id")
                        try:
                            self.client.auth.admin.update_user_by_id(
                                auth_user_id,
                                {"password": password, "email_confirm": True, "phone_confirm": True}
                            )
                        except Exception:
                            pass
                        
                        class UserWrapper:
                            def __init__(self, uid, em, ph):
                                self.id = uid
                                self.email = em
                                self.phone = ph
                        auth_user = UserWrapper(auth_user_id, email, e164_val)
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
            else:
                # Direct Supabase verify_otp for real SMS codes
                res = self.client.auth.verify_otp({
                    "phone": e164_phone,
                    "token": code,
                    "type": "sms"
                })
                if not res.user:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Verification Code")
                auth_user = res.user

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
            self._pending_registrations.pop(phone, None)

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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Verification failed: {str(e)}")

    def login(self, identifier: str, password: str) -> Dict[str, Any]:
        try:
            profile_repo = get_profile_repo()
            profile = profile_repo.get_by_identifier(identifier)
            if not profile:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            if profile.get("account_status") != "active":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: Account is disabled or archived")

            # Try authenticating credentials with Supabase
            credentials = {"password": password}
            if profile.get("email"):
                credentials["email"] = profile["email"]
            elif profile.get("phone"):
                credentials["phone"] = profile["phone"]
            elif "@" in identifier:
                credentials["email"] = identifier
            else:
                credentials["phone"] = identifier

            res = None
            try:
                res = self.client.auth.sign_in_with_password(credentials)
            except Exception:
                # If identifier had phone format mismatch, try phone explicitly
                if profile.get("phone") and profile.get("phone") != credentials.get("phone"):
                    try:
                        res = self.client.auth.sign_in_with_password({"phone": profile["phone"], "password": password})
                    except Exception:
                        pass
                if not res and profile.get("email") and profile.get("email") != credentials.get("email"):
                    try:
                        res = self.client.auth.sign_in_with_password({"email": profile["email"], "password": password})
                    except Exception:
                        pass

            if not res or not hasattr(res, "user") or not res.user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            auth_user_id = str(res.user.id)
            token = create_access_token(data={"user_id": auth_user_id, "role": profile.get("role", "patient")})
            return {
                "success": True,
                "message": "Login Successfully",
                "user_id": auth_user_id,
                "token": token
            }
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

    def web_login(self, identifier: str, password: str, remember: bool = False) -> Dict[str, Any]:
        # Supabase web login verifying role
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
