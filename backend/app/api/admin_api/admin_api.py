from fastapi import APIRouter, Body, Depends, HTTPException
from typing import Dict, Any, Optional, List
import os
import hashlib
import secrets
import string
from app.utils.security import get_current_admin_only
from app.utils.time import utc_now
from app.utils.activity_helper import record_admin_activity
from app.db.client import get_supabase_client
from app.db.repositories import (
    get_profile_repo,
    get_content_repo,
    get_notification_repo,
    get_admin_repo,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

from app.schemas.user import normalize_expert_type
import logging

logger = logging.getLogger(__name__)

def _resolve_expert_type(target_role: str, raw: Any) -> Optional[str]:
    """
    Resolves and validates the expert specialization for a staff role.
    - If target_role is 'medical_expert':
        - missing/blank -> raises HTTPException 400 'expert_type is required when role is medical_expert'
        - unknown -> raises HTTPException 400 "Invalid expert_type: '<raw>'. Must be one of: 'Physical Therapist', 'Dietitian', 'Cardiologist'."
        - valid -> returns canonical string ('Physical Therapist', 'Dietitian', 'Cardiologist')
    - Any other role (e.g. 'admin') -> returns None
    """
    if target_role == "medical_expert":
        if not raw or not str(raw).strip():
            raise HTTPException(status_code=400, detail="expert_type is required when role is medical_expert")
        canonical = normalize_expert_type(raw)
        if not canonical:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid expert_type: '{raw}'. Must be one of: 'Physical Therapist', 'Dietitian', 'Cardiologist'."
            )
        return canonical
    return None

@router.get("/dashboard", response_model=Dict[str, Any])
def get_admin_dashboard(current_user: dict = Depends(get_current_admin_only)):
    try:
        accounts = dict.fromkeys(
            ("consumers", "staff", "unknown_role", "active", "disabled", "archived", "unknown_status"), 0
        )
        for profile in get_profile_repo().list_portal_account_statuses():
            role = profile.get("role")
            group = "consumers" if role == "patient" else "staff" if role in {"admin", "medical_expert"} else "unknown_role"
            accounts[group] += 1
            status = profile.get("account_status")
            accounts[status if status in {"active", "disabled", "archived"} else "unknown_status"] += 1

        content = {}
        repo = get_content_repo()
        for kind in ("recipes", "exercises"):
            counts = dict.fromkeys(
                ("total", "draft", "published", "archived", "unknown_status", "approval_recorded",
                 "awaiting_review", "changes_requested", "published_without_review"), 0
            )
            for row in repo.list_portal_content_statuses(kind):
                counts["total"] += 1
                status = row.get("status")
                counts[status if status in {"draft", "published", "archived"} else "unknown_status"] += 1
                approved = bool(row.get("expert_validated") and row.get("reviewed_by") and row.get("reviewed_at"))
                if status != "archived" and approved:
                    counts["approval_recorded"] += 1
                elif status == "draft":
                    counts["changes_requested" if row.get("review_note") else "awaiting_review"] += 1
                if status == "published" and not approved:
                    counts["published_without_review"] += 1
            content[kind] = counts
        return {"accounts": accounts, "content": content, "generated_at": utc_now().isoformat()}
    except Exception as error:
        logger.warning("Operational overview unavailable (%s)", type(error).__name__)
        raise HTTPException(status_code=500, detail="Operational overview unavailable")


@router.get("/analytics", response_model=Dict[str, Any])
def get_admin_analytics(current_user: dict = Depends(get_current_admin_only)):
    return {
        "status": "unavailable",
        "message": "Operational analytics is not available yet. Use the overview for current account and content statuses.",
    }


