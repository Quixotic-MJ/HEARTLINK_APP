# backend/app/services/premium.py
"""
HL-084: HeartLink Premium.

A patient is Premium while profiles.plan is "premium" and premium_until is in the future; nothing has to run when it
ends. Premium comes from the one free trial, a demo checkout (pays once for a month or a year, no auto-renew, test
mode: no real money and no payment details), or an admin in the portal. Premium only unlocks new features (reports,
long-term Trends, family sharing); safety features never depend on it.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status

from app.db.repositories import get_premium_repo, get_profile_repo
from app.db.repositories.premium import DEFAULT_CONFIG
from app.utils.security import get_current_user
from app.utils.time import parse_utc, utc_now

PERIOD_DAYS = {"monthly": 30, "yearly": 365}
METHODS = ("gcash", "card")
MAX_ADMIN_DAYS = 3650
CONFIG_FIELDS = ("monthly_price_php", "yearly_price_php", "trial_days", "checkout_enabled")
PREMIUM_REQUIRED = {"code": "premium_required", "message": "This is a HeartLink Premium feature."}


def is_premium(profile: Optional[Dict[str, Any]], now: Optional[datetime] = None) -> bool:
    if not profile or profile.get("plan") != "premium":
        return False
    until = parse_utc(profile.get("premium_until"))
    return bool(until and until > (now or utc_now()))


def _config() -> Dict[str, Any]:
    cfg = get_premium_repo().get_config() or {}
    return {k: cfg.get(k, DEFAULT_CONFIG[k]) for k in CONFIG_FIELDS}


def _patient(user_id: str) -> Dict[str, Any]:
    profile = get_profile_repo().get_by_id(user_id)
    if not profile or profile.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    return profile


def _extend_from(profile: Dict[str, Any], now: datetime) -> datetime:
    """A new period starts when the current Premium ends, so paying early never loses days."""
    until = parse_utc(profile.get("premium_until"))
    return until if is_premium(profile, now) and until else now


def status_for(profile: Dict[str, Any], config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    cfg = config or _config()
    now = utc_now()
    active = is_premium(profile, now)
    until = parse_utc(profile.get("premium_until"))
    return {
        "is_premium": active,
        "premium_until": until.isoformat() if active and until else None,
        "source": profile.get("premium_source") if active else None,
        "days_left": max(0, (until - now).days) if active and until else 0,
        "trial_available": not profile.get("trial_used_at") and not active and cfg["trial_days"] > 0,
        "trial_days": cfg["trial_days"],
        "monthly_price_php": cfg["monthly_price_php"],
        "yearly_price_php": cfg["yearly_price_php"],
        "checkout_enabled": cfg["checkout_enabled"],
        "test_mode": True,
    }


def _save(user_id: str, fields: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    updated = get_profile_repo().update(user_id, fields)
    if not updated:
        raise HTTPException(status_code=500, detail="Couldn't update the plan. Try again.")
    get_premium_repo().add_event({"user_id": user_id, **event})
    return updated


def start_trial(user_id: str) -> Dict[str, Any]:
    profile = _patient(user_id)
    cfg = _config()
    if profile.get("trial_used_at") or is_premium(profile) or cfg["trial_days"] <= 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The free trial isn't available on this account.")
    now = utc_now()
    until = now + timedelta(days=cfg["trial_days"])
    updated = _save(
        user_id,
        {"plan": "premium", "premium_until": until.isoformat(), "premium_source": "trial", "trial_used_at": now.isoformat()},
        {"kind": "trial_started", "period": "trial", "premium_until": until.isoformat(), "actor_id": user_id},
    )
    return status_for(updated, cfg)


def checkout(user_id: str, period: str, method: str) -> Dict[str, Any]:
    """Demo checkout: nothing is charged and no payment details are sent or stored."""
    if period not in PERIOD_DAYS:
        raise HTTPException(status_code=400, detail="Choose monthly or yearly.")
    if method not in METHODS:
        raise HTTPException(status_code=400, detail="Choose GCash or card.")
    cfg = _config()
    if not cfg["checkout_enabled"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Premium sign-ups are paused right now.")
    profile = _patient(user_id)
    now = utc_now()
    until = _extend_from(profile, now) + timedelta(days=PERIOD_DAYS[period])
    amount = cfg["monthly_price_php"] if period == "monthly" else cfg["yearly_price_php"]
    updated = _save(
        user_id,
        {"plan": "premium", "premium_until": until.isoformat(), "premium_source": "checkout"},
        {"kind": "checkout", "period": period, "amount_php": amount, "method": method,
         "premium_until": until.isoformat(), "actor_id": user_id},
    )
    return status_for(updated, cfg)


def admin_set_plan(user_id: str, premium: bool, days: Optional[int], admin_id: str) -> Dict[str, Any]:
    profile = _patient(user_id)
    now = utc_now()
    if premium:
        if not isinstance(days, int) or isinstance(days, bool) or not 1 <= days <= MAX_ADMIN_DAYS:
            raise HTTPException(status_code=400, detail=f"Give Premium for 1 to {MAX_ADMIN_DAYS} days.")
        until = _extend_from(profile, now) + timedelta(days=days)
        fields = {"plan": "premium", "premium_until": until.isoformat(), "premium_source": "admin"}
        event = {"kind": "admin_granted", "period": "custom", "premium_until": until.isoformat(), "actor_id": admin_id}
    else:
        fields = {"plan": "free", "premium_until": None, "premium_source": None}
        event = {"kind": "admin_removed", "actor_id": admin_id}
    return status_for(_save(user_id, fields, event))


def get_config() -> Dict[str, Any]:
    return _config()


def update_config(payload: Dict[str, Any], admin_id: str) -> Dict[str, Any]:
    limits = {"monthly_price_php": (0, 100000), "yearly_price_php": (0, 1000000), "trial_days": (0, 90)}
    changes: Dict[str, Any] = {}
    for field, (low, high) in limits.items():
        if field in payload:
            value = payload[field]
            if not isinstance(value, int) or isinstance(value, bool) or not low <= value <= high:
                raise HTTPException(status_code=400, detail=f"{field} must be a whole number from {low} to {high}.")
            changes[field] = value
    if "checkout_enabled" in payload:
        if not isinstance(payload["checkout_enabled"], bool):
            raise HTTPException(status_code=400, detail="checkout_enabled must be true or false.")
        changes["checkout_enabled"] = payload["checkout_enabled"]
    if not changes:
        raise HTTPException(status_code=400, detail="Nothing to change.")
    saved = get_premium_repo().update_config({**changes, "updated_by": admin_id, "updated_at": utc_now().isoformat()})
    if not saved:
        raise HTTPException(status_code=500, detail="Couldn't save the plan settings.")
    return _config()


def summary(event_limit: int = 30) -> Dict[str, Any]:
    """The portal's Premium page: who is Premium now, and the latest changes with names."""
    now = utc_now()
    patients = get_profile_repo().list_all(role_filter="patient")
    active = [p for p in patients if is_premium(p, now)]
    names = {p.get("id"): _name(p) for p in get_profile_repo().list_all(exclude_archived=False)}
    all_events = get_premium_repo().list_events(5000)
    events = all_events[:event_limit]
    return {
        "config": _config(),
        "patients": len(patients),
        "premium_members": len(active),
        "on_trial": sum(1 for p in active if p.get("premium_source") == "trial"),
        "by_admin": sum(1 for p in active if p.get("premium_source") == "admin"),
        "paid_demo": sum(1 for p in active if p.get("premium_source") == "checkout"),
        "demo_revenue_php": sum(e.get("amount_php") or 0 for e in all_events if e.get("kind") == "checkout"),
        "events": [_event_row(e, names) for e in events],
    }


def _name(profile: Dict[str, Any]) -> str:
    return f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip() or profile.get("email") or "Unknown"


def _event_row(event: Dict[str, Any], names: Dict[str, str]) -> Dict[str, Any]:
    return {
        "id": event.get("id"),
        "kind": event.get("kind"),
        "period": event.get("period"),
        "amount_php": event.get("amount_php"),
        "method": event.get("method"),
        "premium_until": event.get("premium_until"),
        "created_at": event.get("created_at"),
        "user_id": event.get("user_id"),
        "user_name": names.get(event.get("user_id"), "Unknown"),
        "actor_name": names.get(event.get("actor_id")) if event.get("actor_id") != event.get("user_id") else None,
    }


def require_premium(current_user: dict = Depends(get_current_user)) -> dict:
    """For a patient's own Premium features (HL-085..087)."""
    if not is_premium(get_profile_repo().get_by_id(current_user.get("user_id"))):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PREMIUM_REQUIRED)
    return current_user
