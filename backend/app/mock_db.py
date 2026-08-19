# backend/app/utils/mock_db.py
from datetime import datetime, date
from app.services.cases import get_deterministic_case_id

# 1. Identity & Profile Layer (Merged with local auth fields for easy tracking)
profiles = [
    {
        "id": "usr-patient-101",
        "phone": "+639000000001",
        "email": "user101@example.com",
        "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
        "role": "patient",
        "first_name": "John Mark",
        "last_name": "Magdasal",
        "date_of_birth": date(2005, 12, 1),
        "sex": "male",
        "height_cm": 172.5,
        "weight_kg": 68.0,
        "avatar_url": None,
        "health_goals": ["bp", "recovery"],
        "onboarding_status": "complete",
        "account_status": "active",
        "created_at": datetime(2026, 6, 25, 8, 0, 0),
        "updated_at": datetime(2026, 6, 25, 8, 30, 0),
    },
    {
        "id": "usr-patient-102",
        "phone": "+639000000002",
        "email": "user102@example.com",
        "password": "5aa6b60e659b85fbd29583c48529cb5f134bd91b5c68fbd6e60b81e8eb93cf52",
        "role": "patient",
        "first_name": "Pedro",
        "last_name": "Penduko",
        "date_of_birth": date(1965, 11, 23),
        "sex": "male",
        "height_cm": 168.0,
        "weight_kg": 85.2,
        "avatar_url": None,
        "health_goals": ["bp", "cholesterol", "prevention"],
        "onboarding_status": "complete",
        "account_status": "active",
        "created_at": datetime(2026, 6, 26, 9, 15, 0),
        "updated_at": datetime(2026, 6, 26, 10, 0, 0),
    },
    {
        "id": "usr-expert-201",
        "phone": "+639987654321",
        "email": "clinical.expert@heartlink.com",
        "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
        "role": "medical_expert",
        "first_name": "Dr. Maria",
        "last_name": "Santos",
        "date_of_birth": date(1980, 5, 14),
        "sex": "female",
        "height_cm": 160.0,
        "weight_kg": 54.5,
        "avatar_url": "https://storage.provider/expert201.jpg",
        "health_goals": [],
        "onboarding_status": "complete",
        "account_status": "active",
        "created_at": datetime(2025, 5, 10, 14, 0, 0),
        "updated_at": datetime(2026, 1, 15, 11, 20, 0),
    },
    {
        "id": "usr-chief-admin-001",
        "phone": "+639999999999",
        "email": "admin@heartlink.ph",
        "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
        "role": "admin",
        "first_name": "System",
        "last_name": "Admin",
        "date_of_birth": date(1985, 1, 1),
        "sex": "male",
        "height_cm": 170.0,
        "weight_kg": 70.0,
        "avatar_url": None,
        "health_goals": [],
        "onboarding_status": "complete",
        "account_status": "active",
        "created_at": datetime(2025, 1, 1, 8, 0, 0),
        "updated_at": datetime(2025, 1, 1, 8, 0, 0),
    },
    {
        "id": "usr-super-admin-001",
        "phone": "+639999999998",
        "email": "super.admin@heartlink.ph",
        "password": "73d2ee4365e59c3cc625ef20e2844918453ee4a704dc36326ac5d88d23aef26d",
        "role": "super_admin",
        "first_name": "System",
        "last_name": "Super Admin",
        "date_of_birth": date(1985, 1, 1),
        "sex": "male",
        "height_cm": 170.0,
        "weight_kg": 70.0,
        "avatar_url": None,
        "health_goals": [],
        "onboarding_status": "complete",
        "account_status": "active",
        "created_at": datetime(2025, 1, 1, 8, 0, 0),
        "updated_at": datetime(2025, 1, 1, 8, 0, 0),
    },
]
# 2. Staff Security System Layer
staff_permissions = [
    {
        "id": "perm-1",
        "staff_id": "usr-expert-201",  # Foreign Key links back to profiles
        "permission": "review_cases",  # Enum parameter selection
        "granted_by": "usr-chief-admin-001",
        "granted_at": datetime(2025, 5, 10, 14, 5, 0),
    },
    {
        "id": "perm-2",
        "staff_id": "usr-expert-201",
        "permission": "view_analytics",
        "granted_by": "usr-chief-admin-001",
        "granted_at": datetime(2025, 5, 10, 14, 5, 0),
    },
]

# 3. Clinical & Onboarding Baseline Metrics Layer (1:1 Relationships)
baseline_onboarding = [
    {
        "id": "onb-101",
        "user_id": "usr-patient-101",
        "vigorous_activity": True,
        "vigorous_days": "3",
        "vigorous_minutes": "45",
        "moderate_activity": True,
        "moderate_days": "2",
        "moderate_minutes": "30",
        "walk_bike_transport": True,
        "walk_bike_days": "5",
        "walk_bike_minutes": "20",
        "sedentary_hours": "4-6h",
        "sleep_hours": 7.0,
        "ever_smoked": False,
        "smoke_now": "Not at all",
        "ever_drank": True,
        "drink_frequency": "Monthly or less",
        "drinks_per_occasion": "1-2",
        "binge_drinking_freq": "Never",
        "diet_level": "average",
        "fried_food_freq": "sometimes",
        "salty_food_freq": "sometimes",
        "fruit_veg_servings": "2-3",
        "health_goals": ["bp"],
        "allergies": ["peanuts"],
        "dietary_practice": "Standard Filipino",
        "created_at": datetime(2026, 6, 25, 8, 10, 0),
        "updated_at": datetime(2026, 6, 25, 8, 10, 0),
    }
]

# 4. User Monitoring Safeguard Configuration
user_thresholds = [
    {
        "id": "thresh-101",
        "user_id": "usr-patient-101",
        "sodium_limit_mg": 1500,
        "fluid_limit_ml": 2000,
        "active_minutes_goal": 30,
        "systolic_threshold": 120,  # Borderline metric constraint limit
        "diastolic_threshold": 80,
        "updated_at": datetime(2026, 6, 25, 8, 25, 0),
    }
]

# 4.5 User Reminders Configuration
user_reminders = [
    {
        "user_id": "usr-patient-101",
        "morning": {"enabled": True, "time": "08:00"},
        "evening": {"enabled": False, "time": "20:00"},
        "activity": {"enabled": False, "time": "17:00"}
    }
]

# 5. Core Operational Transaction Datasets (Patient Inputs)
daily_health_logs = [
    {
        "id": "log-901",
        "user_id": "usr-patient-101",
        "systolic_bp": 118,
        "diastolic_bp": 76,
        "heart_rate_bpm": 72,
        "weight_kg": 68.0,
        "medication_taken": False,
        "symptoms": [],
        "severity_map": {},  # JSONB key mapping structure
        "context": "resting",
        "notes": "Felt perfectly normal in the morning checking",
        "logged_at": datetime(2026, 7, 9, 7, 30, 0),
    },
    {
        "id": "log-902",
        "user_id": "usr-patient-101",
        "systolic_bp": 134,  # Triggers breach condition: 134 > 120 Limit
        "diastolic_bp": 86,  # Triggers breach condition: 86 > 80 Limit
        "heart_rate_bpm": 88,
        "weight_kg": 68.5,
        "medication_taken": False,
        "symptoms": ["chest_tightness", "dizziness"],
        "severity_map": {"chest_tightness": 5, "dizziness": 3},
        "context": "after_eating",
        "notes": "Felt light dizziness after eating local dried fish lunch",
        "logged_at": datetime(2026, 7, 10, 13, 15, 0),
    },
]

meal_logs = [
    {
        "id": "meal-301",
        "user_id": "usr-patient-101",
        "recipe_id": "rec-501",  # Foreign Key links to custom recipe definition
        "meal_name": "Low Sodium Chicken Tinola",
        "barcode": None,
        "portion": "1 serving",
        "calories": 320,
        "sodium_mg": 380,
        "saturated_fat_g": 1.5,
        "fiber_g": 4,
        "image_url": "",
        "logged_at": datetime(2026, 7, 9, 12, 0, 0),
    }
]

exercise_logs = [
    {
        "id": "ex-401",
        "user_id": "usr-patient-101",
        "routine_id": "rout-601",
        "routine_name": "Basal Paced Breathing Exercise",
        "duration_minutes": 10,
        "status": "completed",
        "logged_at": datetime(2026, 7, 9, 20, 0, 0),
    }
]

sleep_logs = [
    {
        "id": "sleep-801",
        "user_id": "usr-patient-101",
        "duration_hours": 7.5,
        "quality": "Good",
        "logged_at": datetime(2026, 7, 9, 7, 0, 0),
    }
]

# 6. Medical Evaluation & Predictive Logic Layers
hss_history = []

hss_history = [
    {
        "id": "hss-701",
        "user_id": "usr-patient-101",
        "score": 85,
        "tier": "Stable",  # Core Tiering System matching
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 5, 20, 10, 0),
    },
    {
        "id": "hss-702",
        "user_id": "usr-patient-101",
        "score": 82,
        "tier": "Stable",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 6, 20, 10, 0),
    },
    {
        "id": "hss-703",
        "user_id": "usr-patient-101",
        "score": 88,
        "tier": "Stable",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 7, 20, 10, 0),
    },
    {
        "id": "hss-704",
        "user_id": "usr-patient-101",
        "score": 90,
        "tier": "Stable",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 8, 20, 10, 0),
    },
    {
        "id": "hss-705",
        "user_id": "usr-patient-101",
        "score": 78,
        "tier": "Moderate",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 9, 20, 10, 0),
    },
    {
        "id": "hss-706",
        "user_id": "usr-patient-101",
        "score": 52,  # Drops after high BP/symptom log input
        "tier": "Elevated Risk",
        "contributing_factors": {"bp_spike": "high", "symptom_count": 2},
        "computed_at": datetime(2026, 7, 10, 13, 20, 0),
    },
]

alerts = [
    {
        "id": "alert-801",
        "user_id": "usr-patient-101",
        "severity": "Warning",
        "alert_type": "BP Threshold",
        "message": "Systolic and Diastolic bounds exceeded user threshold configurations",
        "status": "Under Review",  # Alert processing context status state
        "trigger_context": {"systolic": 134, "diastolic": 86},
        "system_action": "Escalated to expert validation review pipeline queue",
        "flagged_hss": 52,
        "patient_snapshot": {
            "age": 20,
            "sex": "male",
            "conditions": ["prehypertension"],
            "vitals": {"systolic": 134, "diastolic": 86},
        },
        "created_at": datetime(2026, 7, 10, 13, 20, 0),
    }
]



expert_evaluations = []
datasets = []
candidate_models = []
admin_activity = []