@router.get("/staff")
def get_system_staff(current_user: dict = Depends(get_current_admin_only)):
    try:
        all_profiles = get_profile_repo().list_portal_staff()
    except Exception as error:
        logger.warning("Staff directory unavailable (%s)", type(error).__name__)
        raise HTTPException(status_code=500, detail="Staff directory unavailable")
    staff = [p for p in all_profiles if p.get("role") in ["medical_expert", "admin"]]
    result = []
    for s in staff:
        if s.get("role") == "admin":
            role_label = "System Admin"
            perms = ["Author and publish content", "Manage accounts and operations"]
        else:
            role_label = "Authorized Medical Expert"
            perms = {
                "Dietitian": ["Review recipes"],
                "Physical Therapist": ["Review exercise routines"],
            }.get(normalize_expert_type(s.get("expert_type")), ["No specialty approval assigned"])
            
        result.append({
            "id": s.get("id"),
            "name": f"{s.get('first_name', '')} {s.get('last_name', '')}".strip() or s.get("email"),
            "email": s.get("email"),
            "phone": s.get("phone", "No Phone"),
            "role": role_label,
            "expert_type": s.get("expert_type"),
            "is_verified_clinician": bool(s.get("is_verified_clinician")),
            "clinician_verified_at": s.get("clinician_verified_at"),
            "permissions": perms,
            "account_status": s.get("account_status"),
            "status": str(s.get("account_status") or "unknown").capitalize(),
            "created_at": s.get("created_at")
        })
    return result

TEMP_PASSWORD_SYMBOLS = "!@#$%^&*-_=+?"

def generate_temp_password(length: int = 20) -> str:
    """HL-044: a random one-time staff password that meets the HL-009 policy (16+ chars, a number, a symbol)."""
    alphabet = string.ascii_letters + string.digits + TEMP_PASSWORD_SYMBOLS
    while True:
        candidate = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.isdigit() for c in candidate)
                and any(c in TEMP_PASSWORD_SYMBOLS for c in candidate)
                and any(c.islower() for c in candidate)
                and any(c.isupper() for c in candidate)):
            return candidate


@router.put("/staff/{staff_id}/clinician-verification")
def set_clinician_verification(staff_id: str, payload: dict, current_user: dict = Depends(get_current_admin_only)):
    """
    HL-058: an admin marks a medical expert as a verified (license-checked) clinician. Only reviews
    submitted while verified count in Model Check; earlier practice reviews stay practice.
    """
    verified = payload.get("verified")
    if not isinstance(verified, bool):
        raise HTTPException(status_code=400, detail="Send verified: true or false.")
    profile_repo = get_profile_repo()
    staff = profile_repo.get_by_id(staff_id)
    if not staff or staff.get("role") != "medical_expert":
        raise HTTPException(status_code=404, detail="Medical expert not found.")
    updated = profile_repo.update(staff_id, {
        "is_verified_clinician": verified,
        "clinician_verified_by": current_user.get("user_id") if verified else None,
        "clinician_verified_at": utc_now().isoformat() if verified else None,
    })
    if not updated:
        raise HTTPException(status_code=500, detail="Could not update the clinician verification.")
    name = f"{staff.get('first_name', '')} {staff.get('last_name', '')}".strip() or staff.get("email")
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action="verified a clinician" if verified else "removed clinician verification",
        target_type="staff",
        target_id=staff_id,
        target_name=name,
    )
    return {"status": "success", "is_verified_clinician": verified}


