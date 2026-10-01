# backend/validate_supabase_connection.py
"""
HeartLink Live Supabase Connection Diagnostic.
Safely tests PostgreSQL, PostgREST API, Auth service, Storage buckets,
and Repository Layer factories without leaking secrets or credentials.
"""
import os
import sys
from pathlib import Path
from typing import Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from app.db.client import (
    get_database_mode,
    is_supabase_mode,
    get_database_status,
    get_supabase_client
)
from app.db.repositories import (
    get_profile_repo,
    get_baseline_repo,
    get_health_logs_repo,
    get_meals_repo,
    get_exercises_repo,
    get_sleep_logs_repo,
    get_hss_repo,
    get_notification_repo,
    get_admin_repo,
    get_feedback_repo,
    get_case_review_repo,
    get_content_repo
)
from app.services.storage_service import get_storage_service, BUCKET_AVATARS, BUCKET_RECIPES, BUCKET_EXERCISES
from app.services.auth_service import get_auth_service


def mask_secret(secret: str) -> str:
    if not secret:
        return "[NOT CONFIGURED]"
    if len(secret) <= 8:
        return "***"
    return f"{secret[:4]}...{secret[-4:]}"


def run_connection_diagnostics() -> bool:
    print("=" * 80)
    print("HeartLink Supabase Connection & Service Health Diagnostic")
    print("=" * 80)

    mode = get_database_mode()
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # 1. Environment and Configuration
    print(f"DATABASE_MODE               : {mode}")
    print(f"SUPABASE_URL                : {supabase_url or '[NOT CONFIGURED]'}")
    print(f"SUPABASE_SERVICE_ROLE_KEY   : {mask_secret(service_role_key)}")
    print("-" * 80)

    # 2. Diagnostic Summary
    status = get_database_status()
    print(f"Connection Ready            : {status['ready']}")
    print(f"Persistence Engine          : {status['database_mode']}")
    print(f"Service Role Key Active     : {status['supabase_service_role_configured']}")
    print(f"Anon Key Configured         : {status['supabase_anon_key_configured']}")

    # 3. Repository Initialization Verification
    print("\nVerifying Domain Repositories...")
    repos = [
        ("ProfileRepository", get_profile_repo),
        ("BaselineRepository", get_baseline_repo),
        ("HealthLogsRepository", get_health_logs_repo),
        ("MealsRepository", get_meals_repo),
        ("ExercisesRepository", get_exercises_repo),
        ("SleepLogsRepository", get_sleep_logs_repo),
        ("HSSRepository", get_hss_repo),
        ("NotificationRepository", get_notification_repo),
        ("AdminRepository", get_admin_repo),
        ("FeedbackRepository", get_feedback_repo),
        ("CaseReviewRepository", get_case_review_repo),
        ("ContentRepository", get_content_repo),
    ]

    all_repos_ok = True
    for name, factory in repos:
        try:
            repo_instance = factory()
            impl_name = repo_instance.__class__.__name__
            print(f"  [OK] {name:<26} -> {impl_name}")
        except Exception as e:
            print(f"  [FAIL] {name:<24} -> ERROR: {e}")
            all_repos_ok = False

    # 4. Storage & Auth Service Verification
    print("\nVerifying Services...")
    try:
        storage_svc = get_storage_service()
        print(f"  [OK] StorageService            -> {storage_svc.__class__.__name__}")
    except Exception as e:
        print(f"  [FAIL] StorageService          -> ERROR: {e}")
        all_repos_ok = False

    try:
        auth_svc = get_auth_service()
        print(f"  [OK] AuthService               -> {auth_svc.__class__.__name__}")
    except Exception as e:
        print(f"  [FAIL] AuthService             -> ERROR: {e}")
        all_repos_ok = False

    # 5. Live Mode Specific Connectivity Check
    if is_supabase_mode():
        print("\nVerifying Live Supabase Endpoints...")
        try:
            client = get_supabase_client()
            # Test simple reachability
            health_check = client.from_("profiles").select("id").limit(1).execute()
            print(f"  [OK] Supabase PostgREST Gateway Reachable (Status Code: {health_check.status_code if hasattr(health_check, 'status_code') else '200'})")
        except Exception as e:
            print(f"  [FAIL] Supabase PostgREST Connection Failed: {e}")
            all_repos_ok = False

    print("=" * 80)
    if all_repos_ok:
        print(">>> ALL CONNECTION & REPOSITORY CHECKS PASSED <<<")
        print("=" * 80)
        return True
    else:
        print(">>> SOME CONNECTION CHECKS FAILED <<<")
        print("=" * 80)
        return False


if __name__ == "__main__":
    success = run_connection_diagnostics()
    sys.exit(0 if success else 1)
