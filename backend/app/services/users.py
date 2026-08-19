from datetime import datetime
import app.mock_db as mock_db


from app.services.clinical import get_clinical_baseline_data

def get_full_profile(user_id: str) -> dict:
    profile = next((p for p in mock_db.profiles if p["id"] == user_id), None)
    if not profile:
        return None
        
    onboarding = next((o for o in mock_db.baseline_onboarding if o["user_id"] == user_id), None)
    care_team = [c for c in mock_db.care_team_contacts if c["user_id"] == user_id]
    
    lifestyle = None
    dietary = None
    if onboarding:
        smoking_status = onboarding.get("smoke_now") or ("Every day" if onboarding.get("ever_smoked") else "Not at all")
        raw_sleep = onboarding.get("sleep_hours")
        sleep_hours_val = None
        if raw_sleep is not None:
            try:
                sleep_hours_val = float(raw_sleep)
            except (ValueError, TypeError):
                sleep_hours_val = 8.0
                
        lifestyle = {
            "smoking_status": smoking_status,
            "avg_sleep_hours": sleep_hours_val,
        }
        dietary = {
            "dietary_practice": onboarding.get("dietary_practice", "None"),
            "sodium_frequency": onboarding.get("salty_food_freq", "sometimes"),
            "allergies": onboarding.get("allergies", [])
        }
    
    return {
        "profile": profile,
        "baselines": {
            "onboarding": onboarding,
            "clinical": get_clinical_baseline_data(user_id),
            "lifestyle": lifestyle,
            "dietary": dietary
        },
        "care_team": care_team
    }

def update_profile(user_id: str, data: dict) -> dict:
    for profile in mock_db.profiles:
        if profile["id"] == user_id:
            profile["first_name"] = data.get("first_name", "")
            profile["last_name"] = data.get("last_name") or ""
            profile["date_of_birth"] = data["date_of_birth"]
            profile["sex"] = data["sex"]
            profile["height_cm"] = data["height_cm"]
            profile["weight_kg"] = data["weight_kg"]
            profile["health_goals"] = data["health_goals"]
            profile["updated_at"] = datetime.utcnow()
            return profile
    return None


def delete_user(user_id: str) -> bool:
    # Check if user exists first
    profile_exists = any(p["id"] == user_id for p in mock_db.profiles)
    if not profile_exists:
        return False
        
    # Hard delete from all mock_db collections
    mock_db.profiles[:] = [p for p in mock_db.profiles if p["id"] != user_id]
    if hasattr(mock_db, 'baseline_onboarding'):
        mock_db.baseline_onboarding[:] = [o for o in mock_db.baseline_onboarding if o["user_id"] != user_id]
    mock_db.care_team_contacts[:] = [c for c in mock_db.care_team_contacts if c["user_id"] != user_id]
    
    mock_db.meal_logs[:] = [m for m in mock_db.meal_logs if m["user_id"] != user_id]
    mock_db.exercise_logs[:] = [e for e in mock_db.exercise_logs if e["user_id"] != user_id]
    mock_db.daily_health_logs[:] = [l for l in mock_db.daily_health_logs if l["user_id"] != user_id]
    mock_db.hss_history[:] = [c for c in mock_db.hss_history if c["user_id"] != user_id]
    
    mock_db.save_profiles()
    mock_db.save_logs()
    
    return True



