# backend/validate_integrity.py
import sys
from datetime import datetime, date

from app.db.repositories import (
    get_profile_repo,
    get_health_logs_repo,
    get_meals_repo,
    get_exercises_repo,
    get_sleep_repo,
    get_hss_repo,
    get_case_review_repo,
    get_content_repo,
)
from app.services.cases import get_deterministic_case_id

def run_validation():
    errors = []
    
    # 1. Load profiles and logs from authoritative repositories
    profiles = get_profile_repo().list_all()
    meal_logs = get_meals_repo().list_all_meals()
    exercise_logs = get_exercises_repo().list_all_logs()
    sleep_logs = get_sleep_repo().list_all_logs()
    hss_history = get_hss_repo().list_all_hss_records()
    expert_evaluations = get_case_review_repo().list_evaluations()
    recipes = get_content_repo().list_recipes()
    exercise_routines = get_content_repo().list_routines()
    daily_health_logs = get_health_logs_repo().list_all_logs()

    print("--- Running Data Integrity Assertions ---")

    # 1. Uniqueness Checks
    profile_ids = [p["id"] for p in profiles]
    if len(profile_ids) != len(set(profile_ids)):
        duplicates = [p_id for p_id in set(profile_ids) if profile_ids.count(p_id) > 1]
        errors.append(f"Duplicate Profile IDs: {duplicates}")

    meal_ids = [m["id"] for m in meal_logs]
    if len(meal_ids) != len(set(meal_ids)):
        duplicates = [m_id for m_id in set(meal_ids) if meal_ids.count(m_id) > 1]
        errors.append(f"Duplicate Meal IDs: {duplicates}")

    ex_ids = [ex["id"] for ex in exercise_logs]
    if len(ex_ids) != len(set(ex_ids)):
        duplicates = [ex_id for ex_id in set(ex_ids) if ex_ids.count(ex_id) > 1]
        errors.append(f"Duplicate Exercise Log IDs: {duplicates}")

    hss_ids = [h["id"] for h in hss_history]
    if len(hss_ids) != len(set(hss_ids)):
        duplicates = [h_id for h_id in set(hss_ids) if hss_ids.count(h_id) > 1]
        errors.append(f"Duplicate HSS History IDs: {duplicates}")

    eval_ids = [ev["id"] for ev in expert_evaluations]
    if len(eval_ids) != len(set(eval_ids)):
        duplicates = [ev_id for ev_id in set(eval_ids) if eval_ids.count(ev_id) > 1]
        errors.append(f"Duplicate Expert Evaluation IDs: {duplicates}")

    # 2. Foreign Key References Validation
    recipe_ids = {r["id"] for r in recipes}
    routine_ids = {e["id"] for e in exercise_routines}
    user_ids = {p["id"] for p in profiles}

    # Meals FK
    for m in meal_logs:
        if m.get("demo_seed") == "heartlink-demo-v2" and m.get("recipe_id") and m["recipe_id"] not in recipe_ids:
            errors.append(f"Meal Log {m['id']} references nonexistent Recipe {m['recipe_id']}")

    # Exercise Logs FK
    for ex in exercise_logs:
        if ex.get("demo_seed") == "heartlink-demo-v2" and ex.get("routine_id") and ex["routine_id"] not in routine_ids:
            errors.append(f"Exercise Log {ex['id']} references nonexistent Exercise Routine {ex['routine_id']}")

    # Symptom Exercise FK
    exercise_log_ids = {ex["id"] for ex in exercise_logs}
    for l in daily_health_logs:
        trigger_ex = l.get("triggered_by_exercise_id")
        if l.get("demo_seed") == "heartlink-demo-v2" and trigger_ex and trigger_ex not in exercise_log_ids:
            errors.append(f"Health Log {l['id']} references nonexistent exercise trigger {trigger_ex}")

    # HSS User FK
    for h in hss_history:
        if h.get("demo_seed") == "heartlink-demo-v2" and h["user_id"] not in user_ids:
            errors.append(f"HSS Record {h['id']} references nonexistent User {h['user_id']}")

    # Evaluations User & Case ID helper checks
    for ev in expert_evaluations:
        if ev.get("demo_seed") == "heartlink-demo-v2":
            if ev["user_id"] not in user_ids:
                errors.append(f"Evaluation {ev['id']} references nonexistent User {ev['user_id']}")
            
            # Deterministic Case ID helper matches
            expected_case = get_deterministic_case_id(ev["user_id"])
            if ev["case_id"] != expected_case:
                errors.append(f"Evaluation {ev['id']} Case ID {ev['case_id']} does not match deterministic expectation {expected_case}")

    # Thresholds User FK
    for t in user_thresholds:
        if t.get("demo_seed") == "heartlink-demo-v2" and t["user_id"] not in user_ids:
            errors.append(f"Threshold record {t['id']} references nonexistent User {t['user_id']}")

    # 3. Score/Tier Consistency Checks
    for h in hss_history:
        score = h["score"]
        tier = h["tier"]
        expected_tier = "Stable" if score >= 80 else ("Moderate" if score >= 60 else ("Elevated Risk" if score >= 50 else "Critical"))
        if tier != expected_tier:
            errors.append(f"HSS record {h['id']} score {score} does not match tier {tier}")
        if tier in {"Caution", "At Risk", "Needs Attention"}:
            errors.append(f"HSS record {h['id']} uses deprecated tier {tier}")

    # 4. Critical Trajectory Assignment Check
    # Dolores Diaz (usr-patient-d01) must have Critical HSS scores and alert, John Mark (usr-patient-101) must not.
    usr_d_hss = [h for h in hss_history if h["user_id"] == "usr-patient-d01"]
    if not usr_d_hss:
        errors.append("usr-patient-d01 has no HSS records seeded.")
    else:
        min_score = min(h["score"] for h in usr_d_hss)
        if min_score >= 50:
            errors.append(f"usr-patient-d01 HSS scores are not critical: {usr_d_hss}")

    usr_101_hss = [h for h in hss_history if h["user_id"] == "usr-patient-101" and h.get("demo_seed") == "heartlink-demo-v2"]
    if usr_101_hss:
        errors.append("usr-patient-101 has demo-seeded HSS history (should belong to Dolores Diaz).")

    # 5. Routine Name / ID Mismatch
    for ex in exercise_logs:
        if ex.get("demo_seed") == "heartlink-demo-v2":
            routine = next((r for r in exercise_routines if r["id"] == ex["routine_id"]), None)
            if routine and routine["name"] != ex["routine_name"]:
                errors.append(f"Exercise Log {ex['id']} Mismatch: routine_id {ex['routine_id']} is named '{routine['name']}' but log says '{ex['routine_name']}'")

    # 6. Soft-Deleted Sleep Logs Leakage Verification
    # Soft deleted logs (deleted_at is not None) should not be returned by standard clinical endpoints
    deleted_sleep_ids = {s["id"] for s in sleep_logs if s.get("deleted_at") is not None}
    if deleted_sleep_ids:
        # Check clinical timeline
        from app.services.clinical import get_recent_telemetry_timeline
        for p_id in user_ids:
            timeline = get_recent_telemetry_timeline(p_id)
            for item in timeline:
                if item["type"] == "Sleep" and item.get("id") in deleted_sleep_ids:
                    errors.append(f"Soft-deleted sleep log {item.get('id')} leaked into clinical timeline for user {p_id}")

    # Output Results
    if errors:
        print("\n!!! DATA INTEGRITY FAILURES DETECTED !!!")
        for err in errors:
            print(f"- {err}")
        sys.exit(1)
    else:
        print("\n>>> All Data Integrity Assertions Passed Successfully! <<<")
        sys.exit(0)

if __name__ == "__main__":
    run_validation()
