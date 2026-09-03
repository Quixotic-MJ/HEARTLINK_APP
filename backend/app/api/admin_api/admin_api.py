from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import os
import random
import hashlib
from app.utils.security import get_current_admin_user, get_current_super_admin
from app.utils.activity_helper import record_admin_activity
from app.db.client import get_supabase_client
from app.db.repositories import (
    get_profile_repo,
    get_health_logs_repo,
    get_meals_repo,
    get_exercises_repo,
    get_sleep_repo,
    get_hss_repo,
    get_content_repo,
    get_notification_repo,
    get_admin_repo,
    get_case_review_repo
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

def _parse_dt(dt):
    if not dt:
        return None
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00")).replace(tzinfo=None)
        except (ValueError, TypeError):
            return None
    return None

@router.get("/dashboard", response_model=Dict[str, Any])
def get_admin_dashboard(current_user: dict = Depends(get_current_admin_user)):
    now = datetime.utcnow()
    cutoff = now - timedelta(days=7)
    
    def is_recent(dt_val):
        parsed = _parse_dt(dt_val)
        return parsed is not None and parsed >= cutoff

    profile_repo = get_profile_repo()
    all_profiles = profile_repo.list_all()
    users = [p for p in all_profiles if p.get("role") == "patient"]
    patient_ids = {str(p["id"]) for p in users}
    total_users = len(users)

    meal_logs = get_meals_repo().list_all_meals()
    exercise_logs = get_exercises_repo().list_all_logs()
    sleep_logs = get_sleep_repo().list_all_logs()
    daily_health_logs = get_health_logs_repo().list_all_logs()
    hss_history = get_hss_repo().list_all_hss_records()
    alerts = get_health_logs_repo().list_alerts()
    recipes = get_content_repo().list_recipes()
    exercise_routines = get_content_repo().list_routines()
    evaluations = get_case_review_repo().list_evaluations()

    active_user_ids = set()
    for m in meal_logs:
        if is_recent(m.get("logged_at")):
            active_user_ids.add(str(m.get("user_id")))
    for e in exercise_logs:
        if is_recent(e.get("logged_at")):
            active_user_ids.add(str(e.get("user_id")))
    for s in sleep_logs:
        if not s.get("is_deleted") and is_recent(s.get("logged_at")):
            active_user_ids.add(str(s.get("user_id")))
    for l in daily_health_logs:
        if is_recent(l.get("logged_at")):
            active_user_ids.add(str(l.get("user_id")))
            
    active_users = len(active_user_ids.intersection(patient_ids))
    
    # Average HSS (latest per user)
    latest_hss = {}
    sorted_hss = sorted(hss_history, key=lambda x: _parse_dt(x.get("computed_at")) or datetime.min)
    for entry in sorted_hss:
        uid = str(entry.get("user_id"))
        score = entry.get("score")
        if uid in patient_ids and score is not None:
            latest_hss[uid] = score
            
    valid_scores = list(latest_hss.values())
    avg_hss = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 0
    
    # Open Alerts
    open_alerts = sum(1 for a in alerts if a.get("status") != "Resolved")
    
    # HSS distribution
    stable = sum(1 for s in valid_scores if s >= 80)
    moderate = sum(1 for s in valid_scores if 60 <= s < 80)
    elevated_risk = sum(1 for s in valid_scores if 50 <= s < 60)
    critical = sum(1 for s in valid_scores if s < 50)
            
    total_scored = len(valid_scores)
    hss_distribution = {
        "stable": {
            "count": stable,
            "percentage": round((stable / total_scored * 100) if total_scored else 0)
        },
        "moderate": {
            "count": moderate,
            "percentage": round((moderate / total_scored * 100) if total_scored else 0)
        },
        "elevated_risk": {
            "count": elevated_risk,
            "percentage": round((elevated_risk / total_scored * 100) if total_scored else 0)
        },
        "critical": {
            "count": critical,
            "percentage": round((critical / total_scored * 100) if total_scored else 0)
        }
    }
    
    critical_hss_count = critical
    symptoms_recorded = 0
    for l in daily_health_logs:
        if is_recent(l.get("logged_at")) and str(l.get("user_id")) in patient_ids:
            symptoms_recorded += len(l.get("symptoms", []) or [])
            
    evaluated_user_ids = {str(e.get("user_id")) for e in evaluations}
    pending_evaluations = sum(1 for p in users if p.get("onboarding_status") == "complete" and str(p["id"]) not in evaluated_user_ids)
    
    users_needing_review = {
        "critical_hss": critical_hss_count,
        "symptoms_recorded": symptoms_recorded,
        "pending_evaluations": pending_evaluations,
        "open_alerts": open_alerts
    }
    
    meals_this_week = sum(1 for m in meal_logs if is_recent(m.get("logged_at")) and str(m.get("user_id")) in patient_ids)
    exercise_this_week = sum(1 for e in exercise_logs if is_recent(e.get("logged_at")) and str(e.get("user_id")) in patient_ids)
    vitals_this_week = sum(1 for l in daily_health_logs if is_recent(l.get("logged_at")) and str(l.get("user_id")) in patient_ids)
    sleep_this_week = sum(1 for s in sleep_logs if not s.get("is_deleted") and is_recent(s.get("logged_at")) and str(s.get("user_id")) in patient_ids)
    symptoms_this_week = symptoms_recorded
    
    user_activity = {
        "meals": meals_this_week,
        "exercise": exercise_this_week,
        "vitals": vitals_this_week,
        "sleep": sleep_this_week,
        "symptoms": symptoms_this_week
    }
    
    content_library = {
        "recipes": len(recipes),
        "exercises": len(exercise_routines)
    }
    
    # Recent Admin Activity
    admin_activity = get_admin_repo().list_activity(limit=10)
    recent_activity = []
    for act in admin_activity:
        recent_activity.append({
            "id": act.get("id"),
            "admin_user_id": act.get("admin_user_id"),
            "admin_name": act.get("admin_name"),
            "action": act.get("action"),
            "target_type": act.get("target_type"),
            "target_id": act.get("target_id"),
            "target_name": act.get("target_name"),
            "created_at": act.get("created_at")
        })
    
    return {
        "kpi": {
            "total_users": total_users,
            "active_users": active_users,
            "avg_hss": avg_hss,
            "open_alerts": open_alerts
        },
        "users_needing_review": users_needing_review,
        "hss_distribution": hss_distribution,
        "user_activity": user_activity,
        "content_library": content_library,
        "recent_activity": recent_activity
    }

@router.get("/analytics", response_model=Dict[str, Any])
def get_admin_analytics(period: str = "6months", current_user: dict = Depends(get_current_admin_user)):
    now = datetime.utcnow()
    
    all_profiles = get_profile_repo().list_all()
    actual_patients = [p for p in all_profiles if p.get("role") == "patient"]
    actual_users = len(actual_patients)
    archived_patients = sum(1 for p in actual_patients if p.get("account_status") == "archived")
    
    num_months = 6
    if period == "30days":
        num_months = 1
    elif period == "3months":
        num_months = 3
    elif period == "6months":
        num_months = 6
    elif period == "12months":
        num_months = 12

    if period == "30days":
        cutoff_current = now - timedelta(days=30)
        cutoff_prev = now - timedelta(days=60)
    elif period == "3months":
        cutoff_current = now - timedelta(days=90)
        cutoff_prev = now - timedelta(days=180)
    elif period == "6months":
        cutoff_current = now - timedelta(days=180)
        cutoff_prev = now - timedelta(days=360)
    else:
        cutoff_current = now - timedelta(days=365)
        cutoff_prev = now - timedelta(days=730)

    current_registrations = 0
    prev_registrations = 0
    for p in actual_patients:
        created = _parse_dt(p.get("created_at")) or now
        if cutoff_current <= created <= now:
            current_registrations += 1
        elif cutoff_prev <= created < cutoff_current:
            prev_registrations += 1
            
    if prev_registrations > 0:
        growth_val = round(((current_registrations - prev_registrations) / prev_registrations) * 100)
        signups_growth = f"{'+' if growth_val >= 0 else ''}{growth_val}%"
    else:
        signups_growth = "No comparative data"

    meal_logs = get_meals_repo().list_all_meals()
    exercise_logs = get_exercises_repo().list_all_logs()
    sleep_logs = get_sleep_repo().list_all_logs()
    daily_health_logs = get_health_logs_repo().list_all_logs()
    hss_history = get_hss_repo().list_all_hss_records()
    recipes = get_content_repo().list_recipes()
    exercise_routines = get_content_repo().list_routines()

    def count_logs_in_range(start_dt, end_dt):
        cnt = 0
        for m in meal_logs:
            logged_at = _parse_dt(m.get("logged_at"))
            if logged_at and start_dt <= logged_at <= end_dt:
                cnt += 1
        for ex in exercise_logs:
            if ex.get("status") != "abandoned":
                logged_at = _parse_dt(ex.get("logged_at"))
                if logged_at and start_dt <= logged_at <= end_dt:
                    cnt += 1
        for s in sleep_logs:
            if not s.get("is_deleted"):
                logged_at = _parse_dt(s.get("logged_at"))
                if logged_at and start_dt <= logged_at <= end_dt:
                    cnt += 1
        for l in daily_health_logs:
            logged_at = _parse_dt(l.get("logged_at"))
            if logged_at and start_dt <= logged_at <= end_dt:
                cnt += 1
        return cnt

    total_records = count_logs_in_range(cutoff_current, now)
    prev_records = count_logs_in_range(cutoff_prev, cutoff_current)

    if prev_records > 0:
        records_growth_val = round(((total_records - prev_records) / prev_records) * 100)
        records_growth = f"{'+' if records_growth_val >= 0 else ''}{records_growth_val}%"
    else:
        records_growth = "No comparative data"

    churn_rate = f"{round(archived_patients / actual_users * 100, 1) if actual_users else 0}%"

    demographics = {
        "total_signups": actual_users,
        "signups_growth": signups_growth,
        "total_records": total_records,
        "records_growth": records_growth,
        "archived_accounts": archived_patients,
        "churn_rate": churn_rate,
        "monthly_dau": []
    }

    months_boundaries = []
    current_month_start = datetime(now.year, now.month, 1)
    
    for i in range(num_months - 1, -1, -1):
        m = current_month_start.month - i
        y = current_month_start.year
        while m <= 0:
            m += 12
            y -= 1
        start_of_month = datetime(y, m, 1)
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        end_of_month = datetime(ny, nm, 1)
        months_boundaries.append((start_of_month, end_of_month))

    for start_of_month, end_of_month in months_boundaries:
        active_users_in_month = set()
        for p in actual_patients:
            p_id = str(p["id"])
            has_activity = False
            for m in meal_logs:
                if str(m.get("user_id")) == p_id:
                    logged_at = _parse_dt(m.get("logged_at"))
                    if logged_at and start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)
                continue

            for ex in exercise_logs:
                if str(ex.get("user_id")) == p_id and ex.get("status") != "abandoned":
                    logged_at = _parse_dt(ex.get("logged_at"))
                    if logged_at and start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)
                continue

            for s in sleep_logs:
                if str(s.get("user_id")) == p_id and not s.get("is_deleted"):
                    logged_at = _parse_dt(s.get("logged_at"))
                    if logged_at and start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)
                continue

            for l in daily_health_logs:
                if str(l.get("user_id")) == p_id:
                    logged_at = _parse_dt(l.get("logged_at"))
                    if logged_at and start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)

        demographics["monthly_dau"].append({
            "name": start_of_month.strftime("%b"),
            "dau": len(active_users_in_month)
        })

    wellness_outcomes = []
    for start_of_month, end_of_month in months_boundaries:
        stable = 0
        moderate = 0
        elevated_risk = 0
        critical = 0
        
        for p in actual_patients:
            p_id = str(p["id"])
            p_records = []
            for entry in hss_history:
                if str(entry.get("user_id")) != p_id:
                    continue
                dt = _parse_dt(entry.get("computed_at"))
                if dt and dt < end_of_month:
                    p_records.append((dt, entry))
            
            if p_records:
                p_records.sort(key=lambda x: x[0], reverse=True)
                latest_entry = p_records[0][1]
                tier = latest_entry.get("tier", "Moderate")
                if tier == "Stable": stable += 1
                elif tier == "Moderate": moderate += 1
                elif tier == "Elevated Risk": elevated_risk += 1
                else: critical += 1

        wellness_outcomes.append({
            "name": start_of_month.strftime("%b"),
            "stable": stable,
            "moderate": moderate,
            "elevated_risk": elevated_risk,
            "critical": critical
        })

    scored_recipes = []
    for r in recipes:
        r_id = str(r["id"])
        actual_cooks = sum(1 for m in meal_logs if str(m.get("recipe_id")) == r_id)
        scored_recipes.append({
            "name": r.get("name", "Unknown Recipe"),
            "completions": actual_cooks
        })
    scored_recipes = sorted(scored_recipes, key=lambda x: x["completions"], reverse=True)[:5]
    
    scored_exercises = []
    for ex in exercise_routines:
        ex_id = str(ex["id"])
        actual_sessions = sum(1 for l in exercise_logs if str(l.get("routine_id")) == ex_id and l.get("status") != "abandoned")
        scored_exercises.append({
            "name": ex.get("name", "Unknown Routine"),
            "completions": actual_sessions
        })
    scored_exercises = sorted(scored_exercises, key=lambda x: x["completions"], reverse=True)[:5]

    content_efficacy = {
        "top_recipes": scored_recipes,
        "top_exercises": scored_exercises
    }

    symptoms_map = {}
    for l in daily_health_logs:
        for sym in (l.get("symptoms") or []):
            symptoms_map[sym] = symptoms_map.get(sym, 0) + 1
    symptoms_frequency = []
    for sym, count in sorted(symptoms_map.items(), key=lambda x: x[1], reverse=True):
        formatted_name = str(sym).replace("_", " ").title()
        symptoms_frequency.append({"name": formatted_name, "count": count})

    recipes_dist = {"Stable": 0, "Moderate": 0, "Elevated Risk": 0, "Critical": 0}
    for r in recipes:
        tier = r.get("hss_tier", "Stable")
        if tier in recipes_dist:
            recipes_dist[tier] += 1
            
    exercises_dist = {"Stable": 0, "Moderate": 0, "Elevated Risk": 0, "Critical": 0}
    for ex in exercise_routines:
        tier = ex.get("hss_tier", "Stable")
        if tier in exercises_dist:
            exercises_dist[tier] += 1
            
    content_distribution = {
        "recipes": recipes_dist,
        "exercises": exercises_dist
    }

    activity_over_time = []
    for start_of_month, end_of_month in months_boundaries:
        meals_count = 0
        for m in meal_logs:
            logged_at = _parse_dt(m.get("logged_at"))
            if logged_at and start_of_month <= logged_at < end_of_month:
                meals_count += 1

        ex_count = 0
        for e in exercise_logs:
            if e.get("status") != "abandoned":
                logged_at = _parse_dt(e.get("logged_at"))
                if logged_at and start_of_month <= logged_at < end_of_month:
                    ex_count += 1

        sleep_count = 0
        for s in sleep_logs:
            if not s.get("is_deleted"):
                logged_at = _parse_dt(s.get("logged_at"))
                if logged_at and start_of_month <= logged_at < end_of_month:
                    sleep_count += 1
        
        vitals_count = 0
        symptoms_count = 0
        for l in daily_health_logs:
            logged_at = _parse_dt(l.get("logged_at"))
            if logged_at and start_of_month <= logged_at < end_of_month:
                vitals_count += 1
                symptoms_count += len(l.get("symptoms") or [])
                
        activity_over_time.append({
            "name": start_of_month.strftime("%b"),
            "meals": meals_count,
            "exercises": ex_count,
            "sleep": sleep_count,
            "vitals": vitals_count,
            "symptoms": symptoms_count
        })

    return {
        "demographics": demographics,
        "wellness_outcomes": wellness_outcomes,
        "content_efficacy": content_efficacy,
        "symptoms_frequency": symptoms_frequency,
        "content_distribution": content_distribution,
        "activity_over_time": activity_over_time
    }

