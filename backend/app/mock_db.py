# backend/app/utils/mock_db.py
from datetime import datetime, date

# 1. Identity & Profile Layer (Merged with local auth fields for easy tracking)
profiles = [
    {
        "id": "usr-patient-101",
        "phone": "+639123456788",
        "email": "test@gmail.com",
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
        "phone": "+639111111111",
        "email": "pedro@example.com",
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
        "password": "0015091a134a413d72b22ec6f62b7ff95fc572f44706346bc3e2b243be1071da",
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
baseline_lifestyle = [
    {
        "id": "life-101",
        "user_id": "usr-patient-101",
        "smoking_status": "never",
        "avg_sleep_hours": 7,
        "family_history": True,
        "created_at": datetime(2026, 6, 25, 8, 10, 0),
        "updated_at": datetime(2026, 6, 25, 8, 10, 0),
    }
]

baseline_dietary = [
    {
        "id": "diet-101",
        "user_id": "usr-patient-101",
        "sodium_frequency": "occasionally",
        "allergies": ["peanuts"],
        "dietary_practice": "Standard Filipino",
        "created_at": datetime(2026, 6, 25, 8, 15, 0),
        "updated_at": datetime(2026, 6, 25, 8, 15, 0),
    }
]

baseline_clinical = [
    {
        "id": "clin-101",
        "user_id": "usr-patient-101",
        "diagnosed_conditions": ["prehypertension"],
        "on_medication": False,
        "resting_bp_mmhg": 122,
        "max_heart_rate_bpm": 185,
        "fasting_blood_sugar": 0,  # Binary dataset code mapping
        "serum_cholesterol": 195,
        "chest_pain_type": 1,
        "exercise_angina": 0,
        "created_at": datetime(2026, 6, 25, 8, 20, 0),
        "updated_at": datetime(2026, 6, 25, 8, 20, 0),
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
        "image_url": "https://storage.provider/tinola.jpg",
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

# 6. Medical Evaluation & Predictive Logic Layers
css_history = [
    {
        "id": "css-701",
        "user_id": "usr-patient-101",
        "score": 85,
        "tier": "Stable",  # Core Tiering System matching
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 5, 20, 10, 0),
    },
    {
        "id": "css-702",
        "user_id": "usr-patient-101",
        "score": 82,
        "tier": "Moderate",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 6, 20, 10, 0),
    },
    {
        "id": "css-703",
        "user_id": "usr-patient-101",
        "score": 88,
        "tier": "Stable",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 7, 20, 10, 0),
    },
    {
        "id": "css-704",
        "user_id": "usr-patient-101",
        "score": 90,
        "tier": "Stable",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 8, 20, 10, 0),
    },
    {
        "id": "css-705",
        "user_id": "usr-patient-101",
        "score": 78,
        "tier": "Moderate",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 9, 20, 10, 0),
    },
    {
        "id": "css-706",
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
        "flagged_css": 52,
        "patient_snapshot": {
            "age": 20,
            "sex": "male",
            "conditions": ["prehypertension"],
            "vitals": {"systolic": 134, "diastolic": 86},
        },
        "created_at": datetime(2026, 7, 10, 13, 20, 0),
    }
]

case_evaluations = [
    {
        "id": "eval-001",
        "alert_id": "alert-801",
        "reviewer_id": "usr-expert-201",
        "algorithm_accuracy": 4,  # 1-5 validation parameter
        "was_alert_appropriate": True,
        "clinical_notes": "Patient experienced physiological symptoms concurrent with blood pressure elevation post-sodium intake.",
        "suggested_adjustment": "Increase weighting metrics for acute threshold deviation changes by 5%",
        "verdict": "Agree with System",
        "anonymized_features": {
            "age": 20,
            "sex": "male",
            "conditions": ["prehypertension"],
        },
        "reviewer_css_override": None,
        "applied_to_model": False,
        "reviewed_at": datetime(2026, 7, 10, 15, 45, 0),
    }
]

