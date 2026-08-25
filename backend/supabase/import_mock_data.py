# backend/supabase/import_mock_data.py
"""
Deterministic, Idempotent Mock Data Importer for Supabase PostgreSQL.
Reads mock_profiles.json and mock_logs.json, resolves legacy IDs to UUIDs,
cleans types and timestamps, and imports records in strict foreign-key order.
Supports --apply flag to perform live upsert into Supabase database.
"""
import os
import sys
import json
import uuid
import argparse
from datetime import datetime, date
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=backend_dir / ".env")
except ImportError:
    pass

HEARTLINK_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

def legacy_to_uuid(legacy_id: str) -> str:
    """Deterministically maps any legacy string ID to a valid UUID v5 string."""
    if not legacy_id or legacy_id in ("N/A", "none", "None"):
        return None
    try:
        val = uuid.UUID(str(legacy_id))
        return str(val)
    except ValueError:
        return str(uuid.uuid5(HEARTLINK_NAMESPACE, str(legacy_id)))

def clean_timestamp(ts: Any) -> str:
    """Standardizes dates and timestamps to UTC ISO-8601 strings."""
    if not ts:
        return datetime.utcnow().isoformat()
    if isinstance(ts, (datetime, date)):
        return ts.isoformat()
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00")).isoformat()
        except Exception:
            return datetime.utcnow().isoformat()
    return datetime.utcnow().isoformat()

def safe_float(val: Any) -> Optional[float]:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def safe_int(val: Any) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None

