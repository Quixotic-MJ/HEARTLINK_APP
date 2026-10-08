import os
import jwt
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.repositories import get_profile_repo
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.db.client import get_supabase_client

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY in ("heartlink-super-secret-jwt-key", "heartlink-dev-jwt-key-not-for-production", "your-super-secret-jwt-key-change-in-production"):
    raise RuntimeError("FATAL SECURITY CONFIGURATION: Insecure or missing SECRET_KEY environment variable.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        role = data.get("role", "patient")
        if role in ["admin", "super_admin", "medical_expert"]:
            expire = utc_now() + timedelta(days=7)
        else:
            expire = utc_now() + timedelta(days=30)
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

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
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
        
    return payload

def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
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
        
    if token_role not in ["admin", "medical_expert", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admins/Experts only",
        )
        
    return payload

def get_current_super_admin(current_user: dict = Depends(get_current_admin_user)):
    role = current_user.get("role")
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Super Admin only",
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

    # 3. Medical expert / Clinician: Allowed if self, assigned care team member, or active clinical reviewer
    if caller_role in ["doctor", "clinician", "medical_expert"]:
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