@router.get("/staff")
def get_system_staff(current_user: dict = Depends(get_current_super_admin)):
    all_profiles = get_profile_repo().list_all()
    staff = [p for p in all_profiles if p.get("role") in ["medical_expert", "admin", "super_admin"]]
    result = []
    for s in staff:
        if s.get("role") == "super_admin":
            role_label = "Super Admin"
            perms = ["All Administrative Permissions"]
        elif s.get("role") == "admin":
            role_label = "System Admin"
            perms = ["Manage Content", "Broadcast Alerts", "View Analytics", "Manage Users"]
        else:
            role_label = "Authorized Medical Expert"
            perms = ["Validate Recipes", "Verify Exercises", "Evaluate Cases"]
            
        result.append({
            "id": s.get("id"),
            "name": f"{s.get('first_name', '')} {s.get('last_name', '')}".strip() or s.get("email"),
            "email": s.get("email"),
            "phone": s.get("phone", "No Phone"),
            "role": role_label,
            "permissions": perms,
            "account_status": s.get("account_status", "active"),
            "status": s.get("account_status", "active").capitalize(),
            "created_at": s.get("created_at")
        })
    return result

@router.post("/staff")
def create_system_staff(payload: dict, current_user: dict = Depends(get_current_super_admin)):
    name = payload.get("name", "").strip()
    email = (payload.get("email") or "").strip()
    phone = (payload.get("phone") or "").strip()
    role_label = payload.get("role", "")

    # --- Input validation ---
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if role_label in ["Super Admin", "super_admin"]:
        target_role = "super_admin"
    elif role_label in ["Authorized Medical Expert", "medical_expert", "Expert Reviewer"]:
        target_role = "medical_expert"
    elif role_label in ["System Admin", "admin"]:
        target_role = "admin"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid staff role: '{role_label}'")

    # --- Duplicate email check ---
    profile_repo = get_profile_repo()
    all_profiles = profile_repo.list_all()
    for p in all_profiles:
        if (p.get("email") or "").strip().lower() == email.lower():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

    temp_pass = "TempPass2026!"
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
                print(f"[create_system_staff] User already exists in auth: {auth_user_id}")
                break
    except Exception as lookup_err:
        print(f"[create_system_staff] Pre-lookup warning: {lookup_err}")

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
                    print(f"[create_system_staff] Auth user created: {auth_user_id}")
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
                print(f"[create_system_staff] REST auth creation failed {resp.status_code}: {err_body}")

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
        "account_status": "active"
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
            print(f"[create_system_staff] Rolled back auth user {auth_user_id} after profile insert failure.")
        except Exception:
            pass
        raise

    # --- Step 4: Audit log ---
    admin_id = current_user.get("user_id") if current_user else "admin"
    role_desc = "medical expert" if target_role == "medical_expert" else "admin"
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
            recipient_roles=["super_admin"],
            route="/users",
            target_id=str(staff_id),
            read_by=[admin_id] if admin_id else []
        )
    except Exception as notif_err:
        print(f"[create_system_staff] Notification skipped: {notif_err}")

    return {"status": "success", "id": str(staff_id)}



