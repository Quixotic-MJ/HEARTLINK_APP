import sys
import os
import httpx
import json
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    payload = {
        "name": "Jollibee 1pc Chickenjoy (Thigh) with Rice",
        "subtitle": "Jollibee Canada standard Chickenjoy Thigh with 1 cup steamed rice.",
        "category": "Lunch",
        "hss_tier": "Moderate",
        "sodium_mg": 400,
        "calories": 570,
        "saturated_fat_g": 7,
        "cholesterol_mg": 50,
        "fiber_g": 1,
        "prep_time_minutes": 5,
        "servings": 1,
        "difficulty": "Easy",
        "heart_benefit": "Consume in moderation.",
        "tags": ["Fast Food", "Jollibee"],
        "ingredients": [{"name": "Chicken Thigh", "unit": "pc", "amount": 1}, {"name": "Rice", "unit": "cup", "amount": 1}],
        "steps": ["Order at counter."],
        "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=300", 
        "status": "published",
        "expert_validated": True
    }
    
    response = httpx.post(f"{url}/rest/v1/recipes", headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    main()
