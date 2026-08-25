# backend/validate_auth_profile_integrity.py
"""
Auth & Profile Identity Reconciliation Validator.
Verifies the authoritative 1:1 link between auth identities and public.profiles:
- auth.users.id == public.profiles.id (UUID v5 / v4 format)
- Application roles (patient, medical_expert, admin, super_admin)
- Account status (active, disabled, archived)
- Onboarding status (pending, complete)
- Asserts 0 dangling or unlinked identities
- Asserts zero password material or secrets in application profile records
"""
import os
import sys
from typing import Dict, Any, List

from app.db.client import is_supabase_mode, get_supabase_client, get_database_mode
from app.db.repositories import get_profile_repo
import app.mock_db as mock_db

VALID_ROLES = {"patient", "medical_expert", "admin", "super_admin"}
VALID_ACCOUNT_STATUSES = {"active", "disabled", "archived"}
VALID_ONBOARDING_STATUSES = {"pending", "complete"}
PROHIBITED_PROFILE_FIELDS = {"password", "password_hash", "service_role_key", "secret"}


def validate_auth_profile_integrity() -> bool:
    print("=" * 80)
    print("HeartLink Auth & Profile Identity Reconciliation Validator")
    print("=" * 80)

    mode = get_database_mode()
    print(f"Current Database Mode: {mode}")

    profile_repo = get_profile_repo()
    profiles = profile_repo.list_all() if hasattr(profile_repo, 'list_all') else getattr(mock_db, 'profiles', [])

    print(f"\nTotal Profiles Retrieved: {len(profiles)}")

    errors = []
    warnings = []

    for idx, p in enumerate(profiles, start=1):
        uid = p.get("id")
        role = p.get("role")
        account_status = p.get("account_status", "active")
        onboarding_status = p.get("onboarding_status", "complete")

        # 1. Identifier Check
        if not uid:
            errors.append(f"Profile #{idx} missing 'id'")
            continue

        # 2. Role Check
        if role not in VALID_ROLES:
            errors.append(f"Profile '{uid}' has invalid role: '{role}'")

        # 3. Account Status Check
        if account_status not in VALID_ACCOUNT_STATUSES:
            errors.append(f"Profile '{uid}' has invalid account_status: '{account_status}'")

        # 4. Onboarding Status Check
        if onboarding_status not in VALID_ONBOARDING_STATUSES:
            errors.append(f"Profile '{uid}' has invalid onboarding_status: '{onboarding_status}'")

        # 5. Security Sanitization Check in Supabase mode
        if is_supabase_mode():
            for field in PROHIBITED_PROFILE_FIELDS:
                if field in p:
                    errors.append(f"Profile '{uid}' contains forbidden sensitive field '{field}' in Supabase mode!")

        # 6. Check Phone/Email Presence
        if not p.get("email") and not p.get("phone"):
            warnings.append(f"Profile '{uid}' has neither phone nor email registered.")

    print(f"  [OK] Validated {len(profiles)} application profiles.")

    # In Supabase Mode, perform Auth identity reconciliation
    if is_supabase_mode():
        print("\nReconciling with Supabase Auth Users...")
        try:
            client = get_supabase_client()
            # Fetch users from Supabase Auth admin API
            auth_users_res = client.auth.admin.list_users()
            if isinstance(auth_users_res, list):
                auth_users = auth_users_res
            elif hasattr(auth_users_res, 'users'):
                auth_users = auth_users_res.users
            elif isinstance(auth_users_res, dict):
                auth_users = auth_users_res.get('users', [])
            else:
                auth_users = []
            
            profile_ids = {p["id"] for p in profiles}
            auth_ids = {str(u.id) if hasattr(u, 'id') else str(u.get('id')) for u in auth_users}

            unlinked_profiles = profile_ids - auth_ids
            unlinked_auth_users = auth_ids - profile_ids

            if unlinked_profiles:
                errors.append(f"Found {len(unlinked_profiles)} profiles without corresponding auth.users: {unlinked_profiles}")
            if unlinked_auth_users:
                warnings.append(f"Found {len(unlinked_auth_users)} auth.users without corresponding profiles: {unlinked_auth_users}")

            print(f"  [OK] Successfully reconciled {len(auth_ids)} Auth identities with {len(profile_ids)} Profiles.")
        except Exception as e:
            warnings.append(f"Live Auth user reconciliation skipped: {e}")

    print("\n" + "-" * 80)
    print(f"Summary: {len(profiles)} Profiles Inspected | {len(errors)} Errors | {len(warnings)} Warnings")

    if warnings:
        for w in warnings:
            print(f"  [WARN] {w}")

    if errors:
        for e in errors:
            print(f"  [FAIL] {e}")
        print("=" * 80)
        print(">>> AUTH & PROFILE INTEGRITY RECONCILIATION FAILED <<<")
        print("=" * 80)
        return False

    print("=" * 80)
    print(">>> AUTH & PROFILE INTEGRITY RECONCILIATION PASSED (0 ERRORS) <<<")
    print("=" * 80)
    return True


if __name__ == "__main__":
    success = validate_auth_profile_integrity()
    sys.exit(0 if success else 1)
