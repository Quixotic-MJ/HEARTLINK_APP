"""HL-171 (panel revision): barangay emergency contacts (app/services/barangays.py).

- GET /api/barangays: the public list the app downloads (no sign-in, checked numbers only). The app picks the nearest
  barangay on the phone, so a user's location is never sent here.
- /api/admin/barangays: admins list, add and edit barangays on the portal's "Barangay contacts" page.
"""
from fastapi import APIRouter, Depends

from app.services import barangays
from app.utils.activity_helper import record_admin_activity
from app.utils.security import get_current_admin_only

router = APIRouter(tags=["Barangay contacts"])


@router.get("/api/barangays")
def public_barangays():
    return barangays.list_public()


@router.get("/api/admin/barangays")
def admin_barangays(current_user: dict = Depends(get_current_admin_only)):
    return barangays.list_for_admin()


def _log(current_user: dict, action: str, row: dict) -> None:
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action=action,
        target_type="barangay",
        target_id=str(row.get("id") or ""),
        target_name=row.get("name"),
    )


@router.post("/api/admin/barangays")
def add_barangay(payload: dict, current_user: dict = Depends(get_current_admin_only)):
    row = barangays.create(payload or {}, current_user.get("user_id"))
    _log(current_user, "added a barangay contact", row)
    return row


@router.put("/api/admin/barangays/{barangay_id}")
def edit_barangay(barangay_id: str, payload: dict, current_user: dict = Depends(get_current_admin_only)):
    row = barangays.update(barangay_id, payload or {}, current_user.get("user_id"))
    if (payload or {}).get("numbers_checked") is True and row.get("numbers_checked"):
        action = "checked a barangay's hotline"
    elif (payload or {}).get("active") is False:
        action = "hid a barangay contact"
    else:
        action = "edited a barangay contact"
    _log(current_user, action, row)
    return row