@router.put("/users/{user_id}/status")
def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    profile_repo = get_profile_repo()
    user = profile_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_status = user.get("account_status", "active")
    user_role = user.get("role", "patient")
    
    is_staff = user_role in ["admin", "medical_expert", "super_admin"]
    current_admin_role = current_user.get("role")
    
    if is_staff and current_admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Access Denied: Only Super Admin can manage staff status")
        
    if str(user_id) == str(current_user.get("user_id")):
        raise HTTPException(status_code=400, detail="Self-deactivation is not permitted")
        
    if user_role == "super_admin" and current_status == "active":
        all_profiles = profile_repo.list_all()
        active_super_admins = [p for p in all_profiles if p.get("role") == "super_admin" and p.get("account_status") == "active"]
        if len(active_super_admins) <= 1:
            raise HTTPException(status_code=400, detail="Deactivating the last active Super Admin is not permitted")
            
    new_status = "disabled" if current_status == "active" else "active"
    profile_repo.update_profile(user_id, {"account_status": new_status})
    
    admin_id = current_user.get("user_id") if current_user else "admin"
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get("email") or user_id
    target_type = "user" if user_role == "patient" else "staff"
    
    if user_role == "patient":
        action_desc = f"{'disabled' if new_status == 'disabled' else 'activated'} user account"
    else:
        role_desc = "medical expert" if user_role == "medical_expert" else ("admin" if user_role == "admin" else "super_admin")
        action_desc = f"{'Disabled' if new_status == 'disabled' else 'Enabled'} {role_desc} account"
        
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
                recipient_roles=["super_admin"],
                route="/users",
                target_id=str(user_id),
                read_by=[admin_id] if admin_id else []
            )
        except Exception as e:
            print(f"Failed to create admin notification for staff status change: {e}")

    return {"status": "success", "new_status": new_status}

