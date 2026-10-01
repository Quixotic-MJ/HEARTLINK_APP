import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.db.client import get_supabase_client

def main():
    client = get_supabase_client()
    
    fast_foods = [
        {
            "name": "Jollibee 1pc Chickenjoy (Thigh) with Rice",
            "subtitle": "Jollibee Canada standard Chickenjoy Thigh with 1 cup steamed rice. (31g Protein, 49g Carbs)",
            "category": "Fast Food",
            "hss_tier": "Moderate",
            "calories": 570,
            "sodium_mg": 400,
            "saturated_fat_g": 7,
            "fiber_g": 1,
            "ingredients": ["Chicken", "Rice", "Breading"],
            "steps": ["Order at counter."],
            "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=300", 
            "prep_time_minutes": 5,
            "status": "published",
            "expert_validated": True
        }
    ]

    try:
        res = client.table("recipes").insert(fast_foods[0]).execute()
        print(f"Success: {res}")
    except Exception as e:
        print(f"Exception inserting directly: {e}")

if __name__ == "__main__":
    main()