@router.post("/staff")
def create_system_staff(payload: dict, current_user: dict = Depends(get_current_admin_only)):
    name = payload.get("name", "").strip()
    email = (payload.get("email") or "").strip()
    phone = (payload.get("phone") or "").strip()
    role_label = payload.get("role", "")

    # --- Input validation ---
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if role_label in ["Authorized Medical Expert", "medical_expert", "Expert Reviewer"]:
        target_role = "medical_expert"
    elif role_label in ["System Admin", "admin"]:
        target_role = "admin"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid staff role: '{role_label}'")

    # Early validation of expert_type (HL-011)
    canonical_expert_type = _resolve_expert_type(target_role, payload.get("expert_type"))

    # --- Duplicate email check ---
    profile_repo = get_profile_repo()
    all_profiles = profile_repo.list_all(exclude_archived=False)
    for p in all_profiles:
        if (p.get("email") or "").strip().lower() == email.lower():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
    temp_pass = generate_temp_password()
    supabase_client = get_supabase_client()
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    # --- Step 1: Check if user already exists in Supabase Auth ---
    auth_user_id = None
    try:
        users_res = supabase_client.auth.admin.list_users()
        users_list = users_res if isinstance(users_res, list) else (getattr(users_res, 'users', []) or [])
        for u in users_list:
            u_email = (getattr(u, 'email', None) or "").lower()
            if u_email == email.lower():
                auth_user_id = str(u.id)
                logger.info(f"[create_system_staff] User already exists in auth: {auth_user_id}")
                break
    except Exception as lookup_err:
        logger.warning(f"[create_system_staff] Pre-lookup warning: {lookup_err}")

    if auth_user_id:
        # The login exists without a profile; reset it to the new temporary password so the admin's copy works
        try:
            supabase_client.auth.admin.update_user_by_id(auth_user_id, {"password": temp_pass})
        except Exception as reset_err:
            logger.error(f"[create_system_staff] Temporary password reset failed: {reset_err}")
            raise HTTPException(status_code=500, detail="Could not set a temporary password for the existing login.")

    # --- Step 2: Create Supabase Auth user via direct REST (bypasses gotrue-py restrictions) ---
    if not auth_user_id:
        import httpx
        try:
            with httpx.Client(timeout=15.0) as http:
                resp = http.post(
                    f"{supabase_url}/auth/v1/admin/users",
                    headers={
                        "Authorization": f"Bearer {service_role_key}",
                        "apikey": service_role_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "email": email.lower(),
                        "password": temp_pass,
                        "email_confirm": True,
                        "user_metadata": {"phone": phone} if phone else {}
                    }
                )

            if resp.status_code in (200, 201):
                resp_data = resp.json()
                raw_id = resp_data.get("id", "")
                # Validate it's a real UUID before using it
                try:
                    import uuid as _uuid
                    auth_user_id = str(_uuid.UUID(str(raw_id)))
                    logger.info(f"[create_system_staff] Auth user created: {auth_user_id}")
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Supabase returned an invalid user ID: '{raw_id}'. Cannot create profile."
                    )
            else:
                err_body = {}
                try:
                    err_body = resp.json()
                except Exception:
                    pass
                err_msg = (
                    err_body.get("msg")
                    or err_body.get("message")
                    or err_body.get("error_description")
                    or err_body.get("error")
                    or f"HTTP {resp.status_code}"
                )
                logger.error(f"[create_system_staff] REST auth creation failed {resp.status_code}: {err_body}")

                # Last-chance check: maybe user was created despite the error code
                try:
                    users_res2 = supabase_client.auth.admin.list_users()
                    users_list2 = users_res2 if isinstance(users_res2, list) else (getattr(users_res2, 'users', []) or [])
                    for u in users_list2:
                        if (getattr(u, 'email', None) or "").lower() == email.lower():
                            auth_user_id = str(u.id)
                            break
                except Exception:
                    pass

                if not auth_user_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to create authentication account: {err_msg}"
                    )

        except HTTPException:
            raise
        except Exception as http_err:
            raise HTTPException(
                status_code=500,
                detail=f"Network error contacting Supabase Auth: {http_err}"
            )

    # --- Step 3: Insert profile row (requires auth_user_id to exist in auth.users) ---
    name_parts = name.split(" ", 1)
    new_staff_data = {
        "id": auth_user_id,              # FK → auth.users(id)  MUST be valid UUID
        "first_name": name_parts[0],
        "last_name": name_parts[1] if len(name_parts) > 1 else "",
        "phone": phone or "No Phone",
        "email": email.lower(),
        "role": target_role,
        "expert_type": canonical_expert_type,
        "account_status": "active",
        "must_change_password": True
    }

    try:
        created_staff = profile_repo.create_profile(new_staff_data)
        if not created_staff:
            raise HTTPException(status_code=500, detail="Profile record could not be created after auth account was provisioned.")
        staff_id = created_staff.get("id") or auth_user_id
    except HTTPException:
        # Profile insert failed — attempt to clean up the dangling auth user
        try:
            supabase_client.auth.admin.delete_user(auth_user_id)
            logger.warning(f"[create_system_staff] Rolled back auth user {auth_user_id} after profile insert failure.")
        except Exception:
            pass
        raise

    # --- Step 4: Audit log ---
    admin_id = current_user.get("user_id") if current_user else "admin"
    role_desc = f"medical expert ({canonical_expert_type})" if target_role == "medical_expert" else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action=f"Created {role_desc} account",
        target_type="staff",
        target_id=str(staff_id),
        target_name=name
    )

    # --- Step 5: Notification (non-critical, never blocks the response) ---
    try:
        from app.services.admin_notifications import create_admin_notification
        create_admin_notification(
            type="staff",
            title="Staff Account Provisioned",
            message=f"A {role_desc} account was provisioned for {name}.",
            severity="info",
            recipient_roles=["admin"],
            route="/users",
            target_id=str(staff_id),
            read_by=[admin_id] if admin_id else []
        )
    except Exception as notif_err:
        logger.warning(f"[create_system_staff] Notification skipped: {notif_err}")

    # HL-044: the temporary password is returned once, here, and never stored or logged
    return {"status": "success", "id": str(staff_id), "temp_password": temp_pass}



