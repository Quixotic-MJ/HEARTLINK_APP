from datetime import datetime, timedelta
from fastapi import APIRouter, status, HTTPException
from app.schemas.auth import RegisterRequest, CodeResponse, Login, ResendCodeRequest
import app.mock_db as mock_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/request-code", status_code=status.HTTP_200_OK)
async def request_code(payload: RegisterRequest):
    now = datetime.utcnow()

    # 1. Check existing registered profiles
    for profile in mock_db.profiles:
        if profile.get("phone") == payload.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="duplicate phone number"
            )
        if profile.get("email") == payload.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="duplicate email"
            )

    # 2. Check pending temp_profiles for unexpired requests
    mock_db.temp_profiles[:] = [
        tp for tp in mock_db.temp_profiles
        if not (isinstance(tp.get("expires_at"), datetime) and now > tp["expires_at"])
    ]

    for tp in mock_db.temp_profiles:
        if tp.get("phone") == payload.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A verification code was already sent to this phone number. Please check your messages or wait for it to expire."
            )
        if tp.get("email") == payload.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A verification code was already sent to this email address."
            )

    # 3. Create new temp profile with 10 min expiration
    import hashlib
    hashed_pwd = hashlib.sha256(payload.password.encode()).hexdigest()
    
    new_temp = {
        "phone": payload.phone,
        "email": payload.email,
        "password": hashed_pwd,
        "created_at": now,
        "expires_at": now + timedelta(minutes=10),
    }
    mock_db.temp_profiles.append(new_temp)
    mock_db.save_temp_profiles()

    print(f"sending verification code to: {payload.phone}")
    print("code sent: 123456")
    return {"success": True, "message": "Code sent successfully"}


@router.post("/resend-code", status_code=status.HTTP_200_OK)
async def resend_code(payload: ResendCodeRequest):
    now = datetime.utcnow()
    user_data = next((tp for tp in mock_db.temp_profiles if tp.get("phone") == payload.phone), None)

    if not user_data:
        raise HTTPException(status_code=404, detail="No pending registration found for this phone number")

    if isinstance(user_data.get("expires_at"), datetime) and now > user_data["expires_at"]:
        mock_db.temp_profiles.remove(user_data)
        mock_db.save_temp_profiles()
        raise HTTPException(status_code=404, detail="Verification session expired. Please register again.")

    # Refresh expiration
    user_data["expires_at"] = now + timedelta(minutes=10)
    mock_db.save_temp_profiles()

    print(f"resending verification code to: {payload.phone}")
    print("code sent: 123456")
    return {"success": True, "message": "Code resent successfully"}


@router.post("/verify-code", status_code=status.HTTP_201_CREATED)
async def verifyCode(code: CodeResponse):
    now = datetime.utcnow()
    user_data = next((tp for tp in mock_db.temp_profiles if tp.get("phone") == code.phone), None)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending registration found for this phone number."
        )

    if isinstance(user_data.get("expires_at"), datetime) and now > user_data["expires_at"]:
        mock_db.temp_profiles.remove(user_data)
        mock_db.save_temp_profiles()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired. Please request a new code."
        )

    import uuid
    if code.code == "123456":
        new_user_id = f"usr-patient-{uuid.uuid4().hex[:8]}"
        new_profile = {
            "id": new_user_id,
            "phone": user_data.get("phone"),
            "email": user_data.get("email"),
            "password": user_data.get("password"),
            "role": "patient",
            "first_name": None,
            "last_name": None,
            "date_of_birth": None,
            "sex": None,
            "height_cm": None,
            "weight_kg": None,
            "avatar_url": None,
            "health_goals": [],
            "onboarding_status": "pending",
            "account_status": "active",
            "created_at": now,
            "updated_at": now,
        }

        mock_db.profiles.append(new_profile)
        mock_db.save_profiles()

        # Remove from temp profiles
        mock_db.temp_profiles.remove(user_data)
        mock_db.save_temp_profiles()

        return {"success": True, "message": "Verified successfully", "user_id": new_user_id}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Verification Code"
        )



from app.utils.security import create_access_token, token_blacklist
import uuid

@router.post("/login")
async def login(payload: Login):
    import hashlib
    hashed_input = hashlib.sha256(payload.password.encode()).hexdigest()
    for profile in mock_db.profiles:
        if profile.get("email") == payload.identifier or profile.get("phone") == payload.identifier:
            if profile.get("password") == hashed_input:
                if profile.get("account_status") != "active":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access Denied: Account is disabled or archived"
                    )
                access_token = create_access_token(
                    data={
                        "user_id": profile["id"],
                        "role": profile.get("role", "patient")
                    }
                )
                return {
                    "success": True, 
                    "message": "Login Successfully", 
                    "user_id": profile["id"],
                    "token": access_token
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials"
                )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials"
    )


# In-memory store for 2FA sessions during mock phase
temp_2fa_sessions = {}

# In-memory rate limiting
login_attempts = {}

def check_rate_limit(identifier: str):
    now = datetime.utcnow()
    attempts = login_attempts.get(identifier, {"count": 0, "locked_until": None})
    if attempts["locked_until"] and now < attempts["locked_until"]:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please try again in 15 minutes.")
    return attempts

