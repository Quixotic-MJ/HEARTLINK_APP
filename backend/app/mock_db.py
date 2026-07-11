# backend/app/utils/mock_db.py
from datetime import datetime, date

# 1. Identity & Profile Layer (Merged with local auth fields for easy tracking)
profiles = [
    {
        "id": "usr-patient-101",
        "phone": "+639123456789",
        "email": "john.mark@example.com",
        "password": "password123",
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
        "password": "password456",
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
        "password": "securepass456",
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
        "computed_at": datetime(2026, 7, 9, 20, 10, 0),
    },
    {
        "id": "css-702",
        "user_id": "usr-patient-101",
        "score": 52,  # Drops after high BP/symptom log input
        "tier": "Caution",
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