DEACTIVATION_REASON_MAX = 200


@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    current_user: dict = Depends(get_current_admin_only),
):
    profile_repo = get_profile_repo()
    user = profile_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_status = user.get("account_status")
    if current_status not in {"active", "disabled"}:
        raise HTTPException(status_code=400, detail="Access changes are unavailable for this account state")
    user_role = user.get("role", "patient")
    
    is_staff = user_role in ["admin", "medical_expert"]

    if str(user_id) == str(current_user.get("user_id")):
        raise HTTPException(status_code=400, detail="Self-deactivation is not permitted")
        
    # HL-074: every admin is equal, so the portal must always keep one active admin
    if user_role == "admin" and current_status == "active":
        all_profiles = profile_repo.list_all(exclude_archived=False)
        active_admins = [p for p in all_profiles if p.get("role") == "admin" and p.get("account_status") == "active"]
        if len(active_admins) <= 1:
            raise HTTPException(status_code=400, detail="Deactivating the last active admin is not permitted")
            
    new_status = "disabled" if current_status == "active" else "active"
    # HL-073: the reason the admin picked is kept while the account is disabled and cleared when it is enabled
    reason = str((payload or {}).get("reason") or "").strip()[:DEACTIVATION_REASON_MAX] or None
    if new_status == "active":
        reason = None
    updated = profile_repo.update_profile(user_id, {"account_status": new_status, "deactivation_reason": reason})
    if not updated:
        raise HTTPException(status_code=500, detail="Account status could not be updated")
    
    admin_id = current_user.get("user_id") if current_user else "admin"
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get("email") or user_id
    target_type = "user" if user_role == "patient" else "staff"
    
    if user_role == "patient":
        action_desc = f"{'disabled' if new_status == 'disabled' else 'activated'} user account"
    else:
        role_desc = "medical expert" if user_role == "medical_expert" else "admin"
        action_desc = f"{'Disabled' if new_status == 'disabled' else 'Enabled'} {role_desc} account"
    if reason:
        action_desc += f" (reason: {reason})"
        
    record_admin_activity(
        admin_user_id=admin_id,
        action=action_desc,
        target_type=target_type,
        target_id=str(user_id),
        target_name=user_name
    )

    if is_staff:
        try:
            from app.services.admin_notifications import create_admin_notification
            action_word = "disabled" if new_status == "disabled" else "re-enabled"
            create_admin_notification(
                type="staff",
                title="Staff Account Status Changed",
                message=f"Staff account for {user_name} was {action_word}.",
                severity="warning",
                recipient_roles=["admin"],
                route="/users",
                target_id=str(user_id),
                read_by=[admin_id] if admin_id else []
            )
        except Exception as e:
            logger.warning(f"Failed to create admin notification for staff status change: {e}")

    return {"status": "success", "new_status": new_status}