# 7. Global Content Library Data (Core Recommendations Asset)
recipes = [
    {
        "id": "rec-501",
        "name": "Low Sodium Chicken Tinola",
        "subtitle": "Traditional Filipino ginger broth soup tuned for heart health optimization",
        "category": "Lunch",
        "hss_tier": "Stable",
        "sodium_mg": 380,
        "calories": 320,
        "saturated_fat_g": 1.5,
        "cholesterol_mg": 65,
        "fiber_g": 4,
        "prep_time_minutes": 35,
        "servings": 4,
        "difficulty": "Easy",
        "heart_benefit": "Lowers cellular fluid retention via deliberate reduction of industrial sodium extracts.",
        "tags": ["Low Sodium", "Filipino", "Soup"],
        "ingredients": [
            {"name": "Chicken breast, cut into serving pieces", "amount": 500, "unit": "g"},
            {"name": "Fresh ginger, julienned", "amount": 5, "unit": "slices"},
            {"name": "Chayote (sayote), peeled and sliced", "amount": 2, "unit": "medium"},
            {"name": "Moringa (malunggay) or chili leaves", "amount": 1, "unit": "cup"},
            {"name": "Garlic, crushed", "amount": 3, "unit": "cloves"},
            {"name": "Onion, chopped", "amount": 1, "unit": "medium"},
            {"name": "Water or low-sodium chicken broth", "amount": 1000, "unit": "ml"},
            {"name": "Fish sauce (low-sodium variant)", "amount": 1, "unit": "tbsp"}
        ],
        "steps": [
            "In a large pot, heat 1 tablespoon of olive oil over medium heat. Sauté the crushed garlic, chopped onion, and julienned ginger until they are fragrant and the onions become translucent.",
            "Add the cut chicken pieces into the pot. Sauté for about 5 to 7 minutes until the chicken turns light brown on all sides.",
            "Pour in the 1000ml of water or low-sodium broth. Bring the mixture to a gentle boil, then lower the heat and let it simmer for 25-30 minutes until the chicken is completely tender.",
            "Add the sliced chayote to the boiling soup and cook for another 5 minutes until the vegetables are tender but still crisp.",
            "Season with 1 tbsp of low-sodium fish sauce and a pinch of black pepper.",
            "Turn off the heat, add the malunggay or chili leaves, and cover the pot for 2 minutes to let the residual heat cook the greens. Serve hot."
        ],
        "image_url": "",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 5, 1, 10, 0, 0),
    },
    {
        "id": "rec-502",
        "name": "Heart-Healthy Salmon Bowl",
        "subtitle": "Rich in omega-3 fatty acids for cardiovascular support",
        "category": "Dinner",
        "hss_tier": "Stable",
        "sodium_mg": 280,
        "calories": 450,
        "saturated_fat_g": 2.0,
        "cholesterol_mg": 55,
        "fiber_g": 6,
        "prep_time_minutes": 25,
        "servings": 2,
        "difficulty": "Medium",
        "heart_benefit": "High in Omega-3 to help reduce inflammation and lower blood pressure.",
        "tags": ["Omega-3", "Seafood", "Dinner"],
        "ingredients": [
            {"name": "Fresh salmon fillet", "amount": 300, "unit": "g"},
            {"name": "Quinoa, rinsed", "amount": 1, "unit": "cup"},
            {"name": "Broccoli florets", "amount": 2, "unit": "cups"},
            {"name": "Cherry tomatoes, halved", "amount": 1, "unit": "cup"},
            {"name": "Lemon juice, freshly squeezed", "amount": 2, "unit": "tbsp"},
            {"name": "Extra virgin olive oil", "amount": 1, "unit": "tbsp"},
            {"name": "Black pepper and herbs (dill or parsley)", "amount": "To taste", "unit": ""}
        ],
        "steps": [
            "Preheat your oven to 400°F (200°C). Line a baking tray with parchment paper.",
            "Place the salmon fillet on the tray. Lightly brush with olive oil and sprinkle with black pepper and your choice of herbs.",
            "Bake the salmon for 12-15 minutes, or until the fish easily flakes with a fork. Avoid overcooking.",
            "While the salmon bakes, combine 1 cup of rinsed quinoa with 2 cups of water in a saucepan. Bring to a boil, reduce to a low simmer, cover, and cook for 15 minutes until the water is absorbed.",
            "Steam the broccoli florets for 5 minutes until they are tender-crisp and vibrant green.",
            "Assemble the bowl by placing a generous scoop of cooked quinoa at the bottom. Arrange the baked salmon, steamed broccoli, and halved cherry tomatoes on top.",
            "Drizzle the fresh lemon juice and remaining olive oil over the bowl right before serving."
        ],
        "image_url": "",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 1, 10, 0, 0),
    },
    {
        "id": "rec-503",
        "name": "Oatmeal with Berries",
        "subtitle": "High-fiber breakfast to manage cholesterol levels",
        "category": "Breakfast",
        "hss_tier": "Stable",
        "sodium_mg": 10,
        "calories": 250,
        "saturated_fat_g": 0.5,
        "cholesterol_mg": 0,
        "fiber_g": 8,
        "prep_time_minutes": 10,
        "servings": 1,
        "difficulty": "Easy",
        "heart_benefit": "Soluble fiber in oats helps lower LDL cholesterol.",
        "tags": ["High Fiber", "Breakfast", "Vegan"],
        "ingredients": [
            {"name": "Rolled oats (not instant)", "amount": 0.5, "unit": "cup"},
            {"name": "Mixed berries (blueberries, strawberries)", "amount": 0.5, "unit": "cup"},
            {"name": "Unsweetened almond milk", "amount": 1, "unit": "cup"},
            {"name": "Chia seeds", "amount": 1, "unit": "tbsp"},
            {"name": "Cinnamon powder", "amount": 0.5, "unit": "tsp"}
        ],
        "steps": [
            "In a small saucepan, combine the rolled oats and unsweetened almond milk. Bring the mixture to a gentle simmer over medium heat.",
            "Reduce the heat to low and cook for 5-7 minutes, stirring occasionally, until the oats have absorbed most of the liquid and reached a creamy consistency.",
            "Remove the saucepan from the heat and stir in the chia seeds and cinnamon powder.",
            "Pour the oatmeal into a serving bowl and let it sit for a minute to thicken slightly.",
            "Top generously with fresh mixed berries. You may add a light drizzle of honey if additional sweetness is desired."
        ],
        "image_url": "",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 10, 8, 0, 0),
    },
    {
        "id": "rec-504",
        "name": "Grilled Bangus with Citrus & Garlic",
        "subtitle": "Classic Filipino milkfish, heart-healthy style",
        "category": "Lunch",
        "hss_tier": "Stable",
        "sodium_mg": 95,
        "calories": 280,
        "saturated_fat_g": 2.0,
        "cholesterol_mg": 50,
        "fiber_g": 2,
        "prep_time_minutes": 35,
        "servings": 2,
        "difficulty": "Medium",
        "heart_benefit": "Calamansi and garlic provide robust flavor without the need for excess salt, making it ideal for blood pressure management.",
        "tags": ["Low Sodium", "High Protein", "Filipino"],
        "ingredients": [
            {"name": "Whole Bangus (milkfish), butterflied and deboned", "amount": 1, "unit": "large"},
            {"name": "Garlic, finely minced", "amount": 4, "unit": "cloves"},
            {"name": "Calamansi juice (or lemon)", "amount": 2, "unit": "tbsp"},
            {"name": "Extra virgin olive oil", "amount": 1, "unit": "tbsp"},
            {"name": "Ground black pepper", "amount": 1, "unit": "tsp"},
            {"name": "Tomato and onion salsa (for serving)", "amount": 1, "unit": "cup"}
        ],
        "steps": [
            "Ensure the butterflied bangus is thoroughly deboned. Rinse it lightly under cold water and pat completely dry with paper towels.",
            "In a small bowl, whisk together the minced garlic, calamansi juice, olive oil, and ground black pepper to create the marinade.",
            "Brush the marinade generously over the meaty side of the bangus. Let it marinate for at least 15-20 minutes at room temperature to absorb the flavors.",
            "Preheat your grill or a large grill pan over medium-high heat. Lightly oil the grates to prevent sticking.",
            "Place the bangus skin-side down on the grill. Cook for about 5-7 minutes until the skin is crispy and slightly charred.",
            "Carefully flip the fish using a wide spatula and grill the meat side for another 3-4 minutes until fully cooked and opaque.",
            "Transfer to a serving platter and serve immediately with fresh tomato and onion salsa on the side."
        ],
        "image_url": "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 12, 10, 0, 0),
    },
    {
        "id": "rec-505",
        "name": "Steamed White Fish with Ginger",
        "subtitle": "Ultra-low sodium and light protein for sensitive digestion",
        "category": "Dinner",
        "hss_tier": "Elevated Risk",
        "sodium_mg": 150,
        "calories": 210,
        "saturated_fat_g": 0.5,
        "cholesterol_mg": 45,
        "fiber_g": 1,
        "prep_time_minutes": 20,
        "servings": 2,
        "difficulty": "Easy",
        "heart_benefit": "Provides high-quality protein without taxing the cardiovascular system with sodium.",
        "tags": ["Low Sodium", "Seafood", "Dinner"],
        "ingredients": [
            {"name": "White fish fillet (tilapia or cod)", "amount": 300, "unit": "g"},
            {"name": "Fresh ginger, julienned", "amount": 1, "unit": "tbsp"},
            {"name": "Scallions, thinly sliced", "amount": 2, "unit": "stalks"},
            {"name": "Low-sodium soy sauce substitute", "amount": 1, "unit": "tsp"},
            {"name": "Sesame oil", "amount": 1, "unit": "tsp"}
        ],
        "steps": [
            "Place the fish fillet on a heat-proof plate.",
            "Top the fish evenly with the julienned ginger.",
            "Steam over boiling water for 10-12 minutes until the fish is opaque and flakes easily.",
            "Remove from steamer and drizzle with sesame oil and soy sauce substitute.",
            "Garnish with scallions and serve immediately."
        ],
        "image_url": "",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 10, 10, 0, 0),
    },
    {
        "id": "rec-506",
        "name": "Mashed Sweet Potatoes",
        "subtitle": "Potassium-rich complex carbohydrates for stable energy",
        "category": "Lunch",
        "hss_tier": "Elevated Risk",
        "sodium_mg": 85,
        "calories": 180,
        "saturated_fat_g": 0,
        "cholesterol_mg": 0,
        "fiber_g": 5,
        "prep_time_minutes": 25,
        "servings": 4,
        "difficulty": "Easy",
        "heart_benefit": "High potassium content helps counteract the effects of sodium on blood pressure.",
        "tags": ["Vegetarian", "Lunch", "Side Dish"],
        "ingredients": [
            {"name": "Sweet potatoes, peeled and cubed", "amount": 500, "unit": "g"},
            {"name": "Unsweetened almond milk", "amount": 60, "unit": "ml"},
            {"name": "Cinnamon", "amount": 0.5, "unit": "tsp"}
        ],
        "steps": [
            "Boil the sweet potato cubes in unsalted water for 15 minutes until very tender.",
            "Drain well and return to the pot.",
            "Add the almond milk and cinnamon.",
            "Mash with a potato masher until smooth."
        ],
        "image_url": "",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 12, 11, 0, 0),
    }
]

