# backend/app/api/auth/auth.py
"""
HeartLink Authentication API Gateway.
Routes registration, OTP verification, password login, 2FA, password recovery, and session invalidation through the authoritative AuthService.
"""
from typing import Optional
from fastapi import APIRouter, Depends, status, HTTPException, Request, Response, Security
from fastapi.security import HTTPAuthorizationCredentials
from app.schemas.auth import (
    RegisterRequest, CodeResponse, Login, ResendCodeRequest, WebVerify2FA, ForgotPasswordRequest,
    RefreshRequest, LogoutRequest,
)
from app.services.auth_service import get_auth_service
from app.services.session_service import issue_session, refresh_session, revoke_session
from app.utils.rate_limiter import limiter
from app.utils.security import (
    security,
    revoke_token,
    get_optional_token,
    get_current_admin_user,
    set_auth_cookies,
    clear_auth_cookies,
    enforce_csrf,
    verify_token,
    REFRESH_COOKIE_NAME,
)
from app.db.repositories import get_profile_repo

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _with_mobile_session(result: dict) -> dict:
    """HL-047: swaps the plain login token for a short access token plus a refresh token."""
    claims = verify_token(result["token"])
    session = issue_session(claims["user_id"], claims["role"], "mobile")
    return {
        **result,
        "token": session["token"],
        "refresh_token": session["refresh_token"],
        "expires_in": session["expires_in"],
    }




@router.post("/request-code", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def request_code(payload: RegisterRequest, request: Request, response: Response):
    auth_svc = get_auth_service()
    return auth_svc.request_registration_otp(
        phone=payload.phone,
        email=payload.email,
        password=payload.password
    )

@router.post("/resend-code", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def resend_code(payload: ResendCodeRequest, request: Request, response: Response):
    auth_svc = get_auth_service()
    return auth_svc.resend_registration_otp(phone=payload.phone)

@router.post("/verify-code", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def verify_code(code: CodeResponse, request: Request, response: Response):
    auth_svc = get_auth_service()
    return _with_mobile_session(auth_svc.verify_registration_otp(phone=code.phone, code=code.code))

@router.post("/login")
@limiter.limit("5/minute")
async def login(payload: Login, request: Request, response: Response):
    auth_svc = get_auth_service()
    return _with_mobile_session(auth_svc.login(identifier=payload.identifier, password=payload.password))

@router.post("/web-login")
@limiter.limit("5/minute")
async def web_login(payload: Login, request: Request, response: Response):
    auth_svc = get_auth_service()
    result = auth_svc.web_login(identifier=payload.identifier, password=payload.password, remember=payload.remember)
    # HL-033: the web portal token lives only in an HttpOnly cookie, never in the response body.
    # HL-047: plus a refresh cookie, so the short access token can be renewed quietly.
    token = result.pop("token", None)
    if token:
        session = issue_session(result["user_id"], result["role"], "web", remember=bool(payload.remember))
        set_auth_cookies(response, session)
    return result

@router.post("/web-login/verify-2fa")
@limiter.limit("3/minute")
async def web_login_verify_2fa(payload: WebVerify2FA, request: Request, response: Response):
    auth_svc = get_auth_service()
    result = auth_svc.verify_2fa(token_2fa=payload.token_2fa, code=payload.code)
    token = result.pop("token", None) if isinstance(result, dict) else None
    if token:
        session = issue_session(result["user_id"], result["role"], "web", remember=bool(getattr(payload, "remember", False)))
        set_auth_cookies(response, session)
    return result

@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh(request: Request, response: Response, payload: Optional[RefreshRequest] = None):
    """HL-047: a new access token for a valid refresh token. The old refresh token stops working."""
    if payload and payload.refresh_token:
        session = refresh_session(payload.refresh_token, "mobile")
        return {"token": session["token"], "refresh_token": session["refresh_token"], "expires_in": session["expires_in"]}

    enforce_csrf(request)
    session = refresh_session(request.cookies.get(REFRESH_COOKIE_NAME), "web")
    set_auth_cookies(response, session)
    return {"success": True, "expires_in": session["expires_in"]}

@router.get("/me")
async def me(current_user: dict = Depends(get_current_admin_user)):
    """Session probe for the web portal: resolves the cookie-authenticated admin/expert profile."""
    profile = get_profile_repo().get_by_id(current_user["user_id"]) or {}
    return {
        "user_id": current_user["user_id"],
        "role": profile.get("role") or current_user.get("role"),
        "expert_type": profile.get("expert_type"),
        "first_name": profile.get("first_name", ""),
        "last_name": profile.get("last_name", ""),
        "email": profile.get("email", ""),
        "phone": profile.get("phone", ""),
        "must_change_password": bool(profile.get("must_change_password")),
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    payload: Optional[LogoutRequest] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    token = get_optional_token(request, credentials)
    if token:
        revoke_token(token)
    # HL-047: the refresh token (mobile body or web cookie) stops working too
    revoke_session((payload.refresh_token if payload else None) or request.cookies.get(REFRESH_COOKIE_NAME))
    clear_auth_cookies(response)
    return {"success": True, "message": "Logged out successfully"}

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(payload: ForgotPasswordRequest, request: Request, response: Response):
    auth_svc = get_auth_service()
    return auth_svc.forgot_password(identifier=payload.identifier)
