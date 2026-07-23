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
    mock_db.temp_profiles = [
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
    new_temp = {
        "phone": payload.phone,
        "email": payload.email,
        "password": payload.password,
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

    if code.code == "123456":
        new_user_id = f"usr-patient-{len(mock_db.profiles) + 101}"
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



@router.post("/login")
async def login(payload: Login):
    for profile in mock_db.profiles:
        if profile.get("email") == payload.identifier or profile.get("phone") == payload.identifier:
            if profile.get("password") == payload.password:
                return {"success": True, "message": "Login Successfully", "user_id": profile["id"]}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials"
                )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials"
    )

import random
import string
from app.schemas.auth import ForgotPasswordRequest

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    for profile in mock_db.profiles:
        if profile.get("email") == payload.identifier or profile.get("phone") == payload.identifier:
            temp_pass = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            profile["password"] = temp_pass
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