exercise_routines = [
    {
        "id": "rout-601",
        "name": "Basal Paced Breathing Exercise",
        "description": "Controlled deep vagus nerve activation breathing patterns to downregulate stress spikes.",
        "duration_minutes": 10,
        "hss_tier": "Stable",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Downregulate sympathetic nervous activation tracking matrices",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Sit comfortably in upright position.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Sit upright."
            },
            {
                "id": "breath-1",
                "instruction": "Inhale smoothly through nostrils.",
                "duration_seconds": 4,
                "type": "breathing",
                "phase": "inhale",
                "voice_cue": "Inhale."
            },
            {
                "id": "breath-2",
                "instruction": "Hold basal volume.",
                "duration_seconds": 2,
                "type": "breathing",
                "phase": "hold",
                "voice_cue": "Hold."
            },
            {
                "id": "breath-3",
                "instruction": "Exhale silently through mouth.",
                "duration_seconds": 6,
                "type": "breathing",
                "phase": "exhale",
                "voice_cue": "Exhale."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=DbDoBzGY3vo",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 5, 1, 11, 0, 0),
    },
    {
        "id": "rout-602",
        "name": "20-Minute Neighborhood Walk",
        "description": "Light cardio to improve circulation without overexertion.",
        "duration_minutes": 20,
        "hss_tier": "Stable",
        "type": "Light Cardio",
        "intensity": "Low",
        "goal": "Improves blood circulation and builds gentle endurance.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Warm up with light stretching.",
                "duration_seconds": 120,
                "type": "instruction",
                "voice_cue": "Warm up."
            },
            {
                "id": "step-2",
                "instruction": "Walk at a comfortable, conversational pace.",
                "duration_seconds": 900,
                "type": "instruction",
                "voice_cue": "Walk at a comfortable pace."
            },
            {
                "id": "step-3",
                "instruction": "Cool down with a slower pace.",
                "duration_seconds": 180,
                "type": "instruction",
                "voice_cue": "Cool down."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=njeZ29umqVE",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 1, 8, 0, 0),
    },
    {
        "id": "rout-603",
        "name": "Basic Standing Stretches",
        "description": "Gentle stretching to relieve muscle tension.",
        "duration_minutes": 10,
        "hss_tier": "Stable",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Enhances flexibility without straining the heart.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Reach arms overhead and hold.",
                "duration_seconds": 15,
                "type": "instruction",
                "voice_cue": "Reach arms overhead."
            },
            {
                "id": "step-2",
                "instruction": "Gently rotate shoulders backward 10 times.",
                "duration_seconds": 30,
                "type": "instruction",
                "voice_cue": "Rotate shoulders."
            },
            {
                "id": "step-3",
                "instruction": "Perform side bends holding each side.",
                "duration_seconds": 20,
                "type": "instruction",
                "voice_cue": "Perform side bends."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
        "guide_images": [
            "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
            "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop"
        ],
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 5, 9, 0, 0),
    },
    {
        "id": "rout-604",
        "name": "15-Minute Chair Yoga",
        "description": "Maintains mobility while keeping heart rate stable.",
        "duration_minutes": 15,
        "hss_tier": "Moderate",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Maintains mobility while keeping heart rate stable.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Sit comfortably in a chair.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Sit in a chair."
            },
            {
                "id": "step-2",
                "instruction": "Perform seated cat-cow stretches.",
                "duration_seconds": 60,
                "type": "instruction",
                "voice_cue": "Perform cat-cow stretches."
            },
            {
                "id": "step-3",
                "instruction": "Gently twist torso to each side.",
                "duration_seconds": 60,
                "type": "instruction",
                "voice_cue": "Twist torso to each side."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
        "guide_images": [
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop",
            "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600&h=400&fit=crop"
        ],
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 10, 9, 0, 0),
    },
    {
        "id": "rout-605",
        "name": "Seated Leg Lifts",
        "description": "Promotes lower body circulation passively.",
        "duration_minutes": 10,
        "hss_tier": "Moderate",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Promotes lower body circulation passively.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Sit with feet flat on the floor.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Sit with feet flat."
            },
            {
                "id": "step-2",
                "instruction": "Slowly extend one leg straight out.",
                "duration_seconds": 15,
                "type": "instruction",
                "voice_cue": "Extend one leg."
            },
            {
                "id": "step-3",
                "instruction": "Hold for 3 seconds, then lower.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Hold and lower."
            },
            {
                "id": "step-4",
                "instruction": "Repeat for the other leg.",
                "duration_seconds": 25,
                "type": "instruction",
                "voice_cue": "Repeat for the other leg."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
        "guide_images": [
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
            "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop",
            "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop"
        ],
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 12, 9, 0, 0),
    },
    {
        "id": "rout-606",
        "name": "4-7-8 Deep Breathing Technique",
        "description": "Reduces stress-induced heart rate spikes and calms nervous system.",
        "duration_minutes": 5,
        "hss_tier": "Elevated Risk",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Reduces stress-induced heart rate spikes and calms nervous system.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Inhale through nose.",
                "duration_seconds": 4,
                "type": "breathing",
                "phase": "inhale",
                "voice_cue": "Inhale."
            },
            {
                "id": "step-2",
                "instruction": "Hold breath.",
                "duration_seconds": 7,
                "type": "breathing",
                "phase": "hold",
                "voice_cue": "Hold."
            },
            {
                "id": "step-3",
                "instruction": "Exhale forcefully through mouth.",
                "duration_seconds": 8,
                "type": "breathing",
                "phase": "exhale",
                "voice_cue": "Exhale."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=Mn4kUw5uXQU",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 14, 9, 0, 0),
    },
    {
        "id": "rout-607",
        "name": "Guided Seated Relaxation",
        "description": "Lowers blood pressure and induces resting state.",
        "duration_minutes": 10,
        "hss_tier": "Elevated Risk",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Lowers blood pressure and induces resting state.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Close eyes and focus on natural breathing.",
                "duration_seconds": 60,
                "type": "breathing",
                "phase": "rest",
                "voice_cue": "Close your eyes."
            },
            {
                "id": "step-2",
                "instruction": "Progressively relax muscles from head to toe.",
                "duration_seconds": 120,
                "type": "instruction",
                "voice_cue": "Relax your muscles."
            },
            {
                "id": "step-3",
                "instruction": "Remain still and observe thoughts without engaging.",
                "duration_seconds": 120,
                "type": "instruction",
                "voice_cue": "Remain still."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1520333789090-1afc82db536a?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=DbDoBzGY3vo",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 15, 9, 0, 0),
    },
    {
        "id": "rout-608",
        "name": "Light Ankle Pumps",
        "description": "Seated ankle movements to prevent blood pooling.",
        "duration_minutes": 5,
        "hss_tier": "Elevated Risk",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Maintains basic lower extremity circulation.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Sit comfortably with feet flat on the floor.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Sit with feet flat."
            },
            {
                "id": "step-2",
                "instruction": "Lift your heels while keeping your toes on the floor, then lower.",
                "duration_seconds": 60,
                "type": "instruction",
                "voice_cue": "Lift your heels."
            },
            {
                "id": "step-3",
                "instruction": "Lift your toes while keeping your heels on the floor, then lower.",
                "duration_seconds": 60,
                "type": "instruction",
                "voice_cue": "Lift your toes."
            },
            {
                "id": "step-4",
                "instruction": "Repeat for 5 minutes continuously.",
                "duration_seconds": 300,
                "type": "instruction",
                "voice_cue": "Continue for five minutes."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 20, 9, 0, 0),
    },
    {
        "id": "rout-609",
        "name": "Deep Diaphragmatic Breathing",
        "description": "Reduces cardiac workload and stress.",
        "duration_minutes": 10,
        "hss_tier": "Elevated Risk",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Activates the parasympathetic nervous system to lower heart rate.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Lie flat on your back with a pillow under your knees.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Lie flat on your back."
            },
            {
                "id": "step-2",
                "instruction": "Place one hand on your upper chest and the other just below your rib cage.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Place your hands."
            },
            {
                "id": "breath-1",
                "instruction": "Breathe in slowly through your nose so that your stomach moves out.",
                "duration_seconds": 4,
                "type": "breathing",
                "phase": "inhale",
                "voice_cue": "Inhale."
            },
            {
                "id": "breath-2",
                "instruction": "Tighten your stomach muscles, letting them fall inward as you exhale.",
                "duration_seconds": 6,
                "type": "breathing",
                "phase": "exhale",
                "voice_cue": "Exhale."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=DbDoBzGY3vo",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 21, 9, 0, 0),
    }
]

# 8. User Content Library Maps
saved_recipes = []
saved_exercises = []

# 8.5 System Broadcasts
system_broadcasts = [
    {
        "id": "brd-1",
        "title": "Scheduled Server Optimization",
        "date": "May 28, 2026 10:00 AM",
        "publisher": "SYS-02 (Alex R.)",
        "display_publisher": "Alex R.",
        "message": "System Maintenance: We are performing a quick server optimization. The app may be briefly unavailable.",
        "type": "Maintenance",
        "target_audience": "All Registered Accounts",
        "created_at": datetime(2026, 5, 28, 10, 0, 0)
    },
    {
        "id": "brd-2",
        "title": "Weekly Health Check-In Reminder",
        "date": "May 24, 2026 08:30 AM",
        "publisher": "MED-01 (Dr. Jenkins)",
        "display_publisher": "Dr. Jenkins",
        "message": "Safety Reminder: Ensure your HSS profile is updated if you have experienced any fatigue this week.",
        "type": "Safety Reminder",
        "target_audience": "All Registered Accounts",
        "created_at": datetime(2026, 5, 24, 8, 30, 0)
    }
]

# 9. Support & Communications Infrastructure Tables
notifications = [
    {
        "id": "notif-001",
        "user_id": "usr-patient-101",
        "scope": "personal",
        "type": "alert",
        "broadcast_type": None,
        "publisher_id": None,
        "title": "Health Alert Warning",
        "message": "A daily check-in health log exceeded parameters. Clinical monitors notified.",
        "read": False,
        "created_at": datetime(2026, 7, 10, 13, 20, 5),
    },
    {
        "id": "notif-002",
        "user_id": "usr-patient-101",
        "scope": "personal",
        "type": "insight",
        "broadcast_type": None,
        "publisher_id": None,
        "title": "Weekly score improved",
        "message": "Your stability score rose by 5 points this week. Keep up the consistent medication and diet tracking!",
        "read": False,
        "created_at": datetime(2026, 7, 16, 9, 0, 0),
    },
    {
        "id": "notif-003",
        "user_id": "usr-patient-101",
        "scope": "personal",
        "type": "achievement",
        "broadcast_type": None,
        "publisher_id": None,
        "title": "7-day streak",
        "message": "You've logged your vitals for 7 consecutive days. Consistency is key to better health outcomes.",
        "read": True,
        "created_at": datetime(2026, 7, 15, 8, 30, 0),
    },
    {
        "id": "notif-004",
        "user_id": "usr-patient-101",
        "scope": "personal",
        "type": "reminder",
        "broadcast_type": None,
        "publisher_id": None,
        "title": "Daily symptom check-in",
        "message": "How are you feeling today? Tap to log your symptoms before your evening review.",
        "read": True,
        "created_at": datetime(2026, 7, 14, 18, 0, 0),
    }
]

feedback_tickets = [
    {
        "id": 1,
        "ticketId": "FB-1042",
        "date": "May 28, 2026",
        "user": "Robert Villanueva",
        "userEmail": "robert.v@email.com",
        "userId": "USR-A492",
        "category": "Bug Report",
        "preview": "The barcode scanner crashes when...",
        "fullMessage": "The barcode scanner crashes when I try to scan a generic oat brand. The camera opens, but right after it recognizes the barcode, the app completely freezes and closes itself.",
        "status": "Open",
        "deviceMeta": {
            "os": "Android 14",
            "model": "Samsung Galaxy S23 Ultra",
            "appVersion": "v1.2.4",
        },
        "adminNotes": "",
        "demo_seed": "heartlink-feedback-demo-v1",
    },
    {
        "id": 2,
        "ticketId": "FB-1041",
        "date": "May 27, 2026",
        "user": "Elena Marasigan",
        "userEmail": "elena.m@email.com",
        "userId": "USR-B118",
        "category": "UI/UX Suggestion",
        "preview": "Could you make the recipe font bigger?",
        "fullMessage": "I love the heart-healthy recipes, but when I am cooking in the kitchen, the font for the ingredients list is very hard to read from a distance. Could you add a text size toggle?",
        "status": "In Progress",
        "deviceMeta": {
            "os": "iOS 17.4",
            "model": "iPhone 13 Pro",
            "appVersion": "v1.2.4",
        },
        "adminNotes": "Assigned to UI team. Planning to add an accessibility slider in the next minor patch.",
        "demo_seed": "heartlink-feedback-demo-v1",
    },
    {
        "id": 3,
        "ticketId": "FB-1039",
        "date": "May 25, 2026",
        "user": "Miguel Santos",
        "userEmail": "miguel88@email.com",
        "userId": "USR-C882",
        "category": "Account Issue",
        "preview": "I cannot reset my password...",
        "fullMessage": "I forgot my password, but when I click the reset link in my email, it says the token is invalid or expired. I've tried this three times now.",
        "status": "Resolved",
        "deviceMeta": {
            "os": "Android 13",
            "model": "Google Pixel 6a",
            "appVersion": "v1.2.3",
        },
        "adminNotes": "Known Firebase auth token expiration bug. Sent manual reset link and patched backend token lifespan.",
        "demo_seed": "heartlink-feedback-demo-v1",
    },
    {
        "id": 4,
        "ticketId": "FB-1035",
        "date": "May 22, 2026",
        "user": "Anonymous User",
        "userEmail": "Not Provided",
        "userId": "N/A",
        "category": "Question",
        "preview": "Does the CSS score update automatically?",
        "fullMessage": "If I log my blood pressure today, does my Health Stability Score update right away, or does it take 24 hours?",
        "status": "Resolved",
        "deviceMeta": { "os": "Unknown", "model": "Unknown", "appVersion": "Unknown" },
        "adminNotes": "Replied via in-app notification confirming real-time updates.",
        "demo_seed": "heartlink-feedback-demo-v1",
    },
]
care_team_contacts = [
    {
        "id": "team-contacts-1",
        "user_id": "usr-patient-101",
        "contact_type": "doctor",
        "name": "Dr. Juan Dela Cruz",
        "role_title": "Attending Cardiologist",
        "phone": "+639223334444",
        "created_at": datetime(2026, 6, 25, 8, 40, 0),
    }
]

