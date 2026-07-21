# backend/app/utils/mock_db.py
from datetime import datetime, date

# 1. Identity & Profile Layer (Merged with local auth fields for easy tracking)
profiles = [
    {
        "id": "usr-patient-101",
        "phone": "+639123456788",
        "email": "test@gmail.com",
        "password": "Password123",
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
        "password": "Password456",
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
        "password": "Securepass456",
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
        "active_minutes_goal": 30,
        "systolic_threshold": 120,  # Borderline metric constraint limit
        "diastolic_threshold": 80,
        "updated_at": datetime(2026, 6, 25, 8, 25, 0),
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
        "tier": "Monitor Closely",
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
        "tier": "Monitor Closely",
        "contributing_factors": {"sleep_impact": "optimal", "bp_variance": "low"},
        "computed_at": datetime(2026, 7, 9, 20, 10, 0),
    },
    {
        "id": "css-706",
        "user_id": "usr-patient-101",
        "score": 72,  # Drops after high BP/symptom log input
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
        "ingredients": {
            "chicken_breast_g": 500,
            "ginger_slices": 5,
            "chayote_units": 2,
            "water_ml": 1000,
        },
        "steps": [
            "Sauté ginger and onion in light olive oil.",
            "Add chicken until browned.",
            "Pour in water, boil until tender.",
            "Add chayote and chili leaves, simmer 5 minutes.",
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
        "ingredients": {
            "salmon_fillet_g": 300,
            "quinoa_cup": 1,
            "broccoli_florets_cup": 2,
        },
        "steps": [
            "Bake salmon at 400F for 12-15 minutes.",
            "Cook quinoa according to package instructions.",
            "Steam broccoli until tender-crisp.",
            "Assemble bowl and drizzle with lemon dressing.",
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
        "ingredients": {
            "rolled_oats_cup": 0.5,
            "mixed_berries_cup": 0.5,
            "almond_milk_cup": 1,
        },
        "steps": [
            "Simmer oats and milk for 5-7 minutes.",
            "Top with fresh berries and a pinch of cinnamon.",
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
        "ingredients": {
            "bangus_whole": 1,
            "garlic_cloves": 4,
            "calamansi_juice_tbsp": 2,
            "olive_oil_tbsp": 1
        },
        "steps": [
            "Butterfly the bangus and remove the bones. Rinse and pat dry.",
            "Combine garlic, calamansi juice, olive oil, salt, and pepper. Marinate for 15 mins.",
            "Grill bangus skin-side down for 5 mins, then flip.",
            "Serve with fresh salsa."
        ],
        "image_url": "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 12, 10, 0, 0),
    },
    {
        "id": "rec-505",
        "name": "Malunggay & Corn Soup",
        "subtitle": "Nutrient-packed Filipino moringa soup",
        "category": "Dinner",
        "css_tier": "Stable",
        "sodium_mg": 65,
        "calories": 120,
        "saturated_fat_g": 1.0,
        "cholesterol_mg": 0,
        "fiber_g": 6,
        "prep_time_minutes": 20,
        "servings": 4,
        "difficulty": "Easy",
        "heart_benefit": "Malunggay is packed with antioxidants and essential nutrients that help reduce inflammation and lower blood pressure.",
        "tags": ["Low Sodium", "High Fiber", "Filipino"],
        "ingredients": {
            "malunggay_leaves_cup": 2,
            "sweet_corn_ears": 2,
            "chicken_broth_cup": 4,
            "ginger_thumb": 1
        },
        "steps": [
            "Bring low-sodium chicken broth to a boil. Add ginger and onion.",
            "Add corn rounds and simmer for 8 minutes.",
            "Season with low-sodium fish sauce.",
            "Add malunggay leaves in the last 2 minutes of cooking."
        ],
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 15, 10, 0, 0),
    },
    {
        "id": "rec-506",
        "name": "Ensaladang Talong",
        "subtitle": "Smoky grilled eggplant with tomato vinaigrette",
        "category": "Lunch",
        "css_tier": "Stable",
        "sodium_mg": 45,
        "calories": 90,
        "saturated_fat_g": 0.0,
        "cholesterol_mg": 0,
        "fiber_g": 7,
        "prep_time_minutes": 15,
        "servings": 2,
        "difficulty": "Easy",
        "heart_benefit": "Eggplants contain flavonoids like anthocyanins, which are proven to improve heart health and lower the risk of heart disease.",
        "tags": ["Low Sodium", "High Fiber", "Filipino"],
        "ingredients": {
            "eggplants_large": 2,
            "tomatoes_medium": 2,
            "red_onion_small": 1,
            "cane_vinegar_tbsp": 2
        },
        "steps": [
            "Grill whole eggplants until charred and soft.",
            "Peel off the skin and flatten with a fork.",
            "Combine diced tomatoes, red onion, vinegar, and olive oil.",
            "Spoon mixture over eggplant and serve."
        ],
        "image_url": "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=400&h=300&fit=crop",
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 18, 10, 0, 0),
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
        "media_url": "https://storage.provider/breathing_audio.mp3",
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
        "media_url": None,
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
        "media_url": None,
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
        "css_tier": "Monitor Closely",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Maintains mobility while keeping heart rate stable.",
        "steps": [
            "Sit comfortably in a chair.",
            "Perform seated cat-cow stretches.",
            "Gently twist torso to each side.",
        ],
        "media_url": None,
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
        "css_tier": "Monitor Closely",
        "type": "Stationary",
        "intensity": "Low",
        "goal": "Promotes lower body circulation passively.",
        "steps": [
            "Sit with feet flat on the floor.",
            "Slowly extend one leg straight out.",
            "Hold for 3 seconds, then lower.",
            "Repeat for the other leg."
        ],
        "media_url": None,
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
        "media_url": "https://youtu.be/Mn4kUw5uXQU?si=y76GOoEw1jHPtyL1",
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
        "media_url": None,
        "status": "published",
        "expert_validated": True,
        "created_by": "usr-admin-002",
        "created_at": datetime(2026, 6, 15, 9, 0, 0),
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