# 7. Global Content Library Data (Core Recommendations Asset)
recipes = [
    {
        "id": "rec-501",
        "name": "Low Sodium Chicken Tinola",
        "subtitle": "Traditional Filipino ginger broth soup tuned for heart health optimization",
        "category": "Lunch",
        "css_tier": "Stable",
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
        "image_url": "https://storage.provider/tinola.jpg",
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
        "css_tier": "Stable",
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
        "image_url": "https://storage.provider/salmon.jpg",
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
        "css_tier": "Stable",
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
        "image_url": "https://storage.provider/oatmeal.jpg",
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
        "css_tier": "Stable",
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
        "css_tier": "Caution",
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
        "image_url": "https://storage.provider/steamed_fish.jpg",
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
        "css_tier": "Caution",
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
        "image_url": "https://storage.provider/sweet_potatoes.jpg",
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
        "css_tier": "Stable",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Downregulate sympathetic nervous activation tracking matrices",
        "steps": [
            "Sit comfortably in upright position.",
            "Inhale smoothly through nostrils for 4 seconds.",
            "Hold basal volume for 2 seconds.",
            "Exhale silently through mouth for 6 seconds.",
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
        "css_tier": "Stable",
        "type": "Light Cardio",
        "intensity": "Low",
        "goal": "Improves blood circulation and builds gentle endurance.",
        "steps": [
            "Warm up with light stretching for 2 minutes.",
            "Walk at a comfortable, conversational pace.",
            "Cool down with a slower pace for the last 3 minutes.",
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
        "css_tier": "Stable",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Enhances flexibility without straining the heart.",
        "steps": [
            "Reach arms overhead and hold for 15 seconds.",
            "Gently rotate shoulders backward 10 times.",
            "Perform side bends holding 10 seconds each side.",
        ],
        "media_url": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
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
        "css_tier": "Moderate",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Maintains mobility while keeping heart rate stable.",
        "steps": [
            "Sit comfortably in a chair.",
            "Perform seated cat-cow stretches.",
            "Gently twist torso to each side.",
        ],
        "media_url": "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
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
        "css_tier": "Moderate",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Promotes lower body circulation passively.",
        "steps": [
            "Sit with feet flat on the floor.",
            "Slowly extend one leg straight out.",
            "Hold for 3 seconds, then lower.",
            "Repeat for the other leg."
        ],
        "media_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
        "video_url": "https://www.youtube.com/watch?v=5WEBMhRc_9M",
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
        "css_tier": "Elevated Risk",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Reduces stress-induced heart rate spikes and calms nervous system.",
        "steps": [
            "Inhale through nose for 4 seconds.",
            "Hold breath for 7 seconds.",
            "Exhale forcefully through mouth for 8 seconds.",
            "Repeat cycle 4 times."
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
        "css_tier": "Elevated Risk",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Lowers blood pressure and induces resting state.",
        "steps": [
            "Close eyes and focus on natural breathing.",
            "Progressively relax muscles from head to toe.",
            "Remain still and observe thoughts without engaging."
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
        "css_tier": "Caution",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Maintains basic lower extremity circulation.",
        "steps": [
            "Sit comfortably with feet flat on the floor.",
            "Lift your heels while keeping your toes on the floor, then lower.",
            "Lift your toes while keeping your heels on the floor, then lower.",
            "Repeat for 5 minutes continuously."
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
        "css_tier": "Caution",
        "type": "Breathing",
        "intensity": "None",
        "goal": "Activates the parasympathetic nervous system to lower heart rate.",
        "steps": [
            "Lie flat on your back with a pillow under your knees.",
            "Place one hand on your upper chest and the other just below your rib cage.",
            "Breathe in slowly through your nose so that your stomach moves out against your hand.",
            "Tighten your stomach muscles, letting them fall inward as you exhale through pursed lips."
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

feedback_tickets = []
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
            "baseline_lifestyle": [_serialize_item(l) for l in baseline_lifestyle],
            "baseline_dietary": [_serialize_item(d) for d in baseline_dietary],
            "baseline_clinical": [_serialize_item(c) for c in baseline_clinical],
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
    global profiles, baseline_lifestyle, baseline_dietary, baseline_clinical, user_thresholds
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
                    if "baseline_lifestyle" in data:
                        baseline_lifestyle.clear()
                        baseline_lifestyle.extend([_deserialize_item(l) for l in data["baseline_lifestyle"]])
                    if "baseline_dietary" in data:
                        baseline_dietary.clear()
                        baseline_dietary.extend([_deserialize_item(d) for d in data["baseline_dietary"]])
                    if "baseline_clinical" in data:
                        baseline_clinical.clear()
                        baseline_clinical.extend([_deserialize_item(c) for c in data["baseline_clinical"]])
                    if "user_thresholds" in data:
                        user_thresholds.clear()
                        user_thresholds.extend([_deserialize_item(t) for t in data["user_thresholds"]])
        except Exception as e:
            print(f"Error loading mock profiles: {e}")
    else:
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
            "css_history": [_serialize_item(c) for c in css_history],
            "notifications": [_serialize_item(n) for n in notifications],
            "alerts": [_serialize_item(a) for a in alerts],
            "saved_recipes": [_serialize_item(r) for r in saved_recipes],
            "saved_exercises": [_serialize_item(e) for e in saved_exercises]
        }
        with open(LOGS_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving mock logs: {e}")

def load_logs():
    global meal_logs, exercise_logs, daily_health_logs, css_history, notifications, alerts, saved_recipes, saved_exercises
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
                if "css_history" in data:
                    css_history.clear()
                    css_history.extend([_deserialize_item(c) for c in data["css_history"]])
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
        except Exception as e:
            print(f"Error loading mock logs: {e}")
    else:
        save_logs()

load_profiles()
load_temp_profiles()
load_logs()