@router.put("/staff/{staff_id}/role")
def change_staff_role(staff_id: str, payload: dict, current_user: dict = Depends(get_current_super_admin)):
    profile_repo = get_profile_repo()
    target_user = profile_repo.get_by_id(staff_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    new_role_label = payload.get("role")
    if new_role_label not in ["Authorized Medical Expert", "System Admin", "medical_expert", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role label")
        
    new_role = "medical_expert" if new_role_label in ["Authorized Medical Expert", "medical_expert"] else "admin"
    
    if str(staff_id) == str(current_user.get("user_id")):
        raise HTTPException(status_code=400, detail="Self-demotion is not permitted")

    if target_user.get("role") not in ["admin", "medical_expert"]:
        raise HTTPException(status_code=400, detail="Target user is not a regular staff member")
        
    old_role = target_user.get("role")
    profile_repo.update_profile(staff_id, {"role": new_role})
    
    admin_id = current_user.get("user_id") if current_user else "admin"
    user_name = f"{target_user.get('first_name', '')} {target_user.get('last_name', '')}".strip() or target_user.get("email") or staff_id
    action_desc = f"Changed staff role from {old_role} to {new_role}"
    
    record_admin_activity(
        admin_user_id=admin_id,
        action=action_desc,
        target_type="staff",
        target_id=str(staff_id),
        target_name=user_name
    )
    return {"status": "success", "new_role": new_role}

@router.delete("/users/{user_id}")
@router.delete("/staff/{user_id}")
def delete_user_or_staff(user_id: str, current_user: dict = Depends(get_current_super_admin)):
    if str(user_id) == str(current_user.get("user_id")):
        raise HTTPException(status_code=400, detail="Self-deletion is not permitted")

    profile_repo = get_profile_repo()
    user = profile_repo.get_by_id(user_id)
    user_role = user.get("role", "patient") if user else None
    
    if user_role == "super_admin":
        raise HTTPException(status_code=400, detail="Deleting another Super Admin is not permitted")

    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() if user else user_id
    
    # 1. Clean up associated database child records across tables to satisfy foreign keys
    # NOTE: admin_activity_logs is intentionally excluded — it has an immutability trigger
    # that blocks DELETE operations. Its FK uses ON DELETE SET NULL, so it self-manages.
    supabase_client = get_supabase_client()
    child_tables = [
        ("feedback_tickets", "user_id"),
        ("feedback_tickets", "resolved_by"),
        ("case_reviews", "expert_id"),
        ("case_reviews", "patient_id"),
        ("daily_health_logs", "user_id"),
        ("health_logs", "user_id"),
        ("sleep_logs", "user_id"),
        ("meal_logs", "user_id"),
        ("exercise_logs", "user_id"),
        ("patient_notifications", "user_id"),
        ("user_reminders", "user_id"),
        ("user_thresholds", "user_id"),
        ("baseline_onboarding", "user_id"),
        ("clinical_alerts", "user_id"),
    ]
    for table_name, col_name in child_tables:
        try:
            supabase_client.table(table_name).delete().eq(col_name, user_id).execute()
        except Exception:
            pass

    # 2. Delete profile
    profile_repo.delete(user_id)

    # 3. Delete from Supabase Auth
    try:
        supabase_client.auth.admin.delete_user(user_id)
    except Exception as auth_err:
        print(f"[delete_user_or_staff] Auth delete note: {auth_err}")

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

@router.get("/users/{user_id}/timeline")
def get_user_timeline(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    logs = []
    
    daily_health_logs = get_health_logs_repo().list_user_logs(user_id)
    for log in daily_health_logs:
        logs.append({
            "type": "Vitals",
            "timestamp": log.get("logged_at"),
            "data": {
                "systolic": log.get("systolic_bp"),
                "diastolic": log.get("diastolic_bp"),
                "heart_rate": log.get("heart_rate_bpm"),
                "weight_kg": log.get("weight_kg"),
                "blood_sugar": log.get("blood_sugar")
            }
        })
        if log.get("symptoms"):
            logs.append({
                "type": "Symptoms",
                "timestamp": log.get("logged_at"),
                "data": {
                    "symptoms": log.get("symptoms"),
                    "severity_map": log.get("severity_map"),
                    "context": log.get("context")
                }
            })
            
    meal_logs = get_meals_repo().list_user_meals(user_id)
    for m in meal_logs:
        logs.append({
            "type": "Meal",
            "timestamp": m.get("logged_at"),
            "data": {
                "meal_name": m.get("meal_name"),
                "calories": m.get("calories"),
                "sodium_mg": m.get("sodium_mg")
            }
        })
        
    exercise_logs = get_exercises_repo().list_user_logs(user_id)
    for e in exercise_logs:
        logs.append({
            "type": "Exercise",
            "timestamp": e.get("logged_at"),
            "data": {
                "routine_name": e.get("routine_name"),
                "duration_minutes": e.get("duration_minutes"),
                "status": e.get("status")
            }
        })
        
    sleep_logs = get_sleep_repo().list_user_logs(user_id)
    for s in sleep_logs:
        logs.append({
            "type": "Sleep",
            "timestamp": s.get("logged_at"),
            "data": {
                "duration_hours": s.get("duration_hours"),
                "quality": s.get("quality")
            }
        })
        
    hss_logs = get_hss_repo().list_hss_history(user_id)
    for h in hss_logs:
        logs.append({
            "type": "HSS",
            "timestamp": h.get("computed_at"),
            "data": {
                "score": h.get("score"),
                "tier": h.get("tier")
            }
        })
        
    def parse_dt(x):
        dt = _parse_dt(x.get("timestamp"))
        return dt if dt else datetime.min
        
    logs.sort(key=parse_dt, reverse=True)
    return logs

@router.get("/broadcasts", response_model=list)
def get_broadcasts(current_user: dict = Depends(get_current_admin_user)):
    return get_notification_repo().list_broadcasts()

VALID_BROADCAST_TYPES = {"Maintenance", "App Update", "Safety Reminder", "General"}
VALID_BROADCAST_AUDIENCES = {"All Registered Accounts"}

@router.post("/broadcasts")
def create_broadcast(payload: dict, current_user: dict = Depends(get_current_admin_user)):
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
def delete_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_admin_user)):
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

@router.get("/activity")
def get_activity_log(
    page: int = 1,
    page_size: int = 20,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    admin_user_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_user)
):
    role = current_user.get("role")
    if role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Admin or Super Admin role required."
        )

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
