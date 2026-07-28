from datetime import datetime
import app.mock_db as mock_db


def get_full_profile(user_id: str) -> dict:
    profile = next((p for p in mock_db.profiles if p["id"] == user_id), None)
    if not profile:
        return None
        
    lifestyle = next((l for l in mock_db.baseline_lifestyle if l["user_id"] == user_id), None)
    dietary = next((d for d in mock_db.baseline_dietary if d["user_id"] == user_id), None)
    clinical = next((c for c in mock_db.baseline_clinical if c["user_id"] == user_id), None)
    care_team = [c for c in mock_db.care_team_contacts if c["user_id"] == user_id]
    
    return {
        "profile": profile,
        "baselines": {
            "lifestyle": lifestyle,
            "dietary": dietary,
            "clinical": clinical
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
    mock_db.baseline_lifestyle[:] = [l for l in mock_db.baseline_lifestyle if l["user_id"] != user_id]
    mock_db.baseline_dietary[:] = [d for d in mock_db.baseline_dietary if d["user_id"] != user_id]
    mock_db.baseline_clinical[:] = [c for c in mock_db.baseline_clinical if c["user_id"] != user_id]
    mock_db.care_team_contacts[:] = [c for c in mock_db.care_team_contacts if c["user_id"] != user_id]
    
    mock_db.meal_logs[:] = [m for m in mock_db.meal_logs if m["user_id"] != user_id]
    mock_db.exercise_logs[:] = [e for e in mock_db.exercise_logs if e["user_id"] != user_id]
    mock_db.daily_health_logs[:] = [l for l in mock_db.daily_health_logs if l["user_id"] != user_id]
    mock_db.css_history[:] = [c for c in mock_db.css_history if c["user_id"] != user_id]
    
    mock_db.save_profiles()
    mock_db.save_logs()
    
    return True



def upsert_baseline_lifestyle(user_id: str, data: dict) -> dict:
    # Check if one already exists for this user
    for entry in mock_db.baseline_lifestyle:
        if entry["user_id"] == user_id:
            entry["smoking_status"] = data["smoking_status"]
            entry["avg_sleep_hours"] = data["avg_sleep_hours"]
            entry["family_history"] = data["family_history"]
            entry["updated_at"] = datetime.utcnow()
            mock_db.save_profiles()
            return entry

    # Create new
    new_entry = {
        "id": f"life-{len(mock_db.baseline_lifestyle) + 200}",
        "user_id": user_id,
        "smoking_status": data["smoking_status"],
        "avg_sleep_hours": data["avg_sleep_hours"],
        "family_history": data["family_history"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    mock_db.baseline_lifestyle.append(new_entry)
    mock_db.save_profiles()
    return new_entry


def upsert_baseline_dietary(user_id: str, data: dict) -> dict:
    for entry in mock_db.baseline_dietary:
        if entry["user_id"] == user_id:
            entry["sodium_frequency"] = data["sodium_frequency"]
            entry["allergies"] = data["allergies"]
            entry["dietary_practice"] = data["dietary_practice"]
            entry["updated_at"] = datetime.utcnow()
            mock_db.save_profiles()
            return entry

    new_entry = {
        "id": f"diet-{len(mock_db.baseline_dietary) + 200}",
        "user_id": user_id,
        "sodium_frequency": data["sodium_frequency"],
        "allergies": data["allergies"],
        "dietary_practice": data["dietary_practice"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    mock_db.baseline_dietary.append(new_entry)
    mock_db.save_profiles()
    return new_entry


def upsert_baseline_clinical(user_id: str, data: dict) -> dict:
    updated_entry = None
    for entry in mock_db.baseline_clinical:
        if entry["user_id"] == user_id:
            entry["diagnosed_conditions"] = data["diagnosed_conditions"]
            entry["on_medication"] = data["on_medication"]
            entry["resting_bp_mmhg"] = data.get("resting_bp_mmhg")
            entry["max_heart_rate_bpm"] = data.get("max_heart_rate_bpm")
            entry["fasting_blood_sugar"] = data.get("fasting_blood_sugar")
            entry["serum_cholesterol"] = data.get("serum_cholesterol")
            entry["chest_pain_type"] = data.get("chest_pain_type")
            entry["exercise_angina"] = data.get("exercise_angina")
            entry["updated_at"] = datetime.utcnow()
            updated_entry = entry
            break

    if not updated_entry:
        updated_entry = {
            "id": f"clin-{len(mock_db.baseline_clinical) + 200}",
            "user_id": user_id,
            "diagnosed_conditions": data["diagnosed_conditions"],
            "on_medication": data["on_medication"],
            "resting_bp_mmhg": data.get("resting_bp_mmhg"),
            "max_heart_rate_bpm": data.get("max_heart_rate_bpm"),
            "fasting_blood_sugar": data.get("fasting_blood_sugar"),
            "serum_cholesterol": data.get("serum_cholesterol"),
            "chest_pain_type": data.get("chest_pain_type"),
            "exercise_angina": data.get("exercise_angina"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        mock_db.baseline_clinical.append(updated_entry)

    # Auto-create default thresholds if missing
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

    # Mark onboarding as complete (this is the final step)
    for profile in mock_db.profiles:
        if profile["id"] == user_id:
            profile["onboarding_status"] = "complete"
            profile["updated_at"] = datetime.utcnow()
            mock_db.save_profiles()
            break

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
