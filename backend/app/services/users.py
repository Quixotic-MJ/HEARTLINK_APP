from datetime import datetime
import hashlib
from app.services.clinical import get_clinical_baseline_data
from app.services.auth_service import get_auth_service
from app.services.storage_service import get_storage_service
from app.db.repositories import get_profile_repo, get_baseline_repo


def get_full_profile(user_id: str) -> dict:
    profile_repo = get_profile_repo()
    profile = profile_repo.get_by_id(user_id)
    if not profile:
        return None

    baseline_repo = get_baseline_repo()
    onboarding = baseline_repo.get_baseline(user_id)
    care_team = baseline_repo.list_care_team(user_id)

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

    # Strip sensitive fields from profile object
    clean_profile = {
        k: v for k, v in profile.items() 
        if k not in ["password", "password_hash", "token", "secret", "service_role_key"]
    }

    return {
        "profile": clean_profile,
        "baselines": {
            "onboarding": onboarding,
            "clinical": get_clinical_baseline_data(user_id),
            "lifestyle": lifestyle,
            "dietary": dietary
        },
        "care_team": care_team
    }


def update_profile(user_id: str, data: dict) -> dict:
    profile_repo = get_profile_repo()
    update_data = {
        "first_name": data.get("first_name", ""),
        "last_name": data.get("last_name") or "",
        "date_of_birth": data.get("date_of_birth"),
        "sex": data.get("sex"),
        "height_cm": data.get("height_cm"),
        "weight_kg": data.get("weight_kg"),
        "health_goals": data.get("health_goals", [])
    }
    res = profile_repo.update(user_id, update_data)
    if not res:
        return None

    return {
        k: v for k, v in res.items()
        if k not in ["password", "password_hash", "token", "secret", "service_role_key"]
    }


def delete_user(user_id: str, password: str = None) -> bool:
    # 1. Verify credentials if password is provided
    if password is not None:
        auth_svc = get_auth_service()
        if not auth_svc.verify_credentials(user_id, password):
            return False

    # 2. Delete Supabase Auth / Identity
    get_auth_service().delete_user_identity(user_id)

    # 3. Clean up user assets from storage
    get_storage_service().delete_user_assets(user_id)

    # 4. Hard delete profile via repository (cascades related tables)
    profile_repo = get_profile_repo()
    profile_repo.delete(user_id)

    return True


def save_baseline_onboarding(user_id: str, data: dict, profile_data: dict) -> dict:
    profile_repo = get_profile_repo()
    baseline_repo = get_baseline_repo()

    # 1. Update basic profile info first (name, DOB, sex, onboarding_status = complete)
    prof_update = {**profile_data, "onboarding_status": "complete"}
    profile_repo.update(user_id, prof_update)

    # 2. Save detailed onboarding responses
    saved_onb = baseline_repo.save_baseline(user_id, data)

    # 3. Auto-create default thresholds if missing
    existing_thresh = baseline_repo.get_thresholds(user_id)
    if not existing_thresh:
        baseline_repo.update_thresholds(user_id, {
            "sodium_limit_mg": 1500,
            "active_minutes_goal": 30,
            "systolic_threshold": 120,
            "diastolic_threshold": 80
        })

    return saved_onb


def change_password(user_id: str, current_pwd: str, new_pwd: str) -> bool:
    auth_svc = get_auth_service()
    return auth_svc.change_password(user_id, current_pwd, new_pwd)


def get_reminders(user_id: str) -> dict:
    return get_baseline_repo().get_reminders(user_id)


def update_reminders(user_id: str, data: dict) -> dict:
    return get_baseline_repo().update_reminders(user_id, data)


def add_care_team_contact(user_id: str, data: dict) -> dict:
    return get_baseline_repo().add_care_team_contact(user_id, data)


def update_care_team_contact(user_id: str, contact_id: str, data: dict) -> dict:
    return get_baseline_repo().update_care_team_contact(user_id, contact_id, data)


def delete_care_team_contact(user_id: str, contact_id: str) -> bool:
    return get_baseline_repo().delete_care_team_contact(user_id, contact_id)
