from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime, timedelta
from app.mock_db import profiles, alerts, hss_history, exercise_routines, meal_logs, exercise_logs, sleep_logs, daily_health_logs, recipes, system_broadcasts, notifications, save_logs, expert_evaluations, admin_activity
from app.utils.security import get_current_admin_user, get_current_super_admin
import random

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard", response_model=Dict[str, Any])
def get_admin_dashboard(current_user: dict = Depends(get_current_admin_user)):
    now = datetime.now()
    cutoff = now - timedelta(days=7)
    
    # Helper to check if datetime is >= cutoff
    def is_recent(dt):
        if not dt:
            return False
        if isinstance(dt, str):
            try:
                dt = datetime.fromisoformat(dt)
            except:
                return False
        return dt >= cutoff

    # 1. Total Users (patients)
    users = [p for p in profiles if p.get("role") == "patient"]
    patient_ids = {p["id"] for p in users}
    total_users = len(users)
    
    # 2. Active Users (at least one health/lifestyle log in last 7 days)
    active_user_ids = set()
    for m in meal_logs:
        if is_recent(m.get("logged_at")):
            active_user_ids.add(m.get("user_id"))
    for e in exercise_logs:
        if is_recent(e.get("logged_at")):
            active_user_ids.add(e.get("user_id"))
    for s in sleep_logs:
        if s.get("deleted_at") is None and is_recent(s.get("logged_at")):
            active_user_ids.add(s.get("user_id"))
    for l in daily_health_logs:
        if is_recent(l.get("logged_at")):
            active_user_ids.add(l.get("user_id"))
            
    active_users = len(active_user_ids.intersection(patient_ids))
    
    # 3. Average HSS (based on latest per user)
    latest_hss = {}
    for entry in sorted(hss_history, key=lambda x: x.get("computed_at") or datetime.min):
        uid = entry.get("user_id")
        score = entry.get("score")
        if uid in patient_ids and score is not None:
            latest_hss[uid] = score
            
    valid_scores = [score for score in latest_hss.values()]
    avg_hss = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 0
    
    # 4. Open Alerts
    open_alerts = sum(1 for a in alerts if a.get("status") != "Resolved")
    
    # 5. HSS distribution (percentage of latest score per user)
    stable = 0
    moderate = 0
    elevated_risk = 0
    critical = 0
    for score in latest_hss.values():
        if score >= 80:
            stable += 1
        elif score >= 60:
            moderate += 1
        elif score >= 50:
            elevated_risk += 1
        else:
            critical += 1
            
    total_scored = len(latest_hss)
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
    
    # 6. Users Needing Review
    critical_hss_count = sum(1 for score in latest_hss.values() if score < 50)
    
    symptoms_recorded = 0
    for l in daily_health_logs:
        if is_recent(l.get("logged_at")) and l.get("user_id") in patient_ids:
            symptoms_recorded += len(l.get("symptoms", []))
            
    pending_evaluations = sum(1 for p in profiles if p.get("role") == "patient" and p.get("onboarding_status") == "complete" and not any(e["user_id"] == p["id"] for e in expert_evaluations))
    
    users_needing_review = {
        "critical_hss": critical_hss_count,
        "symptoms_recorded": symptoms_recorded,
        "pending_evaluations": pending_evaluations,
        "open_alerts": open_alerts
    }
    
    # 7. User Activity (Last 7 Days)
    meals_this_week = sum(1 for m in meal_logs if is_recent(m.get("logged_at")) and m.get("user_id") in patient_ids)
    exercise_this_week = sum(1 for e in exercise_logs if is_recent(e.get("logged_at")) and e.get("user_id") in patient_ids)
    vitals_this_week = sum(1 for l in daily_health_logs if is_recent(l.get("logged_at")) and l.get("user_id") in patient_ids)
    sleep_this_week = sum(1 for s in sleep_logs if s.get("deleted_at") is None and is_recent(s.get("logged_at")) and s.get("user_id") in patient_ids)
    symptoms_this_week = symptoms_recorded
    
    user_activity = {
        "meals": meals_this_week,
        "exercise": exercise_this_week,
        "vitals": vitals_this_week,
        "sleep": sleep_this_week,
        "symptoms": symptoms_this_week
    }
    
    # 8. Content Library
    content_library = {
        "recipes": len(recipes),
        "exercises": len(exercise_routines)
    }
    
    # 9. Recent Admin Activity (Latest 10 events, newest first)
    sorted_activity = sorted(admin_activity, key=lambda x: x.get("created_at") or datetime.min, reverse=True)
    recent_activity = []
    for act in sorted_activity[:10]:
        recent_activity.append({
            "id": act.get("id"),
            "admin_user_id": act.get("admin_user_id"),
            "admin_name": act.get("admin_name"),
            "action": act.get("action"),
            "target_type": act.get("target_type"),
            "target_id": act.get("target_id"),
            "target_name": act.get("target_name"),
            "created_at": act.get("created_at").isoformat() if isinstance(act.get("created_at"), datetime) else act.get("created_at")
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
    now = datetime.now()
    
    # 1. Demographics & Adoption (100% Authentic)
    actual_patients = [p for p in profiles if p.get("role") == "patient"]
    actual_users = len(actual_patients)
    archived_patients = sum(1 for p in actual_patients if p.get("account_status") == "archived")
    
    # Map period to number of calendar months
    num_months = 6
    if period == "30days":
        num_months = 1
    elif period == "3months":
        num_months = 3
    elif period == "6months":
        num_months = 6
    elif period == "12months":
        num_months = 12

    # Calculate comparative boundaries for Sign-up Growth and Total Activity Logs
    if period == "30days":
        cutoff_current = now - timedelta(days=30)
        cutoff_prev = now - timedelta(days=60)
    elif period == "3months":
        cutoff_current = now - timedelta(days=90)
        cutoff_prev = now - timedelta(days=180)
    elif period == "6months":
        cutoff_current = now - timedelta(days=180)
        cutoff_prev = now - timedelta(days=360)
    else: # 12months
        cutoff_current = now - timedelta(days=365)
        cutoff_prev = now - timedelta(days=730)

    # 1.1 Calculate Sign-up Growth based on actual registration dates
    current_registrations = 0
    prev_registrations = 0
    for p in actual_patients:
        created = p.get("created_at", now)
        if isinstance(created, str):
            try: created = datetime.fromisoformat(created)
            except: created = now
        
        if cutoff_current <= created <= now:
            current_registrations += 1
        elif cutoff_prev <= created < cutoff_current:
            prev_registrations += 1
            
    if prev_registrations > 0:
        growth_val = round(((current_registrations - prev_registrations) / prev_registrations) * 100)
        signups_growth = f"{'+' if growth_val >= 0 else ''}{growth_val}%"
    else:
        signups_growth = "No comparative data"

    # 1.2 Calculate Total Activity Logs for current and previous period
    total_records = 0
    
    # Helper to count records within a timeframe
    def count_logs_in_range(start_dt, end_dt):
        cnt = 0
        # Meals
        for m in meal_logs:
            if m.get("deleted_at") is None:
                logged_at = m.get("logged_at")
                if isinstance(logged_at, str):
                    try: logged_at = datetime.fromisoformat(logged_at)
                    except: continue
                if start_dt <= logged_at <= end_dt:
                    cnt += 1
        # Exercises (excluding abandoned)
        for ex in exercise_logs:
            if ex.get("deleted_at") is None and ex.get("status") != "abandoned":
                logged_at = ex.get("logged_at")
                if isinstance(logged_at, str):
                    try: logged_at = datetime.fromisoformat(logged_at)
                    except: continue
                if start_dt <= logged_at <= end_dt:
                    cnt += 1
        # Sleep
        for s in sleep_logs:
            if s.get("deleted_at") is None:
                logged_at = s.get("logged_at")
                if isinstance(logged_at, str):
                    try: logged_at = datetime.fromisoformat(logged_at)
                    except: continue
                if start_dt <= logged_at <= end_dt:
                    cnt += 1
        # Daily Health Logs (Vitals + Symptoms)
        for l in daily_health_logs:
            if l.get("deleted_at") is None:
                logged_at = l.get("logged_at")
                if isinstance(logged_at, str):
                    try: logged_at = datetime.fromisoformat(logged_at)
                    except: continue
                if start_dt <= logged_at <= end_dt:
                    cnt += 1
        return cnt

    total_records = count_logs_in_range(cutoff_current, now)
    prev_records = count_logs_in_range(cutoff_prev, cutoff_current)

    if prev_records > 0:
        records_growth_val = round(((total_records - prev_records) / prev_records) * 100)
        records_growth = f"{'+' if records_growth_val >= 0 else ''}{records_growth_val}%"
    else:
        records_growth = "No comparative data"

    # 1.3 Calculate Churn/Archiving Rate
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

    # 1.4 Generate Monthly Active Users (MAU) over calendar month windows
    # Define calendar month boundaries
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
        # MAU: Count of unique patients with activity logs in this month window
        active_users_in_month = set()
        for p in actual_patients:
            p_id = p["id"]
            
            # Check meals
            has_activity = False
            for m in meal_logs:
                if m.get("user_id") == p_id and m.get("deleted_at") is None:
                    logged_at = m.get("logged_at")
                    if isinstance(logged_at, str):
                        try: logged_at = datetime.fromisoformat(logged_at)
                        except: continue
                    if start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)
                continue

            # Check exercises
            for ex in exercise_logs:
                if ex.get("user_id") == p_id and ex.get("deleted_at") is None and ex.get("status") != "abandoned":
                    logged_at = ex.get("logged_at")
                    if isinstance(logged_at, str):
                        try: logged_at = datetime.fromisoformat(logged_at)
                        except: continue
                    if start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)
                continue

            # Check sleep
            for s in sleep_logs:
                if s.get("user_id") == p_id and s.get("deleted_at") is None:
                    logged_at = s.get("logged_at")
                    if isinstance(logged_at, str):
                        try: logged_at = datetime.fromisoformat(logged_at)
                        except: continue
                    if start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)
                continue

            # Check vitals / symptoms
            for l in daily_health_logs:
                if l.get("user_id") == p_id and l.get("deleted_at") is None:
                    logged_at = l.get("logged_at")
                    if isinstance(logged_at, str):
                        try: logged_at = datetime.fromisoformat(logged_at)
                        except: continue
                    if start_of_month <= logged_at < end_of_month:
                        has_activity = True
                        break
            if has_activity:
                active_users_in_month.add(p_id)

        demographics["monthly_dau"].append({
            "name": start_of_month.strftime("%b"),
            "dau": len(active_users_in_month)
        })

    # 2. Wellness Outcomes (HSS Population Shifts - 100% Authentic)
    wellness_outcomes = []
    for start_of_month, end_of_month in months_boundaries:
        # Determine latest HSS record for EACH patient as of the end of this month
        stable = 0
        moderate = 0
        elevated_risk = 0
        critical = 0
        
        for p in actual_patients:
            p_id = p["id"]
            p_records = []
            for entry in hss_history:
                if entry.get("user_id") != p_id:
                    continue
                dt = entry.get("computed_at")
                if dt and isinstance(dt, str):
                    try: dt = datetime.fromisoformat(dt)
                    except: continue
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

    # 3. Content Usage
    scored_recipes = []
    for r in recipes:
        actual_cooks = sum(1 for m in meal_logs if m.get("recipe_id") == r["id"] and m.get("deleted_at") is None)
        scored_recipes.append({
            "name": r.get("name", "Unknown Recipe"),
            "completions": actual_cooks
        })
    scored_recipes = sorted(scored_recipes, key=lambda x: x["completions"], reverse=True)[:5]
    
    scored_exercises = []
    for ex in exercise_routines:
        actual_sessions = sum(1 for l in exercise_logs if l.get("routine_id") == ex["id"] and l.get("deleted_at") is None and l.get("status") != "abandoned")
        scored_exercises.append({
            "name": ex.get("name", "Unknown Routine"),
            "completions": actual_sessions
        })
    scored_exercises = sorted(scored_exercises, key=lambda x: x["completions"], reverse=True)[:5]

    content_efficacy = {
        "top_recipes": scored_recipes,
        "top_exercises": scored_exercises
    }

    # 4. Symptoms frequency
    symptoms_map = {}
    for l in daily_health_logs:
        if l.get("deleted_at") is None:
            for sym in l.get("symptoms", []):
                symptoms_map[sym] = symptoms_map.get(sym, 0) + 1
    symptoms_frequency = []
    for sym, count in sorted(symptoms_map.items(), key=lambda x: x[1], reverse=True):
        formatted_name = sym.replace("_", " ").title()
        symptoms_frequency.append({"name": formatted_name, "count": count})

    # 5. Content distribution by HSS tier
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

    # 6. Activity Volume over Time
    activity_over_time = []
    for start_of_month, end_of_month in months_boundaries:
        meals_count = sum(1 for m in meal_logs if m.get("deleted_at") is None and start_of_month <= m.get("logged_at") < end_of_month)
        ex_count = sum(1 for e in exercise_logs if e.get("deleted_at") is None and e.get("status") != "abandoned" and start_of_month <= e.get("logged_at") < end_of_month)
        sleep_count = sum(1 for s in sleep_logs if s.get("deleted_at") is None and start_of_month <= s.get("logged_at") < end_of_month)
        
        vitals_count = 0
        symptoms_count = 0
        for l in daily_health_logs:
            if l.get("deleted_at") is None and start_of_month <= l.get("logged_at") < end_of_month:
                vitals_count += 1
                symptoms_count += len(l.get("symptoms", []))
                
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
    staff = [p for p in profiles if p.get("role") in ["medical_expert", "admin", "super_admin"]]
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
    name = payload.get("name")
    email = payload.get("email")
    phone = payload.get("phone")
    role_label = payload.get("role")
    
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if not email or not email.strip() or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not phone or not phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required")
    if role_label not in ["Authorized Medical Expert", "System Admin", "medical_expert", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid staff role")
        
    # Check duplicate email
    for p in profiles:
        if p.get("email") == email:
            raise HTTPException(status_code=409, detail="Duplicate email address")
            
    # Generate staff ID uniquely
    while True:
        staff_id = f"STAFF-{random.randint(1000, 9999)}"
        if not any(p.get("id") == staff_id for p in profiles):
            break
            
    # Generate password hash
    import hashlib
    temp_pass = "TempPass2026!"
    hashed_pwd = hashlib.sha256(temp_pass.encode()).hexdigest()
    
    target_role = "medical_expert" if role_label in ["Authorized Medical Expert", "medical_expert"] else "admin"
    
    new_staff = {
        "id": staff_id,
        "first_name": name.split(" ")[0],
        "last_name": " ".join(name.split(" ")[1:]),
        "phone": phone,
        "email": email,
        "password": hashed_pwd,
        "role": target_role,
        "account_status": "active",
        "created_at": datetime.utcnow()
    }
    profiles.append(new_staff)
    from app.mock_db import save_profiles
    save_profiles()
    
    # Record admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    role_desc = "medical expert" if target_role == "medical_expert" else "admin"
    action_desc = f"Created {role_desc} account"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action=action_desc,
        target_type="staff",
        target_id=staff_id,
        target_name=name
    )
    return {"status": "success", "id": staff_id}