@router.put("/staff/{staff_id}/role")
def change_staff_role(staff_id: str, payload: dict, current_user: dict = Depends(get_current_admin_only)):
    profile_repo = get_profile_repo()
    target_user = profile_repo.get_by_id(staff_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    new_role_label = payload.get("role")
    if new_role_label not in ["Authorized Medical Expert", "System Admin", "medical_expert", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role label")
        
    new_role = "medical_expert" if new_role_label in ["Authorized Medical Expert", "medical_expert"] else "admin"
    canonical_expert_type = _resolve_expert_type(new_role, payload.get("expert_type"))
    
    if str(staff_id) == str(current_user.get("user_id")):
        raise HTTPException(status_code=400, detail="Self-demotion is not permitted")

    if target_user.get("role") not in ["admin", "medical_expert"]:
        raise HTTPException(status_code=400, detail="Target user is not a regular staff member")
        
    old_role = target_user.get("role")
    profile_repo.update_profile(staff_id, {"role": new_role, "expert_type": canonical_expert_type})
    
    admin_id = current_user.get("user_id") if current_user else "admin"
    user_name = f"{target_user.get('first_name', '')} {target_user.get('last_name', '')}".strip() or target_user.get("email") or staff_id
    action_desc = f"Changed staff role from {old_role} to {new_role}"
    if canonical_expert_type:
        action_desc += f" ({canonical_expert_type})"
    
    record_admin_activity(
        admin_user_id=admin_id,
        action=action_desc,
        target_type="staff",
        target_id=str(staff_id),
        target_name=user_name
    )
    return {"status": "success", "new_role": new_role, "expert_type": canonical_expert_type}

@router.delete("/users/{user_id}")
@router.delete("/staff/{user_id}")
def delete_user_or_staff(user_id: str, current_user: dict = Depends(get_current_admin_only)):
    if str(user_id) == str(current_user.get("user_id")):
        raise HTTPException(status_code=400, detail="Self-deletion is not permitted")

    profile_repo = get_profile_repo()
    user = profile_repo.get_by_id(user_id)
    user_role = user.get("role", "patient") if user else None
    
    # HL-074: another admin can be disabled, not deleted
    if user_role == "admin":
        raise HTTPException(status_code=400, detail="Deleting another admin is not permitted; disable the account instead")

    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() if user else user_id
    
    # Soft delete profile (preserves child data and auth identity)
    if not profile_repo.archive(user_id):
        raise HTTPException(status_code=500, detail="Failed to archive user profile.")

    # 4. Record admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    target_type = "staff" if user_role in ["admin", "medical_expert"] else "user"
    role_label = "staff" if target_type == "staff" else "patient"
    record_admin_activity(
        admin_user_id=admin_id,
        action=f"Deleted {role_label} account for {user_name}",
        target_type=target_type,
        target_id=str(user_id),
        target_name=user_name
    )

    return {"status": "success", "message": f"Account {user_name} deleted successfully"}

@router.get("/broadcasts", response_model=list)
def get_broadcasts(current_user: dict = Depends(get_current_admin_only)):
    return get_notification_repo().list_broadcasts()

VALID_BROADCAST_TYPES = {"Maintenance", "App Update", "Safety Reminder", "General"}
VALID_BROADCAST_AUDIENCES = {"All Registered Accounts"}

@router.post("/broadcasts")
def create_broadcast(payload: dict, current_user: dict = Depends(get_current_admin_only)):
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="Announcement title is required.")
    if len(title) > 80:
        raise HTTPException(status_code=422, detail="Announcement title must be 80 characters or fewer.")

    broadcast_type = payload.get("type", "")
    if broadcast_type not in VALID_BROADCAST_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid category. Must be one of: {', '.join(sorted(VALID_BROADCAST_TYPES))}"
        )

    target_audience = payload.get("targetAudience", "All Registered Accounts")
    if target_audience not in VALID_BROADCAST_AUDIENCES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid audience. Must be one of: {', '.join(sorted(VALID_BROADCAST_AUDIENCES))}"
        )

    message = (payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="Announcement message is required.")

    admin_id = current_user.get('user_id', 'SYS')
    admin_prof = get_profile_repo().get_by_id(admin_id)
    publisher_name = "Admin"
    if admin_prof:
        publisher_name = f"{admin_prof.get('first_name', '')} {admin_prof.get('last_name', '')}".strip() or "Admin"

    broadcast_data = {
        "title": title,
        "message": message,
        "type": broadcast_type,
        "target_audience": target_audience,
        "publisher": f"{admin_id} ({publisher_name})",
        "display_publisher": publisher_name,
        "publisher_id": admin_id
    }

    new_broadcast = get_notification_repo().create_broadcast(broadcast_data)
    broadcast_id = new_broadcast.get("id")

    # Record admin activity
    record_admin_activity(
        admin_user_id=admin_id,
        action="published",
        target_type="broadcast",
        target_id=str(broadcast_id),
        target_name=title
    )
    return {"status": "success", "data": new_broadcast}

