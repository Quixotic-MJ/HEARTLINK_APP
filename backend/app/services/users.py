from datetime import datetime
from app.core.supabase import get_supabase_admin
import logging

logger = logging.getLogger(__name__)

async def upsert_profile(user_id: str, data: dict) -> dict:
    supabase = get_supabase_admin()
    
    # We update the existing profile that was created during registration
    # First, let's fetch it to ensure it exists
    res = supabase.table("profiles").select("id").eq("id", user_id).execute()
    if not res.data:
        raise Exception("Profile not found")

    update_data = {
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "date_of_birth": data["date_of_birth"].isoformat(),
        "sex": data["sex"],
        "height_cm": data["height_cm"],
        "weight_kg": data["weight_kg"],
        "health_goals": data["health_goals"],
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    return result.data[0] if result.data else {}

async def upsert_baseline_lifestyle(user_id: str, data: dict) -> dict:
    supabase = get_supabase_admin()
    
    insert_data = {
        "user_id": user_id,
        "smoking_status": data["smoking_status"],
        "avg_sleep_hours": data["avg_sleep_hours"],
        "family_history": data["family_history"],
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Upsert based on user_id (needs unique constraint or we delete first)
    # Supabase upsert by default checks the PK. baseline_lifestyle has id as PK.
    # To upsert safely, we can delete the existing one or just use standard insert if we rely on a trigger, 
    # but let's check if it exists first.
    existing = supabase.table("baseline_lifestyle").select("id").eq("user_id", user_id).execute()
    
    if existing.data:
        insert_data["id"] = existing.data[0]["id"]
        result = supabase.table("baseline_lifestyle").update(insert_data).eq("id", insert_data["id"]).execute()
    else:
        result = supabase.table("baseline_lifestyle").insert(insert_data).execute()
        
    return result.data[0] if result.data else {}

async def upsert_baseline_dietary(user_id: str, data: dict) -> dict:
    supabase = get_supabase_admin()
    
    insert_data = {
        "user_id": user_id,
        "sodium_frequency": data["sodium_frequency"],
        "allergies": data["allergies"],
        "dietary_practice": data["dietary_practice"],
        "updated_at": datetime.utcnow().isoformat()
    }
    
    existing = supabase.table("baseline_dietary").select("id").eq("user_id", user_id).execute()
    if existing.data:
        insert_data["id"] = existing.data[0]["id"]
        result = supabase.table("baseline_dietary").update(insert_data).eq("id", insert_data["id"]).execute()
    else:
        result = supabase.table("baseline_dietary").insert(insert_data).execute()
        
    return result.data[0] if result.data else {}

async def upsert_baseline_clinical(user_id: str, data: dict) -> dict:
    supabase = get_supabase_admin()
    
    insert_data = {
        "user_id": user_id,
        "diagnosed_conditions": data["diagnosed_conditions"],
        "on_medication": data["on_medication"],
        "resting_bp_mmhg": data.get("resting_bp_mmhg"),
        "max_heart_rate_bpm": data.get("max_heart_rate_bpm"),
        "fasting_blood_sugar": data.get("fasting_blood_sugar"),
        "serum_cholesterol": data.get("serum_cholesterol"),
        "chest_pain_type": data.get("chest_pain_type"),
        "exercise_angina": data.get("exercise_angina"),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    existing = supabase.table("baseline_clinical").select("id").eq("user_id", user_id).execute()
    if existing.data:
        insert_data["id"] = existing.data[0]["id"]
        result = supabase.table("baseline_clinical").update(insert_data).eq("id", insert_data["id"]).execute()
    else:
        result = supabase.table("baseline_clinical").insert(insert_data).execute()
        
    # Mark profile onboarding as complete
    supabase.table("profiles").update({
        "onboarding_status": "complete",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", user_id).execute()
    
    return result.data[0] if result.data else {}
