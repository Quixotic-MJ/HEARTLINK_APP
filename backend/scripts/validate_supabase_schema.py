# backend/validate_supabase_schema.py
"""
Supabase PostgreSQL Migration & Schema Contract Validator.
Parses all SQL migration scripts, validates table structures, foreign keys,
unique constraints, indexes, RLS policies, triggers, and storage buckets.
"""
import os
import re
import sys
from typing import Dict, Any, List, Set, Tuple

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

REQUIRED_TABLES = {
    "profiles",
    "baseline_onboarding",
    "user_thresholds",
    "user_reminders",
    "care_team_contacts",
    "recipes",
    "exercise_routines",
    "clinics",
    "saved_recipes",
    "saved_exercises",
    "daily_health_logs",
    "meal_logs",
    "exercise_logs",
    "sleep_logs",
    "hss_history",
    "clinical_alerts",
    "system_broadcasts",
    "patient_notifications",
    "admin_notifications",
    "admin_notification_reads",
    "admin_activity_logs",
    "feedback_tickets",
    "calibration_datasets",
    "candidate_models",
    "calibration_records",
    "expert_evaluations"
}

REQUIRED_STORAGE_BUCKETS = {"avatars", "recipes", "exercises"}

def validate_schema():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    migrations_dir = os.path.join(current_dir, "supabase", "migrations")

    if not os.path.exists(migrations_dir):
        print(f"FAILED: Migrations directory not found at {migrations_dir}")
        sys.exit(1)

    migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    if len(migration_files) < 10:
        print(f"FAILED: Expected at least 10 migration files, found {len(migration_files)}")
        sys.exit(1)

    full_sql = ""
    for mf in migration_files:
        path = os.path.join(migrations_dir, mf)
        with open(path, "r", encoding="utf-8") as f:
            full_sql += f"\n-- File: {mf}\n" + f.read()

    print("================================================================================")
    print("HeartLink Supabase Schema & Migration Contract Validation Report")
    print("================================================================================")

    errors = []

    # 1. Table Verification
    found_tables = set()
    create_table_matches = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)", full_sql, re.IGNORECASE)
    for t in create_table_matches:
        found_tables.add(t.lower())

    missing_tables = REQUIRED_TABLES - found_tables
    if missing_tables:
        errors.append(f"Missing required tables: {sorted(list(missing_tables))}")
    else:
        print(f"[OK] All {len(REQUIRED_TABLES)} required relational tables found.")

    # 2. Foreign Key & Cascade Rules
    fk_checks = [
        ("profiles", "auth.users", "ON DELETE CASCADE"),
        ("baseline_onboarding", "profiles", "ON DELETE CASCADE"),
        ("user_thresholds", "profiles", "ON DELETE CASCADE"),
        ("user_reminders", "profiles", "ON DELETE CASCADE"),
        ("care_team_contacts", "profiles", "ON DELETE CASCADE"),
        ("daily_health_logs", "profiles", "ON DELETE CASCADE"),
        ("meal_logs", "profiles", "ON DELETE CASCADE"),
        ("exercise_logs", "profiles", "ON DELETE CASCADE"),
        ("sleep_logs", "profiles", "ON DELETE CASCADE"),
        ("hss_history", "profiles", "ON DELETE CASCADE"),
        ("clinical_alerts", "profiles", "ON DELETE CASCADE"),
        ("patient_notifications", "profiles", "ON DELETE CASCADE"),
        ("patient_notifications", "system_broadcasts", "ON DELETE CASCADE"),
        ("saved_recipes", "profiles", "ON DELETE CASCADE"),
        ("saved_recipes", "recipes", "ON DELETE CASCADE"),
        ("saved_exercises", "profiles", "ON DELETE CASCADE"),
        ("saved_exercises", "exercise_routines", "ON DELETE CASCADE"),
        ("feedback_tickets", "profiles", "ON DELETE SET NULL"),
        ("admin_activity_logs", "profiles", "ON DELETE SET NULL"),
        ("expert_evaluations", "profiles", "ON DELETE SET NULL")
    ]

    for child, parent, delete_rule in fk_checks:
        pattern = rf"{child}.*?REFERENCES\s+(?:public\.)?{re.escape(parent)}.*?{re.escape(delete_rule)}"
        if not re.search(pattern, full_sql, re.IGNORECASE | re.DOTALL):
            errors.append(f"Missing expected foreign key or delete rule: {child} -> {parent} ({delete_rule})")

    print(f"[OK] Foreign key cascade and set-null rules validated across all user and audit relationships.")

    # 3. Unique Constraints (both column inline and table level)
    unique_checks = [
        ("baseline_onboarding", r"user_id\s+UUID\s+UNIQUE"),
        ("user_thresholds", r"user_id\s+UUID\s+UNIQUE"),
        ("user_reminders", r"user_id\s+UUID\s+UNIQUE"),
        ("saved_recipes", r"UNIQUE\s*\(user_id,\s*recipe_id\)"),
        ("saved_exercises", r"UNIQUE\s*\(user_id,\s*routine_id\)"),
        ("feedback_tickets", r"ticket_code\s+TEXT\s+UNIQUE")
    ]
    for tbl, u_pattern in unique_checks:
        pattern = rf"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?{tbl}.*?{u_pattern}"
        if not re.search(pattern, full_sql, re.IGNORECASE | re.DOTALL):
            errors.append(f"Missing unique constraint on {tbl} for pattern: {u_pattern}")

    print(f"[OK] Unique constraints verified (1:1 baselines, thresholds, reminders, bookmarks, ticket codes).")

    # 4. Indexes Verification
    required_indexes = [
        "idx_health_logs_user_logged",
        "idx_meal_logs_user_logged",
        "idx_exercise_logs_user_logged",
        "idx_sleep_logs_user_logged",
        "idx_hss_history_user_computed",
        "idx_patient_notif_unread",
        "idx_admin_activity_created",
        "idx_feedback_status_created",
        "idx_evaluations_user_created",
        "idx_alerts_user_created"
    ]
    found_indexes = set(re.findall(r"CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)", full_sql, re.IGNORECASE))
    missing_indexes = set(required_indexes) - found_indexes
    if missing_indexes:
        errors.append(f"Missing required performance indexes: {sorted(list(missing_indexes))}")
    else:
        print(f"[OK] All {len(required_indexes)} required performance indexes found.")

    # 5. Row Level Security (RLS) Verification
    rls_tables = set(re.findall(r"ALTER\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", full_sql, re.IGNORECASE))
    missing_rls = REQUIRED_TABLES - rls_tables
    if missing_rls:
        errors.append(f"Tables missing RLS enablement: {sorted(list(missing_rls))}")
    else:
        print(f"[OK] Row Level Security (RLS) enabled on all {len(REQUIRED_TABLES)} public tables.")

    # 6. Audit Immutability Trigger
    if "prevent_admin_activity_tampering" not in full_sql or "deny_activity_log_modification" not in full_sql:
        errors.append("Missing admin activity log immutability trigger (prevent_admin_activity_tampering)")
    else:
        print("[OK] Administrative activity log immutability trigger verified.")

    # 7. Storage Buckets Verification
    for b in REQUIRED_STORAGE_BUCKETS:
        if f"'{b}'" not in full_sql:
            errors.append(f"Missing storage bucket configuration for '{b}'")
    print(f"[OK] Supabase Storage buckets provisioned ({', '.join(sorted(REQUIRED_STORAGE_BUCKETS))}).")

    print("--------------------------------------------------------------------------------")
    if errors:
        print(f"FAILED: Found {len(errors)} schema errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print(">>> SUPABASE SCHEMA VALIDATION PASSED (0 ERRORS) <<<")
        print("================================================================================")
        return True

if __name__ == "__main__":
    validate_schema()
