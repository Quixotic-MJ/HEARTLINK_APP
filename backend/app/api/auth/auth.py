from fastapi import APIRouter, status, HTTPException
from app.schemas.auth import RegisterRequest, CodeResponse
import app.mock_db as mock_db

temp_profile = {}

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/request-code", status_code=status.HTTP_200_OK)
async def request_code(payload: RegisterRequest):
    global temp_profile
    for profile in mock_db.profiles:
        if profile.get("phone") == payload.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="duplicate phone number"
            )

    temp_profile[payload.phone] = {
        "phone": payload.phone,
        "email": payload.email,
        "password": payload.password,
    }

    print(f"sending verification code to: {payload.phone}")
    print("code sent: 123456")
    return {"success": True, "message": "Code sent successfully"}


@router.post("/verify-code", status_code=status.HTTP_201_CREATED)
async def verifyCode(code: CodeResponse):
    global temp_profile
    user_data = temp_profile.get(code.phone)
    if code.code == "123456":
        new_user_id = f"usr-patient-{len(mock_db.profiles) + 101 }"
        new_profile = {
            "id": new_user_id,
            "phone": user_data.get("phone"),
            "email": user_data.get("email"),
            "password": user_data.get("password"),
            "role": "patient",
        }

        mock_db.profiles.append(new_profile)
        temp_profile.pop(code.phone, None)
        return {"success": True, "message": "Verified successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Verification Code"
        )


@router.get("/test/{phone}")
async def test(phone: str):
    for profile in mock_db.profiles:
        if profile.get("phone") == phone:
            return {"message": f"phone number: {phone}, email: {profile.get('email')}"}


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