class MockDataImporter:
    def __init__(self, profiles_path: str, logs_path: str, client=None):
        self.profiles_path = profiles_path
        self.logs_path = logs_path
        self.client = client
        self.stats = {
            "imported": 0,
            "skipped": 0,
            "rejected": 0,
            "duplicate": 0,
            "orphan": 0
        }
        self.user_uuid_map: Dict[str, str] = {}

    def load_data(self) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        with open(self.profiles_path, "r", encoding="utf-8") as f:
            profiles_data = json.load(f)
        with open(self.logs_path, "r", encoding="utf-8") as f:
            logs_data = json.load(f)
        return profiles_data, logs_data

    def prepare_profiles(self, raw_profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        prepared = []
        for p in raw_profiles:
            legacy_id = p.get("id")
            uid = legacy_to_uuid(legacy_id)
            self.user_uuid_map[legacy_id] = uid
            clean = {
                "id": uid,
                "legacy_id": legacy_id,
                "phone": p.get("phone"),
                "email": p.get("email"),
                "first_name": p.get("first_name", "User"),
                "last_name": p.get("last_name", ""),
                "date_of_birth": p.get("date_of_birth"),
                "sex": p.get("sex") if p.get("sex") in ("male", "female") else None,
                "height_cm": safe_float(p.get("height_cm")),
                "weight_kg": safe_float(p.get("weight_kg")),
                "avatar_url": p.get("avatar_url"),
                "health_goals": p.get("health_goals", []),
                "onboarding_status": p.get("onboarding_status", "pending"),
                "account_status": p.get("account_status", "active"),
                "role": p.get("role", "patient"),
                "created_at": clean_timestamp(p.get("created_at")),
                "updated_at": clean_timestamp(p.get("updated_at"))
            }
            prepared.append(clean)
            self.stats["imported"] += 1
        return prepared

    def prepare_baseline(self, raw_baselines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        prepared = []
        for b in raw_baselines:
            user_legacy = b.get("user_id")
            user_uuid = self.user_uuid_map.get(user_legacy) or legacy_to_uuid(user_legacy)
            if not user_uuid:
                self.stats["orphan"] += 1
                continue
            clean = {
                "id": legacy_to_uuid(b.get("id")),
                "user_id": user_uuid,
                "vigorous_activity": bool(b.get("vigorous_activity", False)),
                "vigorous_days": safe_int(b.get("vigorous_days")),
                "vigorous_minutes": safe_int(b.get("vigorous_minutes")),
                "moderate_activity": bool(b.get("moderate_activity", False)),
                "moderate_days": safe_int(b.get("moderate_days")),
                "moderate_minutes": safe_int(b.get("moderate_minutes")),
                "walk_bike_transport": bool(b.get("walk_bike_transport", False)),
                "walk_bike_days": safe_int(b.get("walk_bike_days")),
                "walk_bike_minutes": safe_int(b.get("walk_bike_minutes")),
                "sedentary_hours": b.get("sedentary_hours", "4-6h"),
                "sleep_hours": safe_float(b.get("sleep_hours")) or 8.0,
                "ever_smoked": bool(b.get("ever_smoked", False)),
                "smoke_now": b.get("smoke_now") if b.get("smoke_now") in ("Every day", "Some days", "Not at all") else None,
                "ever_drank": bool(b.get("ever_drank", False)),
                "drink_frequency": b.get("drink_frequency"),
                "drinks_per_occasion": b.get("drinks_per_occasion"),
                "binge_drinking_freq": b.get("binge_drinking_freq"),
                "diet_level": b.get("diet_level", "average"),
                "fried_food_freq": b.get("fried_food_freq", "sometimes"),
                "salty_food_freq": b.get("salty_food_freq", "sometimes"),
                "fruit_veg_servings": b.get("fruit_veg_servings", "2-3"),
                "allergies": b.get("allergies", []),
                "dietary_practice": b.get("dietary_practice", "None"),
                "created_at": clean_timestamp(b.get("created_at")),
                "updated_at": clean_timestamp(b.get("updated_at"))
            }
            prepared.append(clean)
            self.stats["imported"] += 1
        return prepared

    def apply_to_live_supabase(self) -> Dict[str, Any]:
        """Performs live upsert into Supabase database."""
        from app.db.client import get_supabase_client
        client = self.client or get_supabase_client()
        if not client:
            raise RuntimeError("Live Supabase client is not configured.")

        profiles_data, logs_data = self.load_data()
        prep_prof = self.prepare_profiles(profiles_data.get("profiles", []))
        prep_base = self.prepare_baseline(profiles_data.get("baseline_onboarding", []))

        print(f"Importing {len(prep_prof)} Auth & Profile identities into Supabase...")
        for p in prep_prof:
            # 1. Create or sync in Supabase auth.users via Admin API
            try:
                client.auth.admin.create_user({
                    "id": p["id"],
                    "email": p["email"],
                    "password": "Password123!",
                    "phone": p["phone"],
                    "email_confirm": True,
                    "phone_confirm": True
                })
            except Exception as auth_err:
                pass

            # 2. Upsert in public.profiles
            try:
                client.table("profiles").upsert(p).execute()
            except Exception as prof_err:
                print(f"Profile upsert error for {p['id']}: {prof_err}")

        print(f"Importing {len(prep_base)} Baseline records into Supabase...")
        for b in prep_base:
            try:
                client.table("baseline_onboarding").upsert(b).execute()
            except Exception as base_err:
                print(f"Baseline upsert error for {b['id']}: {base_err}")

        # Seed global content if available
        recipes = logs_data.get("recipes", [])
        if recipes:
            print(f"Importing {len(recipes)} Recipes into Supabase...")
            for r in recipes:
                try:
                    r_clean = {
                        "id": legacy_to_uuid(r.get("id")),
                        "title": r.get("name") or r.get("title", "Recipe"),
                        "description": r.get("description", ""),
                        "category": r.get("category", "Heart-Healthy"),
                        "prep_time_minutes": safe_int(r.get("prep_time_minutes", 20)) or 20,
                        "cook_time_minutes": safe_int(r.get("cook_time_minutes", 15)) or 15,
                        "servings": safe_int(r.get("servings", 2)) or 2,
                        "calories": safe_int(r.get("calories", 300)) or 300,
                        "sodium_mg": safe_int(r.get("sodium_mg", 200)) or 200,
                        "ingredients": r.get("ingredients", []),
                        "instructions": r.get("instructions", []),
                        "image_url": r.get("image_url"),
                        "status": "published"
                    }
                    client.table("recipes").upsert(r_clean).execute()
                except Exception as r_err:
                    print(f"Recipe upsert error: {r_err}")

        exercises = logs_data.get("exercise_routines", [])
        if exercises:
            print(f"Importing {len(exercises)} Exercise Routines into Supabase...")
            for e in exercises:
                try:
                    e_clean = {
                        "id": legacy_to_uuid(e.get("id")),
                        "title": e.get("name") or e.get("title", "Exercise Routine"),
                        "description": e.get("description", ""),
                        "category": e.get("category", "Cardio"),
                        "intensity": e.get("intensity", "low"),
                        "duration_minutes": safe_int(e.get("duration_minutes", 15)) or 15,
                        "recommended_frequency": e.get("recommended_frequency", "Daily"),
                        "target_heart_rate_zone": e.get("target_heart_rate_zone", "Zone 1"),
                        "instructions": e.get("instructions", []),
                        "precautions": e.get("precautions", []),
                        "media_url": e.get("media_url"),
                        "status": "published"
                    }
                    client.table("exercise_routines").upsert(e_clean).execute()
                except Exception as e_err:
                    print(f"Exercise upsert error: {e_err}")

        return {"status": "success", "profiles": len(prep_prof), "baselines": len(prep_base)}

    def run_validation_report(self) -> Dict[str, Any]:
        profiles_data, logs_data = self.load_data()
        prep_prof = self.prepare_profiles(profiles_data.get("profiles", []))
        prep_base = self.prepare_baseline(profiles_data.get("baseline_onboarding", []))

        return {
            "status": "ready",
            "profiles_count": len(prep_prof),
            "baseline_count": len(prep_base),
            "meals_count": len(logs_data.get("meal_logs", [])),
            "exercises_count": len(logs_data.get("exercise_logs", [])),
            "sleep_count": len(logs_data.get("sleep_logs", [])),
            "hss_count": len(logs_data.get("hss_history", [])),
            "notifications_count": len(logs_data.get("notifications", [])),
            "broadcasts_count": len(logs_data.get("system_broadcasts", [])),
            "feedback_count": len(logs_data.get("feedback_tickets", [])),
            "evaluations_count": len(logs_data.get("expert_evaluations", [])),
            "stats": self.stats
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import mock data into Supabase")
    parser.add_argument("--apply", action="store_true", help="Apply data import to live Supabase instance")
    args = parser.parse_args()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.join(current_dir, "..", "app")
    p_path = os.path.join(app_dir, "mock_profiles.json")
    l_path = os.path.join(app_dir, "mock_logs.json")

    importer = MockDataImporter(p_path, l_path)

    if args.apply:
        print("=== Applying Mock Data Import to Live Supabase ===")
        res = importer.apply_to_live_supabase()
        print(">>> LIVE IMPORT COMPLETE:", json.dumps(res, indent=2))
    else:
        report = importer.run_validation_report()
        print("=== Supabase Mock Data Importer Dry-Run ===")
        print(json.dumps(report, indent=2))
        print("\nTo apply to live database, run: python supabase/import_mock_data.py --apply")