activity_logs = []
admin_notifications = []


# 9. Clinics
clinics = [
    {
        "id": "1",
        "name": "Chong Hua Hospital Heart Institute",
        "doctor": "Dr. Maria Santos, MD, FACC",
        "latitude": 10.3129,
        "longitude": 123.8925,
        "phone": "1234567890",
        "specialty": "General Cardiology",
    },
    {
        "id": "2",
        "name": "Cebu Doctors' University Hospital",
        "doctor": "Dr. Juan Dela Cruz, MD",
        "latitude": 10.3152,
        "longitude": 123.8897,
        "phone": "0987654321",
        "specialty": "General Cardiology",
    },
    {
        "id": "3",
        "name": "Perpetual Succour Hospital",
        "doctor": "Dr. Anna Reyes, MD",
        "latitude": 10.3188,
        "longitude": 123.8966,
        "phone": "1122334455",
        "specialty": "Cardiac Rehabilitation",
    },
]

# 10. Simple JSON Persistence for Dev Server Restarts
import json
import os

temp_profiles = []

DB_FILE = os.path.join(os.path.dirname(__file__), "mock_profiles.json")
TEMP_DB_FILE = os.path.join(os.path.dirname(__file__), "mock_temp_profiles.json")

def _serialize_item(item):
    if not isinstance(item, dict): return item
    serialized = {}
    for k, v in item.items():
        if isinstance(v, (datetime, date)):
            serialized[k] = v.isoformat()
        elif isinstance(v, dict):
            serialized[k] = _serialize_item(v)
        elif isinstance(v, list):
            serialized[k] = [_serialize_item(i) if isinstance(i, dict) else i for i in v]
        else:
            serialized[k] = v
    return serialized

def _deserialize_item(item):
    if not isinstance(item, dict): return item
    deserialized = {}
    for k, v in item.items():
        if k == "date_of_birth" and isinstance(v, str):
            try:
                deserialized[k] = date.fromisoformat(v)
            except Exception:
                deserialized[k] = v
        elif k in ("created_at", "updated_at", "expires_at", "logged_at", "computed_at") and isinstance(v, str):
            try:
                deserialized[k] = datetime.fromisoformat(v)
            except Exception:
                deserialized[k] = v
        elif isinstance(v, dict):
            deserialized[k] = _deserialize_item(v)
        elif isinstance(v, list):
            deserialized[k] = [_deserialize_item(i) if isinstance(i, dict) else i for i in v]
        else:
            deserialized[k] = v
    return deserialized

def save_profiles():
    try:
        data = {
            "profiles": [_serialize_item(p) for p in profiles],
            "baseline_onboarding": [_serialize_item(o) for o in baseline_onboarding],
            "user_thresholds": [_serialize_item(t) for t in user_thresholds]
        }
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving mock profiles: {e}")

