import os
import jwt
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Request, Response, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.repositories import get_profile_repo
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.db.client import get_supabase_client

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY in ("heartlink-super-secret-jwt-key", "heartlink-dev-jwt-key-not-for-production", "your-super-secret-jwt-key-change-in-production"):
    raise RuntimeError("FATAL SECURITY CONFIGURATION: Insecure or missing SECRET_KEY environment variable.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")

# HL-047: short-lived access tokens; a refresh token (session_service) quietly gets a new one.
# The *_MINUTES variables are for local testing only (e.g. 1 minute to watch a refresh happen).
STAFF_ROLES = {"admin", "super_admin", "medical_expert"}
STAFF_ACCESS_TOKEN_MINUTES = 60
PATIENT_ACCESS_TOKEN_MINUTES = 24 * 60


def access_token_lifetime(role: Optional[str]) -> timedelta:
    staff = role in STAFF_ROLES
    name = "STAFF_ACCESS_TOKEN_MINUTES" if staff else "PATIENT_ACCESS_TOKEN_MINUTES"
    default = STAFF_ACCESS_TOKEN_MINUTES if staff else PATIENT_ACCESS_TOKEN_MINUTES
    try:
        minutes = int(os.getenv(name, "") or default)
    except ValueError:
        minutes = default
    return timedelta(minutes=max(1, min(minutes, default)))

security = HTTPBearer(auto_error=False)

# Web portal session cookies (HL-033). The mobile app keeps using Bearer headers.
AUTH_COOKIE_NAME = "heartlink_admin_session"
REFRESH_COOKIE_NAME = "heartlink_admin_refresh"
REFRESH_COOKIE_PATH = "/api/auth"  # only sent to the auth endpoints (refresh, logout)
CSRF_COOKIE_NAME = "heartlink_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").strip().lower() != "false"
CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

def set_auth_cookies(response: Response, session: Dict[str, Any]) -> None:
    """
    Sets the HttpOnly access and refresh cookies plus a JS-readable CSRF cookie (double-submit).
    With "Stay signed in" the cookies last as long as the refresh token; otherwise they end with the browser.
    The access token inside expires much sooner (HL-047); the portal then calls /api/auth/refresh.
    """
    max_age = session["refresh_expires_in"] if session.get("remember") else None
    token = session["token"]
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=session["refresh_token"],
        max_age=max_age,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        path=REFRESH_COOKIE_PATH,
    )
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=secrets.token_urlsafe(32),
        max_age=max_age,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite="strict",
        path="/",
    )

def clear_auth_cookies(response: Response) -> None:
    cookies = ((AUTH_COOKIE_NAME, True, "/"), (CSRF_COOKIE_NAME, False, "/"), (REFRESH_COOKIE_NAME, True, REFRESH_COOKIE_PATH))
    for name, httponly, path in cookies:
        response.delete_cookie(
            key=name,
            path=path,
            secure=COOKIE_SECURE,
            httponly=httponly,
            samesite="strict",
        )

def enforce_csrf(request: Request) -> None:
    """Double-submit check for cookie-authenticated, state-changing requests."""
    if request.method.upper() in CSRF_SAFE_METHODS:
        return
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME) or ""
    header_token = request.headers.get(CSRF_HEADER_NAME) or ""
    if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed",
        )

def get_optional_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Returns the Bearer token if present, else the session cookie token, else None.
    Cookie-sourced tokens are CSRF-checked on unsafe methods."""
    if credentials and credentials.credentials:
        return credentials.credentials
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token:
        enforce_csrf(request)
        return cookie_token
    return None

def _require_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> str:
    token = get_optional_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = utc_now() + (expires_delta or access_token_lifetime(data.get("role", "patient")))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Single-instance in-memory cache for revoked tokens
revoked_token_hashes = set()

def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def load_revoked_tokens():
    try:
        sb = get_supabase_client()
        # Delete expired rows using UTC now
        now_iso = datetime.now(timezone.utc).isoformat()
        sb.table("revoked_tokens").delete().lt("expires_at", now_iso).execute()
        
        # Load active hashes
        res = sb.table("revoked_tokens").select("token_hash").execute()
        for row in res.data:
            revoked_token_hashes.add(row["token_hash"])
    except Exception as e:
        logger.warning(f"Failed to load revoked tokens from Supabase: {e}")

def revoke_token(token: str):
    """Verifies token, then adds its hash to the set and Supabase."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc).isoformat()
            t_hash = _token_hash(token)
            revoked_token_hashes.add(t_hash)
            
            sb = get_supabase_client()
            sb.table("revoked_tokens").upsert({
                "token_hash": t_hash,
                "expires_at": expires_at
            }, on_conflict="token_hash").execute()
    except Exception as e:
        logger.warning(f"revoke_token failed or ignored: {e}")

def verify_token(token: str) -> Dict[str, Any]:
    if _token_hash(token) in revoked_token_hashes:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        # If a distinct Supabase JWT secret is configured, attempt cryptographically verified decode
        supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if supabase_jwt_secret and supabase_jwt_secret != SECRET_KEY:
            try:
                payload = jwt.decode(token, supabase_jwt_secret, algorithms=[ALGORITHM])
                sub_id = payload.get("sub") or payload.get("user_id")
                if sub_id:
                    profile_repo = get_profile_repo()
                    prof = profile_repo.get_by_id(sub_id)
                    role = prof.get("role", "patient") if prof else payload.get("role", "patient")
                    return {
                        "user_id": sub_id,
                        "role": role,
                        "exp": payload.get("exp"),
                        "email": payload.get("email"),
                        "phone": payload.get("phone")
                    }
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or signature",
            headers={"WWW-Authenticate": "Bearer"},
        )

PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED"

def _enforce_password_change(request: Request, user_id: str, user: dict) -> None:
    """
    HL-044: while a staff account still has its temporary password, the only allowed calls are
    changing that password and the web session probe. Everything else returns 403.
    """
    if not user.get("must_change_password"):
        return
    allowed_paths = {f"/api/users/{user_id}/password", "/api/auth/me"}
    if request.url.path.rstrip("/") not in allowed_paths:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PASSWORD_CHANGE_REQUIRED,
        )

def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    token = _require_token(request, credentials)
    payload = verify_token(token)
    user_id = payload.get("user_id")
    token_role = payload.get("role")
    
    if not user_id or not token_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )
        
    profile_repo = get_profile_repo()
    user = profile_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found",
        )
        
    if user.get("account_status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Account is disabled or archived",
        )

    _enforce_password_change(request, user_id, user)
    # Lets the rate limiter count this person's requests (user_or_ip_key)
    request.state.user_id = user_id
    return payload

def get_current_admin_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    token = _require_token(request, credentials)
    payload = verify_token(token)
    user_id = payload.get("user_id")
    token_role = payload.get("role")
    
    if not user_id or not token_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )
        
    profile_repo = get_profile_repo()
    user = profile_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found",
        )
        
    if user.get("account_status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Account is disabled or archived",
        )
        
    if user.get("role") != token_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Role mismatch, please log in again",
        )
        
    if token_role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admins/Experts only",
        )

    _enforce_password_change(request, user_id, user)
    return payload

def get_current_super_admin(current_user: dict = Depends(get_current_admin_user)):
    role = current_user.get("role")
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Super Admin only",
        )
    return current_user

# HL-012: what each expert type may do. Admins and Super Admin may do everything.
# Recipes are the Dietitian's, exercises the PT's; the Cardiologist reads every patient log
# and may record vitals, but does not edit recipes or exercises.
# Patient notes (HL-039/013/040): every expert reads them; the Cardiologist writes guidance,
# Dietitians and PTs write to their shared message thread.
ADMIN_ROLES = {"admin", "super_admin"}
EXPERT_PERMISSIONS = {
    "Dietitian": {"recipes:edit", "meal_logs:read", "meal_logs:write", "vitals:read", "notes:read", "notes:message"},
    "Physical Therapist": {"exercises:edit", "exercise_logs:read", "vitals:read", "notes:read", "notes:message"},
    "Cardiologist": {"meal_logs:read", "meal_logs:write", "exercise_logs:read", "vitals:read", "vitals:write",
                     "notes:read", "notes:guidance"},
}


def has_permission(current_user: dict, permission: str) -> bool:
    role = current_user.get("role")
    if role in ADMIN_ROLES:
        return True
    if role != "medical_expert":
        return False
    # Read the expert type fresh, so a changed specialization applies straight away.
    profile = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    return permission in EXPERT_PERMISSIONS.get(profile.get("expert_type"), set())


def expert_id_if(current_user: Optional[dict], expert_type: str) -> Optional[str]:
    """The caller's id when they are a medical expert of this type (HL-026/037 approvals), else None."""
    if not current_user or current_user.get("role") != "medical_expert":
        return None
    profile = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    return current_user.get("user_id") if profile.get("expert_type") == expert_type else None


def check_expert_permission(current_user: dict, permission: str) -> None:
    """For endpoints patients use too: only medical experts are limited by their expert type."""
    if current_user.get("role") == "medical_expert" and not has_permission(current_user, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: your expert type does not cover this.",
        )


def require_permission(permission: str):
    """Staff-only dependency: admins pass, experts need `permission` for their expert type."""
    def dependency(current_user: dict = Depends(get_current_admin_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: your expert type does not cover this.",
            )
        return current_user
    return dependency


def get_current_admin_only(current_user: dict = Depends(get_current_admin_user)):
    """Admin and Super Admin only; medical experts get 403."""
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admins only",
        )
    return current_user

def verify_user_access(current_user: dict, target_user_id: str) -> None:
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role")
    
    # 1. Super admin and admin have system audit access
    if caller_role in ["super_admin", "admin"]:
        return

    # 2. Patient access: Strictly self only
    if caller_role == "patient":
        if caller_id != target_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You may only access your own health data.",
            )
        return

    # 3. Medical expert: Allowed if self, assigned care team member, or active clinical reviewer
    if caller_role == "medical_expert":
        if caller_id == target_user_id:
            return
        try:
            from app.db.repositories import get_baseline_repo
            assigned_contacts = get_baseline_repo().list_care_team(target_user_id)
            is_assigned = any(
                c.get("contact_user_id") == caller_id or c.get("user_id") == caller_id
                for c in assigned_contacts
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access Denied: You are not assigned to this patient's care team.",
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: Care team assignment verification failed.",
            )
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Unrecognized clinical role.",
    )

