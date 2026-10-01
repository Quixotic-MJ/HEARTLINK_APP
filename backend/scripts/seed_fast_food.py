import sys
import os
import httpx
import json
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def get_hss_tier(sodium, cal, sat_fat):
    if sodium >= 1000 or (cal > 0 and (sodium / cal) >= 1.5) or sat_fat >= 10:
        return "Critical"
    elif sodium >= 600 or (cal > 0 and (sodium / cal) >= 1.2) or sat_fat >= 5:
        return "Elevated Risk"
    elif sodium >= 400 or (cal > 0 and (sodium / cal) >= 1.0) or sat_fat >= 3:
        return "Moderate"
    else:
        return "Stable"

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    fast_foods = [
        # Skipping Chickenjoy as it was inserted by test_httpx.py
        {
            "name": "Jollibee Yum Burger",
            "subtitle": "Jollibee Canada Yum Burger. (13g Protein, 30g Carbs)",
            "category": "Lunch",
            "calories": 360,
            "sodium_mg": 630,
            "saturated_fat_g": 8,
            "cholesterol_mg": 30,
            "fiber_g": 1,
            "prep_time_minutes": 5,
            "servings": 1,
            "difficulty": "Easy",
            "heart_benefit": "A classic burger, high in sodium.",
            "tags": ["Fast Food", "Jollibee", "Burger"],
            "ingredients": [{"name": "Beef Patty", "unit": "pc", "amount": 1}, {"name": "Bun", "unit": "pc", "amount": 1}],
            "steps": ["Order at counter."],
            "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300", 
            "status": "published",
            "expert_validated": True
        },
        {
            "name": "Jollibee Yum with Cheese",
            "subtitle": "Jollibee Canada Yum Burger with Cheese. (16g Protein, 30g Carbs)",
            "category": "Lunch",
            "calories": 410,
            "sodium_mg": 880,
            "saturated_fat_g": 10,
            "cholesterol_mg": 40,
            "fiber_g": 1,
            "prep_time_minutes": 5,
            "servings": 1,
            "difficulty": "Easy",
            "heart_benefit": "High sodium burger option.",
            "tags": ["Fast Food", "Jollibee", "Burger"],
            "ingredients": [{"name": "Beef Patty", "unit": "pc", "amount": 1}, {"name": "Cheese", "unit": "slice", "amount": 1}, {"name": "Bun", "unit": "pc", "amount": 1}],
            "steps": ["Order at counter."],
            "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300", 
            "status": "published",
            "expert_validated": True
        },
        {
            "name": "Jollibee Spaghetti",
            "subtitle": "Jollibee Canada Sweet Style Spaghetti. (23g Protein, 76g Carbs)",
            "category": "Lunch",
            "calories": 610,
            "sodium_mg": 1340,
            "saturated_fat_g": 8,
            "cholesterol_mg": 20,
            "fiber_g": 4,
            "prep_time_minutes": 5,
            "servings": 1,
            "difficulty": "Easy",
            "heart_benefit": "Very high in sodium.",
            "tags": ["Fast Food", "Jollibee", "Spaghetti"],
            "ingredients": [{"name": "Pasta", "unit": "serving", "amount": 1}, {"name": "Sweet Sauce", "unit": "serving", "amount": 1}],
            "steps": ["Order at counter."],
            "image_url": "https://images.unsplash.com/photo-1516100882582-96c3a05fe590?q=80&w=300", 
            "status": "published",
            "expert_validated": True
        },
        {
            "name": "Jollibee Palabok Fiesta",
            "subtitle": "Jollibee Canada Palabok Fiesta. (20g Protein, 49g Carbs)",
            "category": "Lunch",
            "calories": 410,
            "sodium_mg": 950,
            "saturated_fat_g": 3.5,
            "cholesterol_mg": 80,
            "fiber_g": 1,
            "prep_time_minutes": 5,
            "servings": 1,
            "difficulty": "Easy",
            "heart_benefit": "Moderate sodium option.",
            "tags": ["Fast Food", "Jollibee", "Palabok"],
            "ingredients": [{"name": "Palabok", "unit": "serving", "amount": 1}],
            "steps": ["Order at counter."],
            "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=300",
            "status": "published",
            "expert_validated": True
        },
        {
            "name": "Jollibee 2 pcs Burgersteak with Rice",
            "subtitle": "Jollibee Canada 2 pcs Burgersteak with Steamed Rice. (24g Protein, 56g Carbs)",
            "category": "Lunch",
            "calories": 570,
            "sodium_mg": 1010,
            "saturated_fat_g": 14,
            "cholesterol_mg": 60,
            "fiber_g": 1,
            "prep_time_minutes": 5,
            "servings": 1,
            "difficulty": "Easy",
            "heart_benefit": "High in sodium and saturated fat.",
            "tags": ["Fast Food", "Jollibee", "Burgersteak"],
            "ingredients": [{"name": "Burgersteak", "unit": "pc", "amount": 2}, {"name": "Rice", "unit": "cup", "amount": 1}],
            "steps": ["Order at counter."],
            "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300",
            "status": "published",
            "expert_validated": True
        }
    ]

    count = 0
    for food in fast_foods:
        food["hss_tier"] = get_hss_tier(food["sodium_mg"], food["calories"], food["saturated_fat_g"])
        response = httpx.post(f"{url}/rest/v1/recipes", headers=headers, json=food)
        if response.status_code == 201:
            print(f"Inserted: {food['name']} with HSS Tier {food['hss_tier']}")
            count += 1
        else:
            print(f"Failed to insert {food['name']} (HSS Tier {food['hss_tier']}): {response.status_code} {response.text}")
            
    print(f"Successfully seeded {count} fast food items.")

if __name__ == "__main__":
    main()
