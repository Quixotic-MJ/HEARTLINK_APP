import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.repositories import get_profile_repo

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "heartlink-super-secret-jwt-key":
    if os.getenv("DATABASE_MODE") == "supabase" or os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError("FATAL SECURITY CONFIGURATION: Insecure or missing SECRET_KEY environment variable.")
    SECRET_KEY = SECRET_KEY or "heartlink-dev-jwt-key-not-for-production"

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# In-memory blacklist for revoked tokens
token_blacklist = set()

def verify_token(token: str) -> Dict[str, Any]:
    if token in token_blacklist:
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

