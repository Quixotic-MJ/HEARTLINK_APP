# backend/app/db/bootstrap.py
"""
Automatic content bootstrap for Supabase persistence layer.
Ensures exercise_routines, recipes, and clinics tables are seeded if empty.
Reads default catalogs from seed_content.json without mock_db dependencies.
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from app.db.client import get_supabase_client

logger = logging.getLogger(__name__)

def _load_seed_content() -> Dict[str, Any]:
    """Loads seed data from seed_content.json."""
    seed_path = Path(__file__).resolve().parent / "seed_content.json"
    if seed_path.exists():
        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read {seed_path}: {e}")
    return {"exercise_routines": [], "recipes": [], "clinics": []}

def bootstrap_supabase_content():
    """Seeds global content into Supabase tables if they are empty."""
    sb = get_supabase_client()
    if not sb:
        return

    seed_data = _load_seed_content()

    # 1. Seed Exercise Routines
    try:
        res = sb.table("exercise_routines").select("id").limit(1).execute()
        if not res.data:
            logger.info("Seeding exercise_routines into Supabase...")
            routines_to_seed = []
            for r in seed_data.get("exercise_routines", []):
                # Map intensity and tier to valid check constraint values
                tier = r.get("hss_tier") or "Stable"
                if tier not in ['Stable', 'Moderate', 'Elevated Risk', 'Critical']:
                    tier = "Stable"
                intensity = r.get("intensity") or "Low"
                if intensity not in ['None', 'Low', 'Moderate', 'High']:
                    intensity = "Moderate"

                routines_to_seed.append({
                    "legacy_id": r.get("id"),
                    "name": r.get("name") or r.get("title") or "Exercise Routine",
                    "description": r.get("description") or "",
                    "duration_minutes": max(1, int(r.get("duration") or r.get("duration_minutes") or 15)),
                    "hss_tier": tier,
                    "type": r.get("type") or "Cardio",
                    "intensity": intensity,
                    "goal": r.get("goal") or "Cardiovascular Health",
                    "steps": r.get("steps") or [],
                    "media_url": r.get("image_url") or r.get("media_url") or "",
                    "video_url": r.get("video_url") or "",
                    "guide_images": r.get("guide_images") or [],
                    "status": r.get("status") or "published",
                    "expert_validated": r.get("expert_validated", True)
                })
            if routines_to_seed:
                sb.table("exercise_routines").insert(routines_to_seed).execute()
                logger.info(f"Successfully seeded {len(routines_to_seed)} exercise routines.")
    except Exception as e:
        logger.warning(f"Failed to bootstrap exercise_routines: {e}")

    # 2. Seed Recipes
    try:
        res = sb.table("recipes").select("id").limit(1).execute()
        if not res.data:
            logger.info("Seeding recipes into Supabase...")
            recipes_to_seed = []
            for rec in seed_data.get("recipes", []):
                category = rec.get("category") or "Lunch"
                if category not in ['Breakfast', 'Lunch', 'Dinner', 'Snack']:
                    category = "Lunch"
                tier = rec.get("hss_tier") or "Stable"
                if tier not in ['Stable', 'Moderate', 'Elevated Risk', 'Critical']:
                    tier = "Stable"
                difficulty = rec.get("difficulty") or "Easy"
                if difficulty not in ['Easy', 'Medium', 'Hard']:
                    difficulty = "Easy"

                # Steps
                steps_val = rec.get("steps")
                if not steps_val:
                    inst = rec.get("instructions") or ""
                    steps_val = [s.strip() for s in inst.split("\n") if s.strip()] if isinstance(inst, str) else []

                # Ingredients JSON
                ing_list = rec.get("ingredients") or []
                formatted_ings = []
                for ing in ing_list:
                    if isinstance(ing, dict):
                        formatted_ings.append(ing)
                    else:
                        formatted_ings.append({"name": str(ing), "amount": None, "unit": None})

                recipes_to_seed.append({
                    "legacy_id": rec.get("id"),
                    "name": rec.get("name") or "Heart-Healthy Recipe",
                    "subtitle": rec.get("subtitle") or "",
                    "category": category,
                    "hss_tier": tier,
                    "sodium_mg": float(rec.get("sodium_mg") or rec.get("sodium") or 0),
                    "calories": float(rec.get("calories") or 0),
                    "saturated_fat_g": float(rec.get("saturated_fat_g") or rec.get("satFat") or 0),
                    "cholesterol_mg": float(rec.get("cholesterol_mg") or rec.get("cholesterol") or 0),
                    "fiber_g": float(rec.get("fiber_g") or rec.get("fiber") or 0),
                    "prep_time_minutes": int(rec.get("prep_time_minutes") or 15),
                    "servings": max(1, int(rec.get("servings") or 1)),
                    "difficulty": difficulty,
                    "heart_benefit": rec.get("heart_benefit") or "Low sodium, heart healthy",
                    "tags": rec.get("tags") or ["heart-healthy"],
                    "ingredients": formatted_ings,
                    "steps": steps_val,
                    "image_url": rec.get("image_url") or rec.get("mediaUrl") or "",
                    "status": rec.get("status") or "published",
                    "expert_validated": rec.get("expert_validated", True)
                })
            if recipes_to_seed:
                sb.table("recipes").insert(recipes_to_seed).execute()
                logger.info(f"Successfully seeded {len(recipes_to_seed)} recipes.")
    except Exception as e:
        logger.warning(f"Failed to bootstrap recipes: {e}")

    # 3. Seed Clinics
    try:
        res = sb.table("clinics").select("id").limit(1).execute()
        if not res.data:
            logger.info("Seeding clinics into Supabase...")
            clinics_to_seed = []
            for c in seed_data.get("clinics", []):
                clinics_to_seed.append({
                    "legacy_id": str(c.get("id")),
                    "name": c.get("name") or "Cardiology Clinic",
                    "doctor": c.get("doctor") or "Dr. Specialist",
                    "latitude": float(c.get("latitude") or 10.3157),
                    "longitude": float(c.get("longitude") or 123.8854),
                    "phone": c.get("phone") or "0917-000-0000",
                    "specialty": c.get("specialty") or "General Cardiology"
                })
            if clinics_to_seed:
                sb.table("clinics").insert(clinics_to_seed).execute()
                logger.info(f"Successfully seeded {len(clinics_to_seed)} clinics.")
    except Exception as e:
        logger.warning(f"Failed to bootstrap clinics: {e}")