def record_failed_attempt(identifier: str):
    now = datetime.utcnow()
    attempts = login_attempts.get(identifier, {"count": 0, "locked_until": None})
    # Reset count if it was locked previously and time passed
    if attempts["locked_until"] and now >= attempts["locked_until"]:
         attempts["count"] = 0
         attempts["locked_until"] = None
         
    was_already_locked = bool(attempts.get("locked_until") and now < attempts["locked_until"])
    attempts["count"] += 1
    if attempts["count"] >= 5:
        attempts["locked_until"] = now + timedelta(minutes=15)
        if not was_already_locked:
            try:
                from app.services.admin_notifications import create_admin_notification
                create_admin_notification(
                    type="security",
                    title="Rate Limit Lockout",
                    message="Multiple failed authentication attempts triggered a temporary lockout.",
                    severity="warning",
                    recipient_roles=["admin", "super_admin"],
                    route="/settings",
                    target_id=None
                )
            except Exception as e:
                print(f"Failed to create admin notification for rate limit lockout: {e}")
    login_attempts[identifier] = attempts

def clear_attempts(identifier: str):
    if identifier in login_attempts:
        del login_attempts[identifier]

@router.post("/web-login")
async def web_login(payload: Login):
    check_rate_limit(payload.identifier)
    
    import hashlib
    hashed_input = hashlib.sha256(payload.password.encode()).hexdigest()
    for profile in mock_db.profiles:
        if profile.get("email") == payload.identifier or profile.get("phone") == payload.identifier:
            if profile.get("password") == hashed_input:
                # Enforce RBAC
                if profile.get("role") not in ["admin", "medical_expert", "super_admin"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail="Access Denied. This portal is strictly for Admins and Medical Experts."
                    )
                
                # Create 2FA Session
                token_2fa = f"2fa-{uuid.uuid4().hex}"
                temp_2fa_sessions[token_2fa] = {
                    "user_id": profile["id"],
                    "role": profile["role"],
                    "remember": payload.remember,
                    "expires_at": datetime.utcnow() + timedelta(minutes=5)
                }
                
                print(f"\n{'='*40}")
                print(f"2FA CODE FOR {payload.identifier}: 123456")
                print(f"{'='*40}\n")
                
                
                clear_attempts(payload.identifier)
                return {
                    "success": True, 
                    "requires_2fa": True,
                    "token_2fa": token_2fa,
                    "message": "Credentials verified. Please enter the 6-digit code sent to your device."
                }
            else:
                record_failed_attempt(payload.identifier)
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials"
                )

    record_failed_attempt(payload.identifier)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials"
    )

from app.schemas.auth import WebVerify2FA

@router.post("/web-login/verify-2fa")
async def web_login_verify_2fa(payload: WebVerify2FA):
    session = temp_2fa_sessions.get(payload.token_2fa)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired 2FA session."
        )
        
    if datetime.utcnow() > session["expires_at"]:
        del temp_2fa_sessions[payload.token_2fa]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="2FA session expired. Please log in again."
        )
        
    if payload.code != "123456":
        # Usually we would track rate limits on the 2FA token as well, 
        # but for mock phase this is sufficient.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA Code."
        )
        
    # Generate Final JWT
    expires_delta = timedelta(days=30) if session.get("remember") else None
    access_token = create_access_token(data={"user_id": session["user_id"], "role": session["role"]}, expires_delta=expires_delta)
    
    # Cleanup session
    del temp_2fa_sessions[payload.token_2fa]
    
    return {
        "success": True, 
        "message": "Login Successfully", 
        "user_id": session["user_id"],
        "role": session["role"],
        "token": access_token
    }

from fastapi import Header
from app.utils.security import token_blacklist
@router.post("/logout")
async def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        token_blacklist.add(token)
    return {"success": True, "message": "Logged out successfully"}

import random
import string
from app.schemas.auth import ForgotPasswordRequest

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    import hashlib
    for profile in mock_db.profiles:
        if profile.get("email") == payload.identifier or profile.get("phone") == payload.identifier:
            temp_pass = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            profile["password"] = hashlib.sha256(temp_pass.encode()).hexdigest()
            mock_db.save_profiles()
            print(f"\n{'='*40}")
            print(f"TEMP PASS FOR {payload.identifier}: {temp_pass}")
            print(f"{'='*40}\n")
            return {"success": True, "message": "Temporary password sent", "temp_password": temp_pass}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="This phone or email is not registered."
    )


# @router.post(
#     "/register",
#     response_model=AuthResponse,
#     status_code=status.HTTP_201_CREATED,
#     summary="Register a new user",
# )
# async def register(payload: RegisterRequest):
#     for profile in OFFLINE_PROFILES_DB:
#         if profile == payload.phone:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate Phone Number"
#             )

#     new_user_id = f"usr-{len(OFFLINE_PROFILES_DB + 1)}"
#     new_profile = {
#         "id": new_user_id,
#         "phone": payload.phone,
#         "password": payload.password,
#         "email": payload.email,
#         "role": "patient",
#     }

#     OFFLINE_PROFILES_DB.append(new_profile)

#     return AuthResponse(
#         message="Registration Successful",
#         user={
#             "id": new_profile["id"],
#             "phone": new_profile["phone"],
#             "email": new_profile["email"],
#         },
#     )