def save_temp_profiles():
    try:
        data = [_serialize_item(p) for p in temp_profiles]
        with open(TEMP_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving temp profiles: {e}")

def load_profiles():
    global profiles, baseline_onboarding, user_thresholds
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    # Backwards compatibility for old format
                    profiles.clear()
                    profiles.extend([_deserialize_item(p) for p in data])
                else:
                    if "profiles" in data:
                        profiles.clear()
                        profiles.extend([_deserialize_item(p) for p in data["profiles"]])
                    if "baseline_onboarding" in data:
                        baseline_onboarding.clear()
                        baseline_onboarding.extend([_deserialize_item(o) for o in data["baseline_onboarding"]])
                    if "user_thresholds" in data:
                        user_thresholds.clear()
                        user_thresholds.extend([_deserialize_item(t) for t in data["user_thresholds"]])
        except Exception as e:
            print(f"Error loading mock profiles: {e}")
    else:
        save_profiles()
        
    # Ensure default super admin exists in database profiles
    super_admin_exists = any(p.get("id") == "usr-super-admin-001" for p in profiles)
    if not super_admin_exists:
        profiles.append({
            "id": "usr-super-admin-001",
            "phone": "+639999999998",
            "email": "super.admin@heartlink.ph",
            "password": "73d2ee4365e59c3cc625ef20e2844918453ee4a704dc36326ac5d88d23aef26d",
            "role": "super_admin",
            "first_name": "System",
            "last_name": "Super Admin",
            "date_of_birth": date(1985, 1, 1),
            "sex": "male",
            "height_cm": 170.0,
            "weight_kg": 70.0,
            "avatar_url": None,
            "health_goals": [],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": datetime(2025, 1, 1, 8, 0, 0),
            "updated_at": datetime(2025, 1, 1, 8, 0, 0),
        })
        save_profiles()

def load_temp_profiles():
    global temp_profiles
    if os.path.exists(TEMP_DB_FILE):
        try:
            with open(TEMP_DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                temp_profiles.clear()
                temp_profiles.extend([_deserialize_item(p) for p in data])
        except Exception as e:
            print(f"Error loading temp profiles: {e}")
    else:
        save_temp_profiles()

LOGS_DB_FILE = os.path.join(os.path.dirname(__file__), "mock_logs.json")

def save_logs():
    try:
        data = {
            "meal_logs": [_serialize_item(m) for m in meal_logs],
            "exercise_logs": [_serialize_item(e) for e in exercise_logs],
            "daily_health_logs": [_serialize_item(l) for l in daily_health_logs],
            "sleep_logs": [_serialize_item(s) for s in sleep_logs],
            "hss_history": [_serialize_item(h) for h in hss_history],
            "notifications": [_serialize_item(n) for n in notifications],
            "alerts": [_serialize_item(a) for a in alerts],
            "saved_recipes": [_serialize_item(r) for r in saved_recipes],
            "saved_exercises": [_serialize_item(e) for e in saved_exercises],
            "expert_evaluations": [_serialize_item(ee) for ee in expert_evaluations],
            "datasets": [_serialize_item(ds) for ds in datasets],
            "candidate_models": [_serialize_item(cm) for cm in candidate_models],
            "system_broadcasts": [_serialize_item(b) for b in system_broadcasts],
            "admin_activity": [_serialize_item(act) for act in admin_activity],
            "feedback_tickets": [_serialize_item(fb) for fb in feedback_tickets],
            "admin_notifications": [_serialize_item(an) for an in admin_notifications]
        }
        with open(LOGS_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving mock logs: {e}")

def load_logs():
    global meal_logs, exercise_logs, daily_health_logs, sleep_logs, hss_history, notifications, alerts, saved_recipes, saved_exercises, expert_evaluations, datasets, candidate_models, system_broadcasts, admin_activity, feedback_tickets, admin_notifications
    if os.path.exists(LOGS_DB_FILE):
        try:
            with open(LOGS_DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "meal_logs" in data:
                    meal_logs.clear()
                    meal_logs.extend([_deserialize_item(m) for m in data["meal_logs"]])
                if "exercise_logs" in data:
                    exercise_logs.clear()
                    exercise_logs.extend([_deserialize_item(e) for e in data["exercise_logs"]])
                if "daily_health_logs" in data:
                    daily_health_logs.clear()
                    daily_health_logs.extend([_deserialize_item(l) for l in data["daily_health_logs"]])
                if "sleep_logs" in data:
                    sleep_logs.clear()
                    sleep_logs.extend([_deserialize_item(s) for s in data["sleep_logs"]])
                if "hss_history" in data:
                    hss_history.clear()
                    hss_history.extend([_deserialize_item(c) for c in data["hss_history"]])
                if "notifications" in data:
                    notifications.clear()
                    notifications.extend([_deserialize_item(n) for n in data["notifications"]])
                if "alerts" in data:
                    alerts.clear()
                    alerts.extend([_deserialize_item(a) for a in data["alerts"]])
                if "saved_recipes" in data:
                    saved_recipes.clear()
                    saved_recipes.extend([_deserialize_item(r) for r in data["saved_recipes"]])
                if "saved_exercises" in data:
                    saved_exercises.clear()
                    saved_exercises.extend([_deserialize_item(e) for e in data["saved_exercises"]])
                if "expert_evaluations" in data:
                    expert_evaluations.clear()
                    expert_evaluations.extend([_deserialize_item(ee) for ee in data["expert_evaluations"]])
                if "datasets" in data:
                    datasets.clear()
                    datasets.extend([_deserialize_item(ds) for ds in data["datasets"]])
                if "candidate_models" in data:
                    candidate_models.clear()
                    candidate_models.extend([_deserialize_item(cm) for cm in data["candidate_models"]])
                if "system_broadcasts" in data:
                    system_broadcasts.clear()
                    system_broadcasts.extend([_deserialize_item(b) for b in data["system_broadcasts"]])
                if "admin_activity" in data:
                    admin_activity.clear()
                    admin_activity.extend([_deserialize_item(act) for act in data["admin_activity"]])
                if "feedback_tickets" in data:
                    feedback_tickets.clear()
                    feedback_tickets.extend([_deserialize_item(fb) for fb in data["feedback_tickets"]])
                else:
                    feedback_tickets.clear()
                if "admin_notifications" in data:
                    admin_notifications.clear()
                    admin_notifications.extend([_deserialize_item(an) for an in data["admin_notifications"]])
                else:
                    admin_notifications.clear()
        except Exception as e:
            print(f"Error loading mock logs: {e}")
    else:
        save_logs()

load_profiles()
load_temp_profiles()
load_logs()

def seed_rich_demo_data(force=False):
    """
    Deterministic Rich Demonstration Dataset Seeder.
    Clears old demo-owned records and regenerates dynamic offsets relative to current time.
    """
    from datetime import timedelta
    
    DEMO_USER_IDS = {"usr-patient-101", "usr-patient-102", "usr-patient-c01", "usr-patient-d01", "usr-patient-e01", "usr-patient-f01", "usr-patient-g01", "usr-patient-h01", "usr-patient-a01"}

    global profiles, baseline_onboarding, user_thresholds, user_reminders
    global daily_health_logs, meal_logs, exercise_logs, sleep_logs, hss_history, expert_evaluations, alerts, notifications, admin_activity, system_broadcasts
    global recipes, exercise_routines, feedback_tickets, admin_notifications

    # Remove existing demo data to prevent duplication
    profiles[:] = [p for p in profiles if p.get("demo_seed") != "heartlink-demo-v2"]
    baseline_onboarding[:] = [o for o in baseline_onboarding if o.get("demo_seed") != "heartlink-demo-v2"]
    user_thresholds[:] = [t for t in user_thresholds if t.get("demo_seed") != "heartlink-demo-v2"]
    user_reminders[:] = [r for r in user_reminders if r.get("demo_seed") != "heartlink-demo-v2"]
    
    daily_health_logs[:] = [x for x in daily_health_logs if x.get("demo_seed") != "heartlink-demo-v2"]
    meal_logs[:] = [x for x in meal_logs if x.get("demo_seed") != "heartlink-demo-v2"]
    exercise_logs[:] = [x for x in exercise_logs if x.get("demo_seed") != "heartlink-demo-v2"]
    sleep_logs[:] = [x for x in sleep_logs if x.get("demo_seed") != "heartlink-demo-v2"]
    hss_history[:] = [x for x in hss_history if x.get("demo_seed") != "heartlink-demo-v2"]
    expert_evaluations[:] = [x for x in expert_evaluations if x.get("demo_seed") != "heartlink-demo-v2"]
    alerts[:] = [x for x in alerts if x.get("demo_seed") != "heartlink-demo-v2"]
    notifications[:] = [x for x in notifications if x.get("demo_seed") != "heartlink-demo-v2"]
    admin_activity[:] = [x for x in admin_activity if x.get("demo_seed") != "heartlink-demo-v2"]
    system_broadcasts[:] = [b for b in system_broadcasts if b.get("demo_seed") != "heartlink-demo-v2"]
    feedback_tickets[:] = [t for t in feedback_tickets if t.get("demo_seed") != "heartlink-feedback-demo-v1"]
    admin_notifications[:] = [an for an in admin_notifications if an.get("demo_seed") != "heartlink-admin-notifications-demo-v1"]

    # Enrich recipe coverage (Moderate & Critical recipes)
    recipes[:] = [r for r in recipes if r["id"] not in ("rec-507", "rec-508")]
    recipes.append({
        "id": "rec-507",
        "name": "Garlic Ginger Tofu Stir-Fry",
        "subtitle": "Lean protein and anti-inflammatory spices",
        "category": "Lunch",
        "hss_tier": "Moderate",
        "sodium_mg": 220,
        "calories": 190,
        "saturated_fat_g": 0.5,
        "cholesterol_mg": 0,
        "fiber_g": 3,
        "prep_time_minutes": 15,
        "servings": 2,
        "difficulty": "Easy",
        "heart_benefit": "Ginger supports circulation and garlic improves endothelial function.",
        "tags": ["Low Sodium", "Vegetarian", "Lunch"],
        "ingredients": [
            {"name": "Extra firm tofu, cubed", "amount": 200, "unit": "g"},
            {"name": "Minced garlic", "amount": 2, "unit": "cloves"},
            {"name": "Minced ginger", "amount": 1, "unit": "tsp"},
            {"name": "Broccoli florets", "amount": 1, "unit": "cup"},
            {"name": "Low-sodium soy substitute", "amount": 1, "unit": "tsp"}
        ],
        "steps": [
            "Pan-sear tofu cubes in a non-stick pan with a light spray of olive oil.",
            "Add garlic, ginger, and broccoli florets, tossing frequently.",
            "Drizzle low-sodium soy substitute and serve hot."
        ],
        "image_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-chief-admin-001",
        "created_at": datetime.now() - timedelta(days=30)
    })
    recipes.append({
        "id": "rec-508",
        "name": "Low-Sodium Vegetable Broth",
        "subtitle": "Soothing, mineral-dense hydration broth",
        "category": "Dinner",
        "hss_tier": "Critical",
        "sodium_mg": 90,
        "calories": 80,
        "saturated_fat_g": 0.1,
        "cholesterol_mg": 0,
        "fiber_g": 2,
        "prep_time_minutes": 45,
        "servings": 4,
        "difficulty": "Easy",
        "heart_benefit": "Ultra-low sodium profile minimizes myocardial strain and fluid overload risk.",
        "tags": ["Low Sodium", "Soup", "Dinner"],
        "ingredients": [
            {"name": "Carrots, sliced", "amount": 2, "unit": "medium"},
            {"name": "Celery stalks, sliced", "amount": 2, "unit": "stalks"},
            {"name": "Onion, halved", "amount": 1, "unit": "medium"},
            {"name": "Garlic cloves", "amount": 4, "unit": "cloves"},
            {"name": "Fresh herbs (thyme, parsley)", "amount": "To taste", "unit": ""}
        ],
        "steps": [
            "Place carrots, celery, onion, and garlic in a large pot.",
            "Cover with water and bring to a boil, then reduce heat to low.",
            "Simmer for 45 minutes, strain out vegetables, and serve the warm broth."
        ],
        "image_url": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400&h=300&fit=crop",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-chief-admin-001",
        "created_at": datetime.now() - timedelta(days=30)
    })

    # Enrich recipes image_url properties
    for r in recipes:
        if r["id"] == "rec-501":
            r["image_url"] = "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop"
        elif r["id"] == "rec-502":
            r["image_url"] = "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop"
        elif r["id"] == "rec-503":
            r["image_url"] = "https://images.unsplash.com/photo-1517881917430-e70dfb3610aa?w=400&h=300&fit=crop"
        elif r["id"] == "rec-505":
            r["image_url"] = "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop"
        elif r["id"] == "rec-506":
            r["image_url"] = "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=300&fit=crop"

    # Enrich exercise routines (Critical exercise)
    exercise_routines = [e for e in exercise_routines if e["id"] != "rout-610"]
    exercise_routines.append({
        "id": "rout-610",
        "name": "Very Light Chair Stretches",
        "description": "Very gentle stretches suitable for high cardiac risk states.",
        "duration_minutes": 5,
        "hss_tier": "Critical",
        "type": "Stretching",
        "intensity": "None",
        "goal": "Maintains range of motion and joint health with zero cardiovascular strain.",
        "steps": [
            {
                "id": "step-1",
                "instruction": "Sit comfortably in a sturdy chair with your feet flat on the floor.",
                "duration_seconds": 10,
                "type": "instruction",
                "voice_cue": "Sit upright."
            },
            {
                "id": "step-2",
                "instruction": "Slowly roll your shoulders backward in small circles.",
                "duration_seconds": 15,
                "type": "instruction",
                "voice_cue": "Roll your shoulders."
            },
            {
                "id": "breath-1",
                "instruction": "Inhale slowly, sitting tall, then exhale relaxing your neck.",
                "duration_seconds": 5,
                "type": "breathing",
                "phase": "inhale",
                "voice_cue": "Inhale deeply."
            }
        ],
        "media_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=DbDoBzGY3vo",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-chief-admin-001",
        "created_at": datetime.now() - timedelta(days=30)
    })

    # Profiles definitions
    now = datetime.now()
    demo_profiles = [
        {
            "id": "usr-patient-101",
            "phone": "+639000000001",
            "email": "user101@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "John Mark",
            "last_name": "Magdasal",
            "date_of_birth": date(2005, 12, 1),
            "sex": "male",
            "height_cm": 172.5,
            "weight_kg": 68.0,
            "avatar_url": None,
            "health_goals": ["bp", "recovery"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=30),
            "updated_at": now - timedelta(days=30),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-102",
            "phone": "+639000000002",
            "email": "user102@example.com",
            "password": "5aa6b60e659b85fbd29583c48529cb5f134bd91b5c68fbd6e60b81e8eb93cf52",
            "role": "patient",
            "first_name": "Pedro",
            "last_name": "Penduko",
            "date_of_birth": date(1965, 11, 23),
            "sex": "male",
            "height_cm": 168.0,
            "weight_kg": 85.2,
            "avatar_url": None,
            "health_goals": ["bp", "cholesterol", "prevention"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=30),
            "updated_at": now - timedelta(days=30),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-a01",
            "phone": "+639000000003",
            "email": "usera01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Alma",
            "last_name": "Stable",
            "date_of_birth": date(1990, 3, 12),
            "sex": "female",
            "height_cm": 165.0,
            "weight_kg": 60.0,
            "avatar_url": None,
            "health_goals": ["prevention"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=20),
            "updated_at": now - timedelta(days=20),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-c01",
            "phone": "+639000000004",
            "email": "userc01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Carlos",
            "last_name": "Celdran",
            "date_of_birth": date(1975, 4, 15),
            "sex": "male",
            "height_cm": 175.0,
            "weight_kg": 78.0,
            "avatar_url": None,
            "health_goals": ["bp", "prevention"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=20),
            "updated_at": now - timedelta(days=20),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-d01",
            "phone": "+639000000005",
            "email": "userd01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Dolores",
            "last_name": "Diaz",
            "date_of_birth": date(1982, 8, 30),
            "sex": "female",
            "height_cm": 162.0,
            "weight_kg": 72.5,
            "avatar_url": None,
            "health_goals": ["bp", "recovery"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=15),
            "updated_at": now - timedelta(days=15),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-e01",
            "phone": "+639000000006",
            "email": "usere01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Elena",
            "last_name": "Escudero",
            "date_of_birth": date(1998, 1, 10),
            "sex": "female",
            "height_cm": 165.0,
            "weight_kg": 55.0,
            "avatar_url": None,
            "health_goals": ["prevention"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=3),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-f01",
            "phone": "+639000000007",
            "email": "userf01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Fernando",
            "last_name": "Poe",
            "date_of_birth": date(1950, 8, 20),
            "sex": "male",
            "height_cm": 178.0,
            "weight_kg": 85.0,
            "avatar_url": None,
            "health_goals": ["bp", "recovery", "prevention"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=40),
            "updated_at": now - timedelta(days=40),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-g01",
            "phone": "+639000000008",
            "email": "userg01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Gloria",
            "last_name": "Garcia",
            "date_of_birth": date(1970, 9, 5),
            "sex": "female",
            "height_cm": 158.0,
            "weight_kg": 64.0,
            "avatar_url": None,
            "health_goals": ["bp", "prevention"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=35),
            "updated_at": now - timedelta(days=35),
            "demo_seed": "heartlink-demo-v2"
        },
        {
            "id": "usr-patient-h01",
            "phone": "+639000000009",
            "email": "userh01@example.com",
            "password": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            "role": "patient",
            "first_name": "Henry",
            "last_name": "Sy",
            "date_of_birth": date(1960, 10, 25),
            "sex": "male",
            "height_cm": 170.0,
            "weight_kg": 76.0,
            "avatar_url": None,
            "health_goals": ["bp", "recovery"],
            "onboarding_status": "complete",
            "account_status": "active",
            "created_at": now - timedelta(days=30),
            "updated_at": now - timedelta(days=30),
            "demo_seed": "heartlink-demo-v2"
        }
    ]
    
    # Overwrite profiles (preserve non-demo ones, replace or insert demo ones)
    for dp in demo_profiles:
        existing = next((p for p in profiles if p["id"] == dp["id"]), None)
        if existing:
            existing.update(dp)
        else:
            profiles.append(dp)

    # Rebuild baseline onboarding & thresholds for demo users
    for dp in demo_profiles:
        user_id = dp["id"]
        v_act = True; v_days = "3"; v_min = "30"
        m_act = True; m_days = "3"; m_min = "30"
        w_act = True; w_days = "5"; w_min = "30"
        sed_hrs = "4-6h"; sl_hrs = 7.0
        smoke = False; smoke_now_val = "Not at all"
        drink = True; drink_freq_val = "Monthly or less"
        diet = "average"; fried = "sometimes"; salty = "sometimes"
        fruit = "2-3"; practice = "Standard Filipino"

        if user_id == "usr-patient-a01":  # Stable
            v_act = True; v_days = "4"; v_min = "30"
            m_act = True; m_days = "3"; m_min = "30"
            w_act = True; w_days = "5"; w_min = "30"
            sed_hrs = "2-4h"; sl_hrs = 8.0
            smoke = False; smoke_now_val = "Not at all"
            drink = False; drink_freq_val = "Never"
            diet = "excellent"; fried = "rarely"; salty = "rarely"
            fruit = "4+"; practice = "Low Sodium"
        elif user_id == "usr-patient-102":  # Moderate
            v_act = True; v_days = "2"; v_min = "30"
            m_act = True; m_days = "2"; m_min = "20"
            w_act = True; w_days = "3"; w_min = "15"
            sed_hrs = "4-6h"; sl_hrs = 7.0
            smoke = False; smoke_now_val = "Not at all"
            drink = True; drink_freq_val = "Monthly or less"
            diet = "average"; fried = "sometimes"; salty = "sometimes"
            fruit = "2-3"; practice = "Standard Filipino"
        elif user_id == "usr-patient-c01":  # Elevated Risk
            v_act = False; v_days = "0"; v_min = "0"
            m_act = True; m_days = "1"; m_min = "15"
            w_act = False; w_days = "0"; w_min = "0"
            sed_hrs = "6-8h"; sl_hrs = 6.0
            smoke = True; smoke_now_val = "Not at all"
            drink = True; drink_freq_val = "Weekly"
            diet = "poor"; fried = "often"; salty = "often"
            fruit = "0-1"; practice = "Standard Filipino"
        elif user_id == "usr-patient-d01":  # Critical
            v_act = False; v_days = "0"; v_min = "0"
            m_act = False; m_days = "0"; m_min = "0"
            w_act = False; w_days = "0"; w_min = "0"
            sed_hrs = "8h+"; sl_hrs = 5.0
            smoke = True; smoke_now_val = "Daily"
            drink = True; drink_freq_val = "Daily"
            diet = "poor"; fried = "often"; salty = "often"
            fruit = "0-1"; practice = "High Sodium"
        elif user_id == "usr-patient-f01":  # High Engagement
            v_act = True; v_days = "5"; v_min = "45"
            m_act = True; m_days = "4"; m_min = "30"
            w_act = True; w_days = "7"; w_min = "30"
            sed_hrs = "2-4h"; sl_hrs = 8.0
            smoke = False; smoke_now_val = "Not at all"
            drink = False; drink_freq_val = "Never"
            diet = "excellent"; fried = "rarely"; salty = "rarely"
            fruit = "4+"; practice = "Vegetarian"
        elif user_id == "usr-patient-g01":  # Improving
            v_act = True; v_days = "3"; v_min = "30"
            m_act = True; m_days = "3"; m_min = "30"
            w_act = True; w_days = "4"; w_min = "20"
            sed_hrs = "4-6h"; sl_hrs = 7.5
            smoke = True; smoke_now_val = "Not at all"
            drink = True; drink_freq_val = "Monthly or less"
            diet = "average"; fried = "sometimes"; salty = "sometimes"
            fruit = "2-3"; practice = "Low Sodium"
        elif user_id == "usr-patient-h01":  # Declining
            v_act = False; v_days = "0"; v_min = "0"
            m_act = True; m_days = "1"; m_min = "15"
            w_act = False; w_days = "0"; w_min = "0"
            sed_hrs = "8h+"; sl_hrs = 5.5
            smoke = True; smoke_now_val = "Daily"
            drink = True; drink_freq_val = "Weekly"
            diet = "poor"; fried = "often"; salty = "often"
            fruit = "0-1"; practice = "Standard Filipino"

        baseline_onboarding.append({
            "id": f"onb-{user_id}",
            "user_id": user_id,
            "vigorous_activity": v_act,
            "vigorous_days": v_days,
            "vigorous_minutes": v_min,
            "moderate_activity": m_act,
            "moderate_days": m_days,
            "moderate_minutes": m_min,
            "walk_bike_transport": w_act,
            "walk_bike_days": w_days,
            "walk_bike_minutes": w_min,
            "sedentary_hours": sed_hrs,
            "sleep_hours": sl_hrs,
            "ever_smoked": smoke,
            "smoke_now": smoke_now_val,
            "ever_drank": drink,
            "drink_frequency": drink_freq_val,
            "drinks_per_occasion": "1-2",
            "binge_drinking_freq": "Never",
            "diet_level": diet,
            "fried_food_freq": fried,
            "salty_food_freq": salty,
            "fruit_veg_servings": fruit,
            "health_goals": dp["health_goals"],
            "allergies": [],
            "dietary_practice": practice,
            "created_at": dp["created_at"],
            "updated_at": dp["updated_at"],
            "demo_seed": "heartlink-demo-v2"
        })
        
        user_thresholds.append({
            "id": f"thresh-{user_id}",
            "user_id": user_id,
            "sodium_limit_mg": 1500,
            "fluid_limit_ml": 2000,
            "active_minutes_goal": 30,
            "systolic_threshold": 120,
            "diastolic_threshold": 80,
            "updated_at": dp["created_at"],
            "demo_seed": "heartlink-demo-v2"
        })
        
        user_reminders.append({
            "user_id": user_id,
            "morning": {"enabled": True, "time": "08:00"},
            "evening": {"enabled": False, "time": "20:00"},
            "activity": {"enabled": False, "time": "17:00"},
            "demo_seed": "heartlink-demo-v2"
        })

    # Logger helper functions
    def add_hss(uid, score, days_ago):
        dt = datetime.now() - timedelta(days=days_ago)
        tier = "Stable" if score >= 80 else ("Moderate" if score >= 60 else ("Elevated Risk" if score >= 50 else "Critical"))
        hss_history.append({
            "id": f"hss-{uid}-{days_ago}",
            "user_id": uid,
            "score": score,
            "tier": tier,
            "contributing_factors": {"bp_variance": "medium"},
            "computed_at": dt,
            "demo_seed": "heartlink-demo-v2"
        })

    def add_health_log(uid, sys, dia, hr, symptoms=[], severity_map={}, context="resting", notes="", days_ago=0, triggered_by_exercise_id=None):
        dt = datetime.now() - timedelta(days=days_ago)
        daily_health_logs.append({
            "id": f"log-{uid}-{days_ago}",
            "user_id": uid,
            "systolic_bp": sys,
            "diastolic_bp": dia,
            "heart_rate_bpm": hr,
            "weight_kg": 70.0,
            "medication_taken": True,
            "symptoms": symptoms,
            "severity_map": severity_map,
            "context": context,
            "notes": notes,
            "logged_at": dt,
            "triggered_by_exercise_id": triggered_by_exercise_id,
            "demo_seed": "heartlink-demo-v2"
        })

    ex_counts = {}
    def add_exercise_log(uid, routine_id, name, duration, status, days_ago):
        dt = datetime.now() - timedelta(days=days_ago)
        key = (uid, days_ago)
        ex_index = ex_counts.get(key, 0)
        ex_counts[key] = ex_index + 1
        exercise_logs.append({
            "id": f"ex-{uid}-{days_ago}-{ex_index}",
            "user_id": uid,
            "routine_id": routine_id,
            "routine_name": name,
            "duration_minutes": duration,
            "status": status,
            "logged_at": dt,
            "demo_seed": "heartlink-demo-v2"
        })

    meal_counts = {}
    def add_meal_log(uid, recipe_id, name, portion, calories, sodium, days_ago):
        dt = datetime.now() - timedelta(days=days_ago)
        key = (uid, days_ago)
        meal_index = meal_counts.get(key, 0)
        meal_counts[key] = meal_index + 1
        meal_logs.append({
            "id": f"meal-{uid}-{days_ago}-{meal_index}",
            "user_id": uid,
            "recipe_id": recipe_id,
            "meal_name": name,
            "barcode": None,
            "portion": portion,
            "calories": calories,
            "sodium_mg": sodium,
            "saturated_fat_g": 1.5,
            "fiber_g": 3,
            "image_url": "",
            "logged_at": dt,
            "demo_seed": "heartlink-demo-v2"
        })

    def add_sleep_log(uid, duration, quality, days_ago):
        dt = datetime.now() - timedelta(days=days_ago)
        sleep_logs.append({
            "id": f"sleep-{uid}-{days_ago}",
            "user_id": uid,
            "duration_hours": duration,
            "quality": quality,
            "logged_at": dt,
            "demo_seed": "heartlink-demo-v2"
        })

    # ─── USER A (Stable: usr-patient-a01) ───
    for i in range(30):
        add_hss("usr-patient-a01", 85, i)
        add_health_log("usr-patient-a01", 116, 75, 72, [], {}, "resting", "Felt great today", i)
        add_sleep_log("usr-patient-a01", 8.0, "Good", i)
        add_meal_log("usr-patient-a01", "rec-501", "Low Sodium Chicken Tinola", "1 serving", 320, 380, i)
        add_meal_log("usr-patient-a01", "rec-502", "Heart-Healthy Salmon Bowl", "1 serving", 450, 280, i)
        add_meal_log("usr-patient-a01", "rec-503", "Oatmeal with Berries", "1 serving", 250, 10, i)
        add_exercise_log("usr-patient-a01", "rout-601", "Basal Paced Breathing Exercise", 10, "completed", i)

    # ─── USER B (Moderate: usr-patient-102) ───
    for i in range(30):
        add_hss("usr-patient-102", 70 if i % 2 == 0 else 72, i)
        if i != 3:
            add_health_log("usr-patient-102", 128 if i % 3 == 0 else 122, 82 if i % 3 == 0 else 78, 76, [], {}, "resting", "Normal day", i)
            add_sleep_log("usr-patient-102", 7.0 if i % 2 == 0 else 6.5, "Good" if i % 2 == 0 else "Fair", i)
            add_meal_log("usr-patient-102", "rec-501", "Low Sodium Chicken Tinola", "1 serving", 320, 380, i)
            add_meal_log("usr-patient-102", "rec-507", "Garlic Ginger Tofu Stir-Fry", "1 serving", 190, 220, i)
            add_exercise_log("usr-patient-102", "rout-604", "15-Minute Chair Yoga", 10, "completed", i)

    # ─── USER C (Elevated Risk: usr-patient-c01) ───
    for i in range(30):
        add_hss("usr-patient-c01", 54 if i % 2 == 0 else 52, i)
        sys_bp = 136 if i % 2 == 0 else 134
        dia_bp = 86 if i % 2 == 0 else 84
        symptoms = ["dizziness"] if i in (2, 4, 10, 15, 20, 25) else []
        sev_map = {"dizziness": 2} if i in (2, 4, 10, 15, 20, 25) else {}
        add_health_log("usr-patient-c01", sys_bp, dia_bp, 80, symptoms, sev_map, "resting", "Feeling slightly dizzy", i)
        add_sleep_log("usr-patient-c01", 6.0, "Fair", i)
        add_meal_log("usr-patient-c01", "rec-505", "Steamed White Fish with Ginger", "1 serving", 210, 150, i)
        add_meal_log("usr-patient-c01", "rec-506", "Mashed Sweet Potatoes", "1 serving", 180, 85, i)
        add_exercise_log("usr-patient-c01", "rout-606", "4-7-8 Deep Breathing Technique", 15, "completed" if i % 2 == 0 else "partial", i)

    # ─── USER D (Critical / Transitioning: usr-patient-d01) ───
    hss_scores_d = []
    for idx in range(30):
        if idx <= 2:
            score = 42 + idx
        elif idx <= 9:
            score = 50 + (idx % 5)
        elif idx <= 20:
            score = 65 + (idx % 10)
        else:
            score = 80 + (idx % 5)
        hss_scores_d.append(score)

    for i in range(30):
        score = hss_scores_d[i]
        add_hss("usr-patient-d01", score, i)
        sys_bp = 144 if i <= 2 else (134 if i <= 9 else (126 if i <= 20 else 118))
        dia_bp = 94 if i <= 2 else (86 if i <= 9 else (82 if i <= 20 else 76))
        hr = 88 if i <= 2 else (80 if i <= 9 else (76 if i <= 20 else 72))
        symptoms = ["chest_tightness", "dizziness"] if i == 2 else []
        sev_map = {"chest_tightness": 4, "dizziness": 3} if i == 2 else {}
        
        triggered_ex_id = None
        if i == 2:
            triggered_ex_id = f"ex-usr-patient-d01-2"
            add_exercise_log("usr-patient-d01", "rout-602", "20-Minute Neighborhood Walk", 5, "incomplete_due_to_symptoms", i)
            exercise_logs[-1]["id"] = triggered_ex_id
            
        add_health_log("usr-patient-d01", sys_bp, dia_bp, hr, symptoms, sev_map, "resting", "Chest tight during walk", i, triggered_by_exercise_id=triggered_ex_id)
        add_sleep_log("usr-patient-d01", 5.5 if i <= 2 else (6.0 if i <= 9 else 7.0), "Poor" if i <= 2 else "Good", i)
        add_meal_log("usr-patient-d01", "rec-508", "Low-Sodium Vegetable Broth", "1 serving", 80, 90, i)
        if i != 2:
            add_exercise_log("usr-patient-d01", "rout-610", "Very Light Chair Stretches", 5, "completed", i)

    # ─── USER E (Sparse: usr-patient-e01) ───
    add_hss("usr-patient-e01", 80, 0)
    add_health_log("usr-patient-e01", 118, 76, 72, [], {}, "resting", "Initial check-in", 0)

    # ─── USER F (High Engagement: usr-patient-f01) ───
    for i in range(30):
        score = 82 + (i % 5)
        add_hss("usr-patient-f01", score, i)
        add_health_log("usr-patient-f01", 116 + (i % 4), 74 + (i % 3), 70 + (i % 5), [], {}, "resting", "Logged morning vitals", i)
        add_sleep_log("usr-patient-f01", 7.5 if i % 3 == 0 else 8.0, "Good", i)
        add_meal_log("usr-patient-f01", "rec-501", "Low Sodium Chicken Tinola", "1 serving", 320, 380, i)
        add_meal_log("usr-patient-f01", "rec-502", "Heart-Healthy Salmon Bowl", "1 serving", 450, 280, i)
        add_exercise_log("usr-patient-f01", "rout-602", "20-Minute Neighborhood Walk", 20, "completed", i)

    # ─── USER G (Improving: usr-patient-g01) ───
    g_scores = [74, 68, 61, 52, 45]
    for idx, score in enumerate(g_scores):
        add_hss("usr-patient-g01", score, idx * 6)
    for i in range(30):
        sys_bp = 142 - int((i / 29) * 22)
        dia_bp = 92 - int((i / 29) * 14)
        hr = 85 - int((i / 29) * 15)
        add_health_log("usr-patient-g01", sys_bp, dia_bp, hr, [], {}, "resting", "Feeling better", i)
        add_sleep_log("usr-patient-g01", 6.0 + (i / 29) * 1.5, "Fair" if i < 15 else "Good", i)
        add_meal_log("usr-patient-g01", "rec-501", "Low Sodium Chicken Tinola", "1 serving", 320, 380, i)
        add_exercise_log("usr-patient-g01", "rout-601", "Basal Paced Breathing Exercise", 10, "completed", i)

    # ─── USER H (Declining: usr-patient-h01) ───
    h_scores = [47, 58, 69, 78, 84]
    for idx, score in enumerate(h_scores):
        add_hss("usr-patient-h01", score, idx * 6)
    for i in range(30):
        sys_bp = 118 + int((i / 29) * 24)
        dia_bp = 76 + int((i / 29) * 14)
        hr = 70 + int((i / 29) * 18)
        symptoms = ["palpitations"] if i < 5 else []
        sev_map = {"palpitations": 3} if i < 5 else {}
        add_health_log("usr-patient-h01", sys_bp, dia_bp, hr, symptoms, sev_map, "resting", "Palpitations logged", i)
        add_sleep_log("usr-patient-h01", 8.0 - (i / 29) * 2.5, "Good" if i > 15 else "Poor", i)
        add_meal_log("usr-patient-h01", "rec-503", "Oatmeal with Berries", "1 serving", 250, 10, i)
        add_exercise_log("usr-patient-h01", "rout-607", "Guided Seated Relaxation", 10, "completed" if i > 15 else "abandoned", i)

    # Expert Calibration Case Evaluations
    def add_evaluation(eval_id, user_id, ml_score, ml_tier, exp_score, exp_tier, status, confidence, reasons=[], exercise_feedback="Looks good", recipe_feedback="Perfect match", notes="Case analysis completed by reviewer."):
        case_id = get_deterministic_case_id(user_id)
        expert_evaluations.append({
            "id": eval_id,
            "user_id": user_id,
            "case_id": case_id,
            "expert_hss_score": exp_score,
            "expert_hss_tier": exp_tier,
            "notes": notes,
            "recommendation_feedback": f"Exercise: {exercise_feedback}. Recipe: {recipe_feedback}.",
            "reviewer_id": "usr-chief-admin-001",
            "reviewer_name": "System Admin",
            "ml_predicted_hss": ml_score,
            "ml_predicted_tier": ml_tier,
            "absolute_error": abs(exp_score - ml_score),
            "tier_agreement": (exp_tier == ml_tier),
            "status": status,
            "model_metadata": {
                "model_identifier": "heartlink_model.pkl",
                "model_hash": "cae564067964b42a2d2c535291208adad579c839427d18c2597c1b747f2e6693",
                "feature_pipeline_version": "transform_to_model_features"
            },
            "input_snapshot": {
                "user_id": user_id,
                "case_id": case_id,
                "age": 55,
                "sex": "male",
                "sleep_hours": 7.0,
                "ever_smoked": False,
                "smoke_now": "Not at all",
                "sodium_frequency": "sometimes",
                "family_history": None,
                "diet_level": "average",
                "fried_food_freq": "sometimes",
                "salty_food_freq": "sometimes",
                "fruit_veg_servings": "2-3",
                "resting_bp_mmhg": "134/86",
                "max_heart_rate_bpm": 88,
                "on_medication": False,
                "diagnosed_conditions": ["prehypertension"],
                "model_features": {
                    "RIDAGEYR": 55.0, "RIAGENDR": 1.0, "PAQ605": 2.0, "PAQ610": None, "PAD615": None,
                    "PAQ620": 2.0, "PAQ625": None, "PAD630": None, "PAQ635": 2.0, "PAQ640": None,
                    "PAD645": None, "PAQ650": 2.0, "PAQ655": None, "PAD660": None, "PAQ665": 2.0,
                    "PAQ670": None, "PAD675": None, "PAD680": 300.0, "SLD012": 7.0, "SMQ020": 2.0,
                    "SMQ040": 3.0, "ALQ111": 1.0, "ALQ121": 1.0, "ALQ130": 1.0, "ALQ142": 0.0,
                    "DR1TKCAL": 1750.0, "DR1TPROT": 72.0, "DR1TCARB": 224.0, "DR1TSUGR": 90.0,
                    "DR1TFIBE": 15.0, "DR1TTFAT": 70.0, "DR1TSFAT": 23.0, "DR1TMFAT": 25.0,
                    "DR1TPFAT": 17.0, "DR1TCHOL": 270.0, "DR1TSODI": 3000.0, "DR1TPOTA": 2400.0
                },
                "ml_predicted_hss": ml_score,
                "ml_predicted_tier": ml_tier
            },
            "review_context": {
                "recent_telemetry": [
                    {
                        "type": "Exercise",
                        "timestamp": (datetime.now() - timedelta(days=1)).isoformat(),
                        "data": {
                            "routine_name": "Basal Paced Breathing Exercise",
                            "duration_minutes": 10,
                            "status": "completed"
                        }
                    }
                ]
            },
            "adjustment_reasons": reasons,
            "reviewer_confidence": confidence,
            "exercise_feedback": exercise_feedback,
            "recipe_feedback": recipe_feedback,
            "created_at": datetime.now() - timedelta(days=1),
            "reviewed_at": datetime.now() - timedelta(days=1),
            "demo_seed": "heartlink-demo-v2"
        })

    add_evaluation("CAL-1002", "usr-patient-102", 72, "Moderate", 73, "Moderate", "Evaluated", "high", ["blood_pressure_pattern"], "Very useful routine.", "Tofu dish was helpful.")
    add_evaluation("CAL-1003", "usr-patient-g01", 66, "Moderate", 57, "Elevated Risk", "Evaluated", "medium", ["symptoms", "sleep_pattern"], "Recommend more breathing exercises.", "Reduce potato intake.")
    add_evaluation("CAL-1004", "usr-patient-h01", 78, "Moderate", 48, "Critical", "Evaluated", "low", ["blood_pressure_pattern", "symptoms"], "Urgent care needed, avoid heavy exercises.", "Liquid diet recommended.")
    add_evaluation("CAL-1001", "usr-patient-d01", 75, "Moderate", 80, "Stable", "Archived", "medium", [], "Stable condition.", "Broth was good.")

    # Admin Activity Seeding
    def add_admin_activity(admin_user_id, name, action, target_type, target_id, target_name):
        admin_activity.append({
            "id": f"act-demo-{action}-{target_id}",
            "admin_user_id": admin_user_id,
            "admin_name": name,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "target_name": target_name,
            "created_at": datetime.now() - timedelta(minutes=15),
            "demo_seed": "heartlink-demo-v2"
        })

    add_admin_activity("usr-chief-admin-001", "System Admin", "created", "recipe", "rec-507", "Garlic Ginger Tofu Stir-Fry")
    add_admin_activity("usr-chief-admin-001", "System Admin", "created", "exercise", "rout-610", "Very Light Chair Stretches")
    add_admin_activity("usr-chief-admin-001", "System Admin", "evaluated", "case", "usr-patient-102", get_deterministic_case_id("usr-patient-102"))
    add_admin_activity("usr-chief-admin-001", "System Admin", "evaluated", "case", "usr-patient-g01", get_deterministic_case_id("usr-patient-g01"))
    add_admin_activity("usr-chief-admin-001", "System Admin", "evaluated", "case", "usr-patient-h01", get_deterministic_case_id("usr-patient-h01"))

    # Alerts & Broadcasts
    alerts.append({
        "id": "alert-demo-d01",
        "user_id": "usr-patient-d01",
        "severity": "Warning",
        "alert_type": "BP Threshold",
        "message": "Systolic limit of 120 exceeded: recorded 144 mmHg",
        "demo_seed": "heartlink-demo-v2"
    })

    system_broadcasts.append({
        "id": "brd-demo-1",
        "title": "Offline Analytics Update — August 20",
        "date": datetime.now().strftime("%b %d, %Y %I:%M %p"),
        "publisher": "usr-chief-admin-001 (System Admin)",
        "display_publisher": "System Admin",
        "message": "Scheduled Maintenance: Offline analytics processing will occur on August 20. The app will remain accessible, but some dashboard metrics may temporarily reflect delayed data.",
        "type": "Maintenance",
        "target_audience": "All Registered Accounts",
        "created_at": datetime.now() - timedelta(hours=2),
        "demo_seed": "heartlink-demo-v2"
    })

    demo_feedbacks = [
        {
            "id": 101,
            "ticketId": "FB-1001",
            "date": (datetime.now() - timedelta(days=1)).strftime("%B %d, %Y"),
            "userId": "usr-patient-a01",
            "category": "Bug Report",
            "preview": "Exercise video does not load...",
            "fullMessage": "The exercise guide image stays blank after opening a routine. The loading indicator spins indefinitely and the play button is unresponsive.",
            "status": "Open",
            "deviceMeta": {
                "os": "Android 14",
                "model": "Samsung Galaxy S21",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 102,
            "ticketId": "FB-1002",
            "date": (datetime.now() - timedelta(days=2)).strftime("%B %d, %Y"),
            "userId": "usr-patient-102",
            "category": "Bug Report",
            "preview": "Weekly wrap-up shows incomplete day...",
            "fullMessage": "The weekly wrap-up is missing one of my logged days. I logged my health parameters on Tuesday, but the summary report shows Tuesday as empty.",
            "status": "In Progress",
            "deviceMeta": {
                "os": "iOS 17.4",
                "model": "iPhone 13 Pro",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "Reproduced on exercise history logs. Investigating timezone offsets in reports module.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 103,
            "ticketId": "FB-1003",
            "date": (datetime.now() - timedelta(days=3)).strftime("%B %d, %Y"),
            "userId": "usr-patient-c01",
            "category": "Bug Report",
            "preview": "Recipe image not loading...",
            "fullMessage": "One recipe card (Garlic Ginger Stir-Fry) shows the fallback placeholder image instead of the recipe photo. The other recipes load fine.",
            "status": "Resolved",
            "deviceMeta": {
                "os": "Android 13",
                "model": "Google Pixel 7",
                "appVersion": "v1.2.3",
            },
            "adminNotes": "Issue confirmed and corrected in the latest content configuration CDN link.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 104,
            "ticketId": "FB-1004",
            "date": (datetime.now() - timedelta(days=4)).strftime("%B %d, %Y"),
            "userId": "usr-patient-d01",
            "category": "UI/UX Suggestion",
            "preview": "Simpler nutrition summary...",
            "fullMessage": "It would be easier to understand sodium and calorie information if the important numbers were emphasized. Right now, all nutrient numbers look identical in font size.",
            "status": "Open",
            "deviceMeta": {
                "os": "iOS 16.5",
                "model": "iPhone 11",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 105,
            "ticketId": "FB-1005",
            "date": (datetime.now() - timedelta(days=5)).strftime("%B %d, %Y"),
            "userId": "usr-patient-e01",
            "category": "UI/UX Suggestion",
            "preview": "Add a clearer exercise completion state...",
            "fullMessage": "I want to immediately know whether I completed today's routine when looking at the home dashboard. A larger checkmark or distinct color would help.",
            "status": "In Progress",
            "deviceMeta": {
                "os": "Android 14",
                "model": "OnePlus 11",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "Assigned to design team to design checkmarks on the circular progress rings.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 106,
            "ticketId": "FB-1006",
            "date": (datetime.now() - timedelta(days=7)).strftime("%B %d, %Y"),
            "userId": "usr-patient-f01",
            "category": "UI/UX Suggestion",
            "preview": "Improve empty-state messaging...",
            "fullMessage": "The empty activity screen could explain what I should do next. Instead of just saying 'No activity logged today', it could prompt me with a shortcut link to routines.",
            "status": "Resolved",
            "deviceMeta": {
                "os": "iOS 17.2",
                "model": "iPhone 14",
                "appVersion": "v1.2.3",
            },
            "adminNotes": "Updated empty states with quick action buttons to log metrics.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 107,
            "ticketId": "FB-1007",
            "date": (datetime.now() - timedelta(days=8)).strftime("%B %d, %Y"),
            "userId": "usr-patient-g01",
            "category": "Account Issue",
            "preview": "Unable to update account information...",
            "fullMessage": "I changed my account information in settings, but the updated details did not appear immediately in the profile page.",
            "status": "Resolved",
            "deviceMeta": {
                "os": "Android 14",
                "model": "Samsung Galaxy S22",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "Identified caching issue on the user profile microservice. Added cache-control headers.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 108,
            "ticketId": "FB-1008",
            "date": (datetime.now() - timedelta(days=10)).strftime("%B %d, %Y"),
            "userId": "usr-patient-h01",
            "category": "Account Issue",
            "preview": "Account access issue...",
            "fullMessage": "I was logged out during a background refresh and had difficulty returning to the app without resetting my credentials.",
            "status": "Archived",
            "deviceMeta": {
                "os": "iOS 17.5",
                "model": "iPhone 15 Pro",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "Resolved previously and archived after confirmation.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 109,
            "ticketId": "FB-1009",
            "date": (datetime.now() - timedelta(days=14)).strftime("%B %d, %Y"),
            "userId": "usr-patient-a01",
            "category": "Question",
            "preview": "How is my HSS calculated?...",
            "fullMessage": "Can you explain what the HeartLink Health Stability Score represents? I see the numeric score fluctuating but don't know what factors drive it.",
            "status": "In Progress",
            "deviceMeta": {
                "os": "Android 13",
                "model": "Google Pixel 6",
                "appVersion": "v1.2.3",
            },
            "adminNotes": "Forwarded to support team. Standard HSS calculation guide will be emailed.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 110,
            "ticketId": "FB-1010",
            "date": (datetime.now() - timedelta(days=16)).strftime("%B %d, %Y"),
            "userId": "usr-patient-102",
            "category": "Question",
            "preview": "When should I log a meal?...",
            "fullMessage": "Should I record meals immediately after eating or later in the day? Does the timing affect the daily sodium limit alerts?",
            "status": "Resolved",
            "deviceMeta": {
                "os": "iOS 17.1",
                "model": "iPhone 12",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "Confirmed in app instructions that meal logging is real-time but can be logged retroactively without affecting alert limits.",
            "demo_seed": "heartlink-feedback-demo-v1",
        },
        {
            "id": 111,
            "ticketId": "FB-1011",
            "date": (datetime.now() - timedelta(days=20)).strftime("%B %d, %Y"),
            "userId": "usr-patient-c01",
            "category": "Question",
            "preview": "Integration with health trackers...",
            "fullMessage": "Does the app sync with Apple Health or Google Fit? I want my daily steps and heart rate to import automatically.",
            "status": "Archived",
            "deviceMeta": {
                "os": "Android 14",
                "model": "Samsung Galaxy Watch 6",
                "appVersion": "v1.2.4",
            },
            "adminNotes": "Informed user that health tracker integrations are planned for Phase 3. Closed and archived.",
            "demo_seed": "heartlink-feedback-demo-v1",
        }
    ]

    for fb in demo_feedbacks:
        prof = next((p for p in profiles if p["id"] == fb["userId"]), None)
        fb["user"] = f"{prof['first_name']} {prof['last_name']}" if prof else "Anonymous User"
        fb["userEmail"] = prof.get("email", "Not Provided") if prof else "Not Provided"
        feedback_tickets.append(fb)

    # 8.7 Seed Admin Notifications
    now_utc = datetime.utcnow()
    demo_admin_notifs = [
        {
            "id": "anotif-seed-001",
            "recipient_roles": ["admin", "super_admin"],
            "type": "feedback",
            "title": "New Feedback Received",
            "message": "FB-1004 (Account Issue) submitted by Robert Villanueva",
            "severity": "warning",
            "read_by": [],
            "route": "/feedbacks",
            "target_id": "FB-1004",
            "created_at": now_utc - timedelta(hours=2),
            "demo_seed": "heartlink-admin-notifications-demo-v1",
        },
        {
            "id": "anotif-seed-002",
            "recipient_roles": ["super_admin"],
            "type": "staff",
            "title": "Staff Account Provisioned",
            "message": "An Authorized Medical Expert account was added.",
            "severity": "info",
            "read_by": ["usr-super-admin-001"],
            "route": "/users",
            "target_id": "usr-expert-001",
            "created_at": now_utc - timedelta(hours=18),
            "demo_seed": "heartlink-admin-notifications-demo-v1",
        },
        {
            "id": "anotif-seed-003",
            "recipient_roles": ["admin", "super_admin"],
            "type": "feedback",
            "title": "Bug Report Submitted",
            "message": "FB-1003 (UI/UX Suggestion) was submitted for review.",
            "severity": "info",
            "read_by": ["usr-super-admin-001", "usr-chief-admin-001"],
            "route": "/feedbacks",
            "target_id": "FB-1003",
            "created_at": now_utc - timedelta(days=2),
            "demo_seed": "heartlink-admin-notifications-demo-v1",
        },
        {
            "id": "anotif-seed-004",
            "recipient_roles": ["admin", "super_admin"],
            "type": "security",
            "title": "Rate Limit Lockout",
            "message": "Multiple failed authentication attempts triggered a temporary lockout.",
            "severity": "warning",
            "read_by": [],
            "route": "/settings",
            "target_id": None,
            "created_at": now_utc - timedelta(days=3),
            "demo_seed": "heartlink-admin-notifications-demo-v1",
        }
    ]
    admin_notifications.extend(demo_admin_notifs)

    # Foreign Key & Core Assertions Validation
    recipe_ids = {r["id"] for r in recipes}
    routine_ids = {e["id"] for e in exercise_routines}
    user_ids = {p["id"] for p in profiles}

    # ID Uniqueness Assertions
    meal_ids = [m["id"] for m in meal_logs]
    assert len(meal_ids) == len(set(meal_ids)), "Integrity violation: duplicate meal IDs found"
    
    ex_ids = [ex["id"] for ex in exercise_logs]
    assert len(ex_ids) == len(set(ex_ids)), "Integrity violation: duplicate exercise IDs found"
    
    prof_ids = [p["id"] for p in profiles]
    assert len(prof_ids) == len(set(prof_ids)), "Integrity violation: duplicate profile IDs found"
    
    hss_ids = [h["id"] for h in hss_history]
    assert len(hss_ids) == len(set(hss_ids)), "Integrity violation: duplicate HSS record IDs found"
    
    eval_ids = [ev["id"] for ev in expert_evaluations]
    assert len(eval_ids) == len(set(eval_ids)), "Integrity violation: duplicate evaluation IDs found"
    
    anotif_ids = [an["id"] for an in admin_notifications]
    assert len(anotif_ids) == len(set(anotif_ids)), "Integrity violation: duplicate admin notification IDs found"
    
    # 1. Meals FK checks
    for m in meal_logs:
        if m.get("demo_seed") == "heartlink-demo-v2" and m.get("recipe_id") and m["recipe_id"] not in recipe_ids:
            raise ValueError(f"Foreign Key violation: meal log {m['id']} references nonexistent recipe {m['recipe_id']}")

    # 2. Exercise Logs FK checks
    for ex in exercise_logs:
        if ex.get("demo_seed") == "heartlink-demo-v2" and ex.get("routine_id") and ex["routine_id"] not in routine_ids:
            raise ValueError(f"Foreign Key violation: exercise log {ex['id']} references nonexistent routine {ex['routine_id']}")

    # 3. Symptoms Triggered By Exercise checks
    exercise_ids = {ex["id"] for ex in exercise_logs}
    for l in daily_health_logs:
        trigger_ex = l.get("triggered_by_exercise_id")
        if l.get("demo_seed") == "heartlink-demo-v2" and trigger_ex and trigger_ex not in exercise_ids:
            raise ValueError(f"Foreign Key violation: health log {l['id']} references nonexistent exercise session {trigger_ex}")

    # 4. HSS History User checks
    for h in hss_history:
        if h.get("demo_seed") == "heartlink-demo-v2" and h["user_id"] not in user_ids:
            raise ValueError(f"Foreign Key violation: HSS record {h['id']} references nonexistent user {h['user_id']}")

    # 5. Evaluations User & Case checks
    for ev in expert_evaluations:
        if ev.get("demo_seed") == "heartlink-demo-v2":
            if ev["user_id"] not in user_ids:
                raise ValueError(f"Foreign Key violation: evaluation {ev['id']} references nonexistent user {ev['user_id']}")
            expected_case_id = get_deterministic_case_id(ev["user_id"])
            if ev["case_id"] != expected_case_id:
                raise ValueError(f"Integrity violation: evaluation {ev['id']} case_id {ev['case_id']} does not match expected {expected_case_id}")

    # 6. Thresholds User checks
    for t in user_thresholds:
        if t.get("demo_seed") == "heartlink-demo-v2" and t["user_id"] not in user_ids:
            raise ValueError(f"Foreign Key violation: threshold {t['id']} references nonexistent user {t['user_id']}")

    # Validate HSS Tiers Coverage
    tiers = {"Stable", "Moderate", "Elevated Risk", "Critical"}
    
    # Check HSS History Tiers
    hss_tiers = {h["tier"] for h in hss_history}
    if not tiers.issubset(hss_tiers):
        raise ValueError(f"Data constraint violation: HSS history is missing coverage for tiers {tiers - hss_tiers}")

    # Check Recipe HSS Tiers
    recipe_tiers = {r["hss_tier"] for r in recipes if r.get("status") == "published"}
    if not tiers.issubset(recipe_tiers):
        raise ValueError(f"Data constraint violation: Published recipes missing coverage for tiers {tiers - recipe_tiers}")

    # Check Exercise Routine HSS Tiers
    routine_tiers = {e["hss_tier"] for e in exercise_routines if e.get("status") == "published"}
    if not tiers.issubset(routine_tiers):
        raise ValueError(f"Data constraint violation: Published exercise routines missing coverage for tiers {tiers - routine_tiers}")

    # Verify score/tier matching
    for h in hss_history:
        score = h["score"]
        tier = h["tier"]
        expected_tier = "Stable" if score >= 80 else ("Moderate" if score >= 60 else ("Elevated Risk" if score >= 50 else "Critical"))
        if tier != expected_tier:
            raise ValueError(f"Data constraint violation: HSS record {h['id']} has score {score} but mismatched tier {tier}")

    # No deprecated tier names
    deprecated_names = {"Caution", "At Risk", "Needs Attention"}
    for h in hss_history:
        if h["tier"] in deprecated_names:
            raise ValueError(f"Data constraint violation: HSS record {h['id']} uses deprecated tier {h['tier']}")

    # Save to authoritative JSON files on disk
    save_profiles()
    save_logs()
    print("Deterministically seeded HeartLink rich demo dataset successfully.")

# Run seeding at load-time
seed_rich_demo_data()

