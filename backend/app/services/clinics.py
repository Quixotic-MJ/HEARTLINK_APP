"""
HL-088: the Nearby Clinics directory the app shows (Cebu City, from OpenStreetMap, checked by the team).

Only real fields go out: what the place is, whether it has an emergency room (true / false / null = not checked),
where it is, and a phone number only once the team has checked it. No doctor names, no guessed opening hours.
"""
from typing import Any, Dict, List, Optional

from app.db.repositories import get_content_repo

KINDS = ("er_hospital", "hospital", "clinic", "health_center")


def _number(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def public_clinic(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    lat, lng = _number(row.get("latitude")), _number(row.get("longitude"))
    if not row.get("name") or row.get("kind") not in KINDS or lat is None or lng is None:
        return None
    return {
        "id": str(row.get("id") or row.get("osm_id")),
        "name": row["name"],
        "kind": row["kind"],
        "has_er": row.get("has_er"),
        "address": row.get("address") or None,
        "latitude": lat,
        "longitude": lng,
        "phone": row.get("phone") if row.get("phone_verified") and row.get("phone") else None,
        "source": row.get("source"),
    }


def list_public_clinics() -> List[Dict[str, Any]]:
    clinics = [public_clinic(r) for r in get_content_repo().list_clinics()]
    return [c for c in clinics if c]