@router.put("/users/{user_id}/status")
def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    user = next((u for u in profiles if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_status = user.get("account_status", "active")
    user_role = user.get("role", "patient")
    
    # Staff account toggle is strictly super_admin
    is_staff = user_role in ["admin", "medical_expert", "super_admin"]
    current_admin_role = current_user.get("role")
    
    if is_staff and current_admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Access Denied: Only Super Admin can manage staff status")
        
    # Safety Check: Self-disable prevention
    if user_id == current_user.get("user_id"):
        raise HTTPException(status_code=400, detail="Self-deactivation is not permitted")
        
    # Safety Check: Protect the last active super_admin
    if user_role == "super_admin" and current_status == "active":
        active_super_admins = [p for p in profiles if p.get("role") == "super_admin" and p.get("account_status") == "active"]
        if len(active_super_admins) <= 1:
            raise HTTPException(status_code=400, detail="Deactivating the last active Super Admin is not permitted")
            
    new_status = "disabled" if current_status == "active" else "active"
    user["account_status"] = new_status
    
    from app.mock_db import save_profiles
    save_profiles()
    
    # Record admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get("email") or user_id
    
    target_type = "user" if user_role == "patient" else "staff"
    
    if user_role == "patient":
        action_desc = f"{'disabled' if new_status == 'disabled' else 'activated'} user account"
    else:
        role_desc = "medical expert" if user_role == "medical_expert" else ("admin" if user_role == "admin" else "super_admin")
        action_desc = f"{'Disabled' if new_status == 'disabled' else 'Enabled'} {role_desc} account"
        
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action=action_desc,
        target_type=target_type,
        target_id=user_id,
        target_name=user_name
    )
    return {"status": "success", "new_status": new_status}

@router.put("/staff/{staff_id}/role")
def change_staff_role(staff_id: str, payload: dict, current_user: dict = Depends(get_current_super_admin)):
    target_user = next((u for u in profiles if u["id"] == staff_id), None)
    if not target_user:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    new_role_label = payload.get("role")
    if new_role_label not in ["Authorized Medical Expert", "System Admin", "medical_expert", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role label")
        
    new_role = "medical_expert" if new_role_label in ["Authorized Medical Expert", "medical_expert"] else "admin"
    
    if target_user.get("role") not in ["admin", "medical_expert"]:
        raise HTTPException(status_code=400, detail="Target user is not a regular staff member")
        
    # Safety Check: Prevent self-demotion
    if staff_id == current_user.get("user_id"):
        raise HTTPException(status_code=400, detail="Self-demotion is not permitted")
        
    old_role = target_user.get("role")
    target_user["role"] = new_role
    
    from app.mock_db import save_profiles
    save_profiles()
    
    # Record admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    user_name = f"{target_user.get('first_name', '')} {target_user.get('last_name', '')}".strip() or target_user.get("email") or staff_id
    action_desc = f"Changed staff role from {old_role} to {new_role}"
    
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action=action_desc,
        target_type="staff",
        target_id=staff_id,
        target_name=user_name
    )
    return {"status": "success", "new_role": new_role}

@router.get("/users/{user_id}/timeline")
def get_user_timeline(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    logs = []
    
    for log in [l for l in daily_health_logs if l.get("user_id") == user_id]:
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
            
    for m in [m for m in meal_logs if m.get("user_id") == user_id]:
        logs.append({
            "type": "Meal",
            "timestamp": m.get("logged_at"),
            "data": {
                "meal_name": m.get("meal_name"),
                "calories": m.get("calories"),
                "sodium_mg": m.get("sodium_mg")
            }
        })
        
    for e in [e for e in exercise_logs if e.get("user_id") == user_id]:
        logs.append({
            "type": "Exercise",
            "timestamp": e.get("logged_at"),
            "data": {
                "routine_name": e.get("routine_name"),
                "duration_minutes": e.get("duration_minutes"),
                "status": e.get("status")
            }
        })
        
    for s in [s for s in sleep_logs if s.get("user_id") == user_id and s.get("deleted_at") is None]:
        logs.append({
            "type": "Sleep",
            "timestamp": s.get("logged_at"),
            "data": {
                "duration_hours": s.get("duration_hours"),
                "quality": s.get("quality")
            }
        })
        
    for h in [h for h in hss_history if h.get("user_id") == user_id]:
        logs.append({
            "type": "HSS",
            "timestamp": h.get("computed_at"),
            "data": {
                "score": h.get("score"),
                "tier": h.get("tier")
            }
        })
        
    def parse_dt(x):
        dt = x.get("timestamp")
        if isinstance(dt, str):
            try: return datetime.fromisoformat(dt)
            except: return datetime.min
        if not dt:
            return datetime.min
        return dt
        
    logs.sort(key=parse_dt, reverse=True)
    return logs



from fastapi import HTTPException

@router.get("/broadcasts", response_model=list)
def get_broadcasts(current_user: dict = Depends(get_current_admin_user)):
    # Sort broadcasts by created_at descending
    return sorted(system_broadcasts, key=lambda x: x.get("created_at", datetime.min), reverse=True)

@router.post("/broadcasts")
def create_broadcast(payload: dict, current_user: dict = Depends(get_current_admin_user)):
    now = datetime.now()
    broadcast_id = f"brd-{int(now.timestamp())}"
    
    # Resolve publisher name
    publisher_name = "Admin"
    admin_id = current_user.get('user_id', 'SYS')
    for u in profiles:
        if u.get('id') == admin_id:
            publisher_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
            break
    
    new_broadcast = {
        "id": broadcast_id,
        "date": now.strftime("%b %d, %Y %I:%M %p"),
        "publisher": f"{admin_id} ({publisher_name})",
        "message": payload.get("message", ""),
        "type": payload.get("type", "System Notification"),
        "target_audience": payload.get("targetAudience", "All Registered Accounts"),
        "created_at": now
    }
    
    system_broadcasts.append(new_broadcast)
    
    # --- Create notification entries for all targeted users ---
    target = payload.get("targetAudience", "All Registered Accounts")
    target_patients = [p for p in profiles if p.get("role") == "patient" and p.get("account_status") == "active"]
    
    for patient in target_patients:
        notif = {
            "id": f"notif-brd-{broadcast_id}-{patient['id']}",
            "user_id": patient["id"],
            "scope": "broadcast",
            "type": "system",
            "broadcast_type": payload.get("type", "System Notification"),
            "broadcast_id": broadcast_id,
            "publisher_id": admin_id,
            "title": payload.get("type", "System Broadcast"),
            "message": payload.get("message", ""),
            "read": False,
            "created_at": now,
        }
        notifications.append(notif)
    
    save_logs()
    
    # Record admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action="published",
        target_type="broadcast",
        target_id=broadcast_id,
        target_name=payload.get("type", "System Notification")
    )
    return {"status": "success", "data": new_broadcast}

@router.delete("/broadcasts/{broadcast_id}")
def delete_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_admin_user)):
    global system_broadcasts
    
    found = False
    broadcast_title = "System Broadcast"
    for i, b in enumerate(system_broadcasts):
        if b.get("id") == broadcast_id:
            broadcast_title = b.get("type", "System Broadcast")
            del system_broadcasts[i]
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    
    # Also remove all notification entries linked to this broadcast
    to_remove = [n for n in notifications if n.get("broadcast_id") == broadcast_id]
    for n in to_remove:
        notifications.remove(n)
    
    save_logs()
    
    # Record admin activity
    admin_id = current_user.get("user_id") if current_user else "admin"
    from app.utils.activity_helper import record_admin_activity
    record_admin_activity(
        admin_user_id=admin_id,
        action="deleted",
        target_type="broadcast",
        target_id=broadcast_id,
        target_name=broadcast_title
    )
    return {"status": "success", "message": "Broadcast deleted"}
