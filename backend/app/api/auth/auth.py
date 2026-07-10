from fastapi import APIRouter, status, HTTPException
from app.schemas.auth import RegisterRequest, UserResponsePayload, AuthResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Simulated 'profiles' table from the ERD for comprehensive offline testing
OFFLINE_PROFILES_DB = [
    {
        "id": "usr-1",
        "phone": "+639123456789",
        "password": "password123",
        "email": "john.mark@example.com",
        "role": "patient",
        "first_name": "John Mark",
        "last_name": "Magdasal",
        "date_of_birth": "2005-12-01",
        "sex": "male",
        "height_cm": 172.5,
        "weight_kg": 68.0,
        "onboarding_status": "complete",
        "account_status": "active",
    },
    {
        "id": "usr-2",
        "phone": "+639987654321",
        "password": "securepass456",
        "email": "clinical.expert@heartlink.com",
        "role": "medical_expert",
        "first_name": "Dr. Maria",
        "last_name": "Santos",
        "date_of_birth": "1980-05-14",
        "sex": "female",
        "height_cm": 160.0,
        "weight_kg": 54.5,
        "onboarding_status": "complete",
        "account_status": "active",
    },
    {
        "id": "usr-3",
        "phone": "+639151112222",
        "password": "riskpassword789",
        "email": "elevated.risk@example.com",
        "role": "patient",
        "first_name": "Pedro",
        "last_name": "Penduko",
        "date_of_birth": "1965-11-23",
        "sex": "male",
        "height_cm": 168.0,
        "weight_kg": 85.2,
        "onboarding_status": "complete",
        "account_status": "active",
    },
]


@router.post(
    "/request-code", status_code=status.HTTP_200_OK
)
async def request_code(payload: RegisterRequest):
    for profile in OFFLINE_PROFILES_DB:
        if profile["phone"] == payload.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="duplicate phone number"
            )

    print(f"sending verification code to: {payload.phone}")
    print("code sent: 123456")
    return {"success": True, "message": "code has been sent (123465)"}


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
