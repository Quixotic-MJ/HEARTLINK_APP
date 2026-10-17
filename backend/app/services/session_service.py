# backend/app/services/session_service.py
"""
HeartLink Session Service (HL-047).
Short-lived access tokens plus refresh tokens. A refresh token is random, stored only as a SHA-256
hash, rotated on every use, and revoked on logout or password change. Using an already-rotated token
again (after a short grace window) revokes all of that user's sessions, since it was probably stolen.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.db.repositories import get_profile_repo, get_refresh_token_repo
from app.utils.security import STAFF_ROLES, access_token_lifetime, create_access_token
from app.utils.time import parse_utc, utc_now

logger = logging.getLogger(__name__)

# Staff: "Stay signed in" keeps the same 7 days as before; otherwise 1 day. A fixed end date.
# Patients: 30 days, extended on every refresh, so an active patient stays logged in.
STAFF_REFRESH_REMEMBER = timedelta(days=7)
STAFF_REFRESH_SESSION = timedelta(days=1)
PATIENT_REFRESH = timedelta(days=30)

# Two browser tabs can refresh with the same cookie at the same moment; that is not theft
ROTATION_GRACE = timedelta(seconds=60)

SESSION_EXPIRED_DETAIL = "Your session has expired. Please log in again."
CLIENTS = ("web", "mobile")


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _refresh_lifetime(role: str, remember: bool) -> timedelta:
    if role in STAFF_ROLES:
        return STAFF_REFRESH_REMEMBER if remember else STAFF_REFRESH_SESSION
    return PATIENT_REFRESH


def _expired() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL)


def issue_session(user_id: str, role: str, client: str, remember: bool = True,
                  expires_at: Optional[datetime] = None) -> Dict[str, Any]:
    """Creates an access token and a new refresh token for this user and app (web or mobile)."""
    if client not in CLIENTS:
        raise ValueError(f"Unknown client: {client}")
    repo = get_refresh_token_repo()
    repo.delete_expired()

    now = utc_now()
    expires_at = expires_at or (now + _refresh_lifetime(role, remember))
    raw = secrets.token_urlsafe(48)
    repo.create({
        "user_id": user_id,
        "token_hash": _hash(raw),
        "client": client,
        "remember": remember,
        "expires_at": expires_at.isoformat(),
    })
    return {
        "token": create_access_token({"user_id": user_id, "role": role}),
        "refresh_token": raw,
        "expires_in": int(access_token_lifetime(role).total_seconds()),
        "refresh_expires_in": max(1, int((expires_at - now).total_seconds())),
        "remember": remember,
    }


def refresh_session(raw: Optional[str], client: str) -> Dict[str, Any]:
    """Swaps a valid refresh token for a new access token and a new refresh token."""
    if not raw:
        raise _expired()
    repo = get_refresh_token_repo()
    row = repo.get_by_hash(_hash(raw))
    if not row or row.get("client") != client:
        raise _expired()

    if row.get("revoked_at"):
        revoked_at = parse_utc(row["revoked_at"])
        if row.get("revoked_reason") == "rotated" and revoked_at and utc_now() - revoked_at > ROTATION_GRACE:
            repo.revoke_all_for_user(row["user_id"], "reuse_detected")
            logger.warning("Refresh token reused for user %s; all of their sessions were revoked", row["user_id"])
        raise _expired()

    expires_at = parse_utc(row.get("expires_at"))
    if not expires_at or expires_at <= utc_now():
        raise _expired()

    profile = get_profile_repo().get_by_id(row["user_id"])
    if not profile or profile.get("account_status") != "active":
        repo.revoke(row["id"], "account_inactive")
        raise _expired()

    role = profile.get("role") or "patient"
    repo.revoke(row["id"], "rotated")
    keep_end = expires_at if role in STAFF_ROLES else None
    return issue_session(row["user_id"], role, client, remember=row.get("remember", True), expires_at=keep_end)


def revoke_session(raw: Optional[str], reason: str = "logout") -> None:
    """Logout: the refresh token stops working. Never fails the logout itself."""
    if not raw:
        return
    try:
        repo = get_refresh_token_repo()
        row = repo.get_by_hash(_hash(raw))
        if row and not row.get("revoked_at"):
            repo.revoke(row["id"], reason)
    except Exception as e:
        logger.warning("Could not revoke the refresh token on logout (%s)", type(e).__name__)


def restart_after_password_change(user_id: str, role: str, client: str,
                                  current_refresh: Optional[str] = None) -> Dict[str, Any]:
    """
    Password change: every session of this user ends (other devices are logged out), and the person
    who changed it gets a fresh session so they stay logged in here.
    """
    repo = get_refresh_token_repo()
    remember = True
    if current_refresh:
        row = repo.get_by_hash(_hash(current_refresh))
        if row and row.get("user_id") == user_id:
            remember = row.get("remember", True)
    repo.revoke_all_for_user(user_id, "password_change")
    return issue_session(user_id, role, client, remember=remember)
