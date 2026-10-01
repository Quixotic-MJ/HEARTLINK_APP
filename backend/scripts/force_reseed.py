import sys
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

from app.db.client import get_supabase_client
from app.db.bootstrap import _load_seed_content

def force_reseed():
    sb = get_supabase_client()
    if not sb:
        logger.error("Could not connect to Supabase!")
        return

    seed_data = _load_seed_content()
    
    logger.info("Deleting all existing exercise routines...")
    # This will delete all rows
    try:
        sb.table("exercise_routines").delete().neq("legacy_id", "0").execute()
    except Exception as e:
        logger.warning(f"Error deleting (might be empty already): {e}")

    logger.info("Seeding new highly detailed exercise routines into Supabase...")
    routines_to_seed = []
    for r in seed_data.get("exercise_routines", []):
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
            "requirements": r.get("requirements") or [],
            "calories": r.get("calories") or 0,
            "status": r.get("status") or "published",
            "expert_validated": r.get("expert_validated", True)
        })
    
    if routines_to_seed:
        res = sb.table("exercise_routines").insert(routines_to_seed).execute()
        logger.info(f"Successfully seeded {len(res.data)} exercise routines with requirements and calories!")

if __name__ == "__main__":
    print("Starting forceful wipe and reseed process...")
    force_reseed()
    print("Process complete!")
