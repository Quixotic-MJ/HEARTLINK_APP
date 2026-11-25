"""
HL-171 (panel revision, 2026-11-25): barangay emergency contacts.

The app downloads the public list and picks the nearest barangay on the phone, so a user's location never reaches the
server. A hotline goes out only once an admin has called it and ticked "checked" (a wrong emergency number is
dangerous), the same rule as the clinic directory (app/services/clinics.py). Admins add and edit barangays on the
portal's "Barangay contacts" page; changing a number clears the check unless the admin confirms the new one.
"""
import re
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.db.repositories import get_barangay_contacts_repo
from app.utils.time import utc_now

MAX_TEXT = 200
MAX_NOTE = 1000
LOCATION_KINDS = ("hall", "centre")
EDITABLE = ("name", "city", "hall_address", "latitude", "longitude", "location_kind", "hotline_1", "hotline_2",
            "numbers_checked", "note", "active")


def _bad(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _number(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def valid_phone(value: str) -> bool:
    """A Philippine landline, mobile or short hotline: digits with spaces, dashes or brackets, 3 to 13 digits."""
    if not re.fullmatch(r"\+?[0-9 ()\-]+", value):
        return False
    return 3 <= len(re.sub(r"\D", "", value)) <= 13


def public_barangay(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    lat, lng = _number(row.get("latitude")), _number(row.get("longitude"))
    if not row.get("active", True) or not row.get("name") or lat is None or lng is None:
        return None
    checked = bool(row.get("numbers_checked"))
    phones = [p for p in (row.get("hotline_1"), row.get("hotline_2")) if p] if checked else []
    return {
        "id": str(row.get("id")),
        "name": row["name"],
        "city": row.get("city") or None,
        "hall_address": row.get("hall_address") or None,
        "latitude": lat,
        "longitude": lng,
        "location_kind": row.get("location_kind") if row.get("location_kind") in LOCATION_KINDS else None,
        "phones": phones,
    }


def list_public() -> List[Dict[str, Any]]:
    rows = [public_barangay(r) for r in get_barangay_contacts_repo().list_all()]
    return [r for r in rows if r]


def admin_view(row: Dict[str, Any]) -> Dict[str, Any]:
    return {k: row.get(k) for k in ("id", *EDITABLE, "checked_at", "checked_by", "source", "updated_at")}


def list_for_admin() -> List[Dict[str, Any]]:
    return [admin_view(r) for r in get_barangay_contacts_repo().list_all()]


def _text(payload: Dict[str, Any], key: str, limit: int = MAX_TEXT, required: bool = False) -> Optional[str]:
    value = str(payload.get(key) or "").strip()
    if required and not value:
        raise _bad("Enter the barangay's name." if key == "name" else f"Enter the {key.replace('_', ' ')}.")
    if len(value) > limit:
        raise _bad(f"The {key.replace('_', ' ')} is too long (at most {limit} characters).")
    return value or None


def clean(payload: Dict[str, Any], existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """The fields to save, checked. Only fields sent are changed on an edit."""
    existing = existing or {}
    out: Dict[str, Any] = {}
    sent = lambda k: k in payload
    if sent("name") or not existing:
        out["name"] = _text(payload, "name", 120, required=True)
    if sent("city") or not existing:
        out["city"] = _text(payload, "city", 120) or "Cebu City"
    if sent("hall_address"):
        out["hall_address"] = _text(payload, "hall_address")
    if sent("latitude") or sent("longitude"):
        lat, lng = payload.get("latitude"), payload.get("longitude")
        if lat in (None, "") and lng in (None, ""):
            out["latitude"] = out["longitude"] = None
        else:
            lat, lng = _number(lat), _number(lng)
            if lat is None or lng is None or not -90 <= lat <= 90 or not -180 <= lng <= 180:
                raise _bad("Enter a map location as two numbers, for example 10.3157 and 123.8854.")
            out["latitude"], out["longitude"] = lat, lng
    if sent("location_kind"):
        kind = payload.get("location_kind") or None
        if kind not in (None, *LOCATION_KINDS):
            raise _bad("The location is either the barangay hall or the middle of the barangay.")
        out["location_kind"] = kind
    for key in ("hotline_1", "hotline_2"):
        if sent(key):
            phone = _text(payload, key, 40)
            if phone and not valid_phone(phone):
                raise _bad("Enter phone numbers with digits only, for example 032 255 1234 or 0917 123 4567.")
            out[key] = phone
    if sent("note"):
        out["note"] = _text(payload, "note", MAX_NOTE)
    if sent("active"):
        out["active"] = bool(payload.get("active"))

    phones_now = [out.get(k, existing.get(k)) for k in ("hotline_1", "hotline_2")]
    numbers_changed = any(k in out and out[k] != existing.get(k) for k in ("hotline_1", "hotline_2"))
    confirm = payload.get("numbers_checked")
    if confirm is True:
        if not any(phones_now):
            raise _bad("Add a hotline number before marking it as checked.")
        if numbers_changed or not existing.get("numbers_checked"):
            out["numbers_checked"] = True
            out["checked_at"] = utc_now().isoformat()
    elif confirm is False or numbers_changed or not any(phones_now):
        # A changed or removed number has to be checked again
        out["numbers_checked"] = False
        out["checked_at"] = None
    return out


def create(payload: Dict[str, Any], admin_id: Optional[str]) -> Dict[str, Any]:
    row = clean(payload or {})
    if row.get("numbers_checked"):
        row["checked_by"] = admin_id
    row["source"] = "team"
    return admin_view(get_barangay_contacts_repo().create(row) or row)


def update(barangay_id: str, payload: Dict[str, Any], admin_id: Optional[str]) -> Dict[str, Any]:
    repo = get_barangay_contacts_repo()
    existing = repo.get(barangay_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found.")
    patch = clean(payload or {}, existing)
    if patch.get("numbers_checked"):
        patch["checked_by"] = admin_id
    elif patch.get("numbers_checked") is False:
        patch["checked_by"] = None
    patch["updated_at"] = utc_now().isoformat()
    return admin_view(repo.update(barangay_id, patch) or {**existing, **patch})