@router.delete("/broadcasts/{broadcast_id}")
def delete_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_admin_only)):
    success = get_notification_repo().delete_broadcast(broadcast_id)
    if not success:
        raise HTTPException(status_code=404, detail="Broadcast not found")

    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="deleted",
        target_type="broadcast",
        target_id=str(broadcast_id),
        target_name="Broadcast"
    )
    return {"status": "success", "message": "Broadcast deleted"}

EXPORT_FIELDS = ("created_at", "admin_name", "action", "target_type", "target_name", "target_id")


@router.get("/activity/export")
def export_activity_log(
    target_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_only),
):
    """HL-080: every log entry matching the page's filters, for the portal's "Export audit CSV"."""
    logs = get_admin_repo().list_activity(target_type=target_type, search=search)
    items = [{field: entry.get(field) for field in EXPORT_FIELDS} for entry in logs]
    filters = ", ".join(f for f in [f"type {target_type}" if target_type else "", f'search "{search}"' if search else ""] if f)
    record_admin_activity(
        admin_user_id=current_user.get("user_id"),
        action=f"exported the activity log ({len(items)} entries{', ' + filters if filters else ''})",
        target_type="system",
        target_name="Activity log",
    )
    return {"generated_at": utc_now().isoformat(), "count": len(items), "items": items}


@router.get("/activity")
def get_activity_log(
    page: int = 1,
    page_size: int = 20,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    admin_user_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_only)
):
    if page < 1:
        raise HTTPException(status_code=400, detail="Page parameter must be 1 or greater.")
    if page_size < 1 or page_size > 100:
        raise HTTPException(status_code=400, detail="Page size must be between 1 and 100.")

    logs = get_admin_repo().list_activity(
        action=action,
        target_type=target_type,
        admin_user_id=admin_user_id,
        search=search
    )

    total = len(logs)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_logs = logs[start_idx:end_idx]

    serialized_items = []
    for l in paginated_logs:
        serialized_items.append({
            "id": l.get("id"),
            "admin_user_id": l.get("admin_user_id"),
            "admin_name": l.get("admin_name"),
            "action": l.get("action"),
            "target_type": l.get("target_type"),
            "target_id": l.get("target_id"),
            "target_name": l.get("target_name"),
            "created_at": l.get("created_at")
        })

    return {
        "items": serialized_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
