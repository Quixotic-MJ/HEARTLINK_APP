#!/usr/bin/env python3
# backend/validate_render_deployment.py
"""
HeartLink Render Deployment Pre-Flight Validation.
Verifies production environment configuration, ML model assets, security constraints,
and repository factory initialization without printing or leaking secret values.
"""
import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from dotenv import load_dotenv
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

def validate_render_deployment() -> bool:
    print("=" * 70)
    print(" HEARTLINK — RENDER DEPLOYMENT CONFIGURATION AUDIT")
    print("=" * 70)
    
    all_passed = True

    # 1. DATABASE_MODE Check
    db_mode = os.getenv("DATABASE_MODE", "").strip().lower()
    if db_mode == "supabase":
        print("[PASS] DATABASE_MODE: Configured for authoritative Supabase persistence ('supabase')")
    else:
        print(f"[FAIL] DATABASE_MODE: Expected 'supabase', found '{db_mode}'")
        all_passed = False

    # 2. SUPABASE_URL Check
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    if supabase_url and supabase_url.startswith("https://") and ".supabase.co" in supabase_url:
        print("[PASS] SUPABASE_URL: Valid HTTPS Supabase project URL configured")
    else:
        print("[FAIL] SUPABASE_URL: Missing or invalid Supabase project URL")
        all_passed = False

    # 3. SUPABASE_SERVICE_ROLE_KEY Check
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if service_key and len(service_key) > 20 and not service_key.startswith("your-"):
        print("[PASS] SUPABASE_SERVICE_ROLE_KEY: Configured (Length verified, value masked)")
    else:
        print("[FAIL] SUPABASE_SERVICE_ROLE_KEY: Missing or placeholder value detected")
        all_passed = False

    # 4. JWT & Security Configuration
    secret_key = os.getenv("SECRET_KEY", "").strip()
    algorithm = os.getenv("ALGORITHM", "HS256").strip()
    if secret_key and len(secret_key) >= 16 and secret_key != "your-super-secret-jwt-key-change-in-production":
        print(f"[PASS] JWT Configuration: Cryptographic signing key configured ({algorithm}, value masked)")
    else:
        print("[FAIL] JWT Configuration: SECRET_KEY is missing, too short, or using placeholder")
        all_passed = False

    # 5. CORS Configuration
    cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    if cors_origins:
        origins_list = [o.strip() for o in cors_origins.split(",") if o.strip()]
        if "*" in origins_list:
            print("[WARN] CORS Configuration: Wildcard '*' detected. Ensure credentials disabled if using wildcard.")
        else:
            print(f"[PASS] CORS Configuration: {len(origins_list)} explicit origin(s) configured")
    else:
        print("[INFO] CORS Configuration: Using default development origin whitelist")

    # 6. ML Model Asset Check
    model_path = backend_dir / "app" / "ml" / "heartlink_model.pkl"
    if model_path.exists() and model_path.stat().st_size > 0:
        print(f"[PASS] HSS Model Artifact: Verified at app/ml/heartlink_model.pkl ({model_path.stat().st_size} bytes)")
    else:
        print(f"[FAIL] HSS Model Artifact: Missing model file at {model_path}")
        all_passed = False

    # 7. Repository Factory & Client Initialization
    try:
        from app.db.client import get_supabase_client
        from app.db.repositories import (
            get_profile_repo,
            get_baseline_repo,
            get_health_logs_repo,
            get_meals_repo,
            get_exercises_repo,
            get_sleep_repo,
            get_hss_repo,
            get_content_repo,
            get_notification_repo,
            get_admin_repo,
            get_feedback_repo,
            get_case_review_repo
        )
        client = get_supabase_client()
        # Verify repository instances
        repos = [
            get_profile_repo(),
            get_baseline_repo(),
            get_health_logs_repo(),
            get_meals_repo(),
            get_exercises_repo(),
            get_sleep_repo(),
            get_hss_repo(),
            get_content_repo(),
            get_notification_repo(),
            get_admin_repo(),
            get_feedback_repo(),
            get_case_review_repo()
        ]
        if client and all(repos):
            print(f"[PASS] Repository Initialization: All {len(repos)} domain repositories initialized with Supabase client")
        else:
            print("[FAIL] Repository Initialization: Supabase client returned None")
            all_passed = False
    except Exception as e:
        print(f"[FAIL] Repository Initialization: Failed with exception: {e}")
        all_passed = False

    # 8. ML Feature Transformation Check
    try:
        from app.services.hss_service import load_hss_model
        model = load_hss_model()
        if model:
            print("[PASS] HSS Inference Engine: NHANES model pipeline loaded successfully")
        else:
            print("[FAIL] HSS Inference Engine: Model failed to load")
            all_passed = False
    except Exception as e:
        print(f"[FAIL] HSS Inference Engine: Load failed: {type(e).__name__}")
        all_passed = False

    print("=" * 70)
    if all_passed:
        print(" PRE-FLIGHT AUDIT RESULT: [READY FOR RENDER DEPLOYMENT]")
    else:
        print(" PRE-FLIGHT AUDIT RESULT: [NOT READY — FIX REPORTED FAILURES]")
    print("=" * 70)
    return all_passed

if __name__ == "__main__":
    success = validate_render_deployment()
    sys.exit(0 if success else 1)