def save_baseline_onboarding(user_id: str, data: dict, profile_data: dict) -> dict:
    # 1. Update basic profile info first (name, DOB, sex)
    for profile in mock_db.profiles:
        if profile["id"] == user_id:
            if "first_name" in profile_data:
                profile["first_name"] = profile_data["first_name"]
            if "last_name" in profile_data:
                profile["last_name"] = profile_data["last_name"]
            if "date_of_birth" in profile_data:
                profile["date_of_birth"] = profile_data["date_of_birth"]
            if "sex" in profile_data:
                profile["sex"] = profile_data["sex"]
            if "height_cm" in profile_data:
                profile["height_cm"] = profile_data["height_cm"]
            if "weight_kg" in profile_data:
                profile["weight_kg"] = profile_data["weight_kg"]
            if "health_goals" in profile_data:
                profile["health_goals"] = profile_data["health_goals"]
            profile["onboarding_status"] = "complete"
            profile["updated_at"] = datetime.utcnow()
            mock_db.save_profiles()
            break

    # 2. Save detailed onboarding responses
    updated_entry = None
    for entry in getattr(mock_db, 'baseline_onboarding', []):
        if entry["user_id"] == user_id:
            entry.update(data)
            entry["updated_at"] = datetime.utcnow()
            updated_entry = entry
            break

    if not updated_entry:
        updated_entry = {
            "id": f"onb-{len(getattr(mock_db, 'baseline_onboarding', [])) + 200}",
            "user_id": user_id,
            **data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        if hasattr(mock_db, 'baseline_onboarding'):
            mock_db.baseline_onboarding.append(updated_entry)

    # 3. Auto-create default thresholds if missing
    if not any(t["user_id"] == user_id for t in mock_db.user_thresholds):
        mock_db.user_thresholds.append({
            "id": f"thresh-{len(mock_db.user_thresholds) + 200}",
            "user_id": user_id,
            "sodium_limit_mg": 1500,
            "active_minutes_goal": 30,
            "systolic_threshold": 120,
            "diastolic_threshold": 80,
            "updated_at": datetime.utcnow()
        })
        
    mock_db.save_profiles()
    return updated_entry


def change_password(user_id: str, current_pwd: str, new_pwd: str) -> bool:
    import hashlib
    hashed_current = hashlib.sha256(current_pwd.encode()).hexdigest()
    hashed_new = hashlib.sha256(new_pwd.encode()).hexdigest()

    for profile in mock_db.profiles:
        if profile["id"] == user_id:
            if profile.get("password") == hashed_current:
                profile["password"] = hashed_new
                profile["updated_at"] = datetime.utcnow()
                mock_db.save_profiles()
                return True
            else:
                return False
    return False

def get_reminders(user_id: str) -> dict:
    for r in mock_db.user_reminders:
        if r["user_id"] == user_id:
            return r
    
    default = {
        "user_id": user_id,
        "morning": {"enabled": True, "time": "08:00"},
        "evening": {"enabled": False, "time": "20:00"},
        "activity": {"enabled": False, "time": "17:00"}
    }
    mock_db.user_reminders.append(default)
    return default

def update_reminders(user_id: str, data: dict) -> dict:
    for r in mock_db.user_reminders:
        if r["user_id"] == user_id:
            r["morning"] = data["morning"]
            r["evening"] = data["evening"]
            r["activity"] = data["activity"]
            return r
    
    new_r = {
        "user_id": user_id,
        "morning": data["morning"],
        "evening": data["evening"],
        "activity": data["activity"]
    }
    mock_db.user_reminders.append(new_r)
    return new_r

def add_care_team_contact(user_id: str, data: dict) -> dict:
    import uuid
    new_contact = {
        "id": f"team-contacts-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "contact_type": data.get("contact_type", "emergency"),
        "name": data.get("name", ""),
        "role_title": data.get("role_title", ""),
        "phone": data.get("phone", ""),
        "created_at": datetime.utcnow(),
    }
    mock_db.care_team_contacts.append(new_contact)
    return new_contact

def update_care_team_contact(user_id: str, contact_id: str, data: dict) -> dict:
    for contact in mock_db.care_team_contacts:
        if contact["id"] == contact_id and contact["user_id"] == user_id:
            contact["name"] = data.get("name", contact["name"])
            contact["role_title"] = data.get("role_title", contact["role_title"])
            contact["contact_type"] = data.get("contact_type", contact["contact_type"])
            contact["phone"] = data.get("phone", contact["phone"])
            return contact
    return None

def delete_care_team_contact(user_id: str, contact_id: str) -> bool:
    initial_length = len(mock_db.care_team_contacts)
    mock_db.care_team_contacts[:] = [
        c for c in mock_db.care_team_contacts 
        if not (c["id"] == contact_id and c["user_id"] == user_id)
    ]
    return len(mock_db.care_team_contacts) < initial_length
