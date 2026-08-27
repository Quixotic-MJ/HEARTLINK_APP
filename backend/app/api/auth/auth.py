# backend/app/api/auth/auth.py
"""
HeartLink Authentication API Gateway.
Routes registration, OTP verification, password login, 2FA, password recovery, and session invalidation through the authoritative AuthService.
"""
from fastapi import APIRouter, status, HTTPException, Header
from app.schemas.auth import RegisterRequest, CodeResponse, Login, ResendCodeRequest, WebVerify2FA, ForgotPasswordRequest
from app.utils.security import token_blacklist
from app.services.auth_service import get_auth_service, MockAuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Exported for backwards compatibility with existing test fixtures in mock mode
_mock_instance = MockAuthService()
login_attempts = _mock_instance.login_attempts
temp_2fa_sessions = _mock_instance.temp_2fa_sessions

def check_rate_limit(identifier: str):
    return _mock_instance._check_rate_limit(identifier)

def record_failed_attempt(identifier: str):
    return _mock_instance._record_failed_attempt(identifier)

def clear_attempts(identifier: str):
    return _mock_instance._clear_attempts(identifier)


@router.post("/request-code", status_code=status.HTTP_200_OK)
async def request_code(payload: RegisterRequest):
    auth_svc = get_auth_service()
    return auth_svc.request_registration_otp(
        phone=payload.phone,
        email=payload.email,
        password=payload.password
    )

@router.post("/resend-code", status_code=status.HTTP_200_OK)
async def resend_code(payload: ResendCodeRequest):
    auth_svc = get_auth_service()
    return auth_svc.resend_registration_otp(phone=payload.phone)

@router.post("/verify-code", status_code=status.HTTP_201_CREATED)
async def verify_code(code: CodeResponse):
    auth_svc = get_auth_service()
    return auth_svc.verify_registration_otp(phone=code.phone, code=code.code)

@router.post("/login")
async def login(payload: Login):
    auth_svc = get_auth_service()
    return auth_svc.login(identifier=payload.identifier, password=payload.password)

@router.post("/web-login")
async def web_login(payload: Login):
    auth_svc = get_auth_service()
    return auth_svc.web_login(identifier=payload.identifier, password=payload.password, remember=payload.remember)

@router.post("/web-login/verify-2fa")
async def web_login_verify_2fa(payload: WebVerify2FA):
    auth_svc = get_auth_service()
    return auth_svc.verify_2fa(token_2fa=payload.token_2fa, code=payload.code)

@router.post("/logout")
async def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        token_blacklist.add(token)
    return {"success": True, "message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    auth_svc = get_auth_service()
    return auth_svc.forgot_password(identifier=payload.identifier)
