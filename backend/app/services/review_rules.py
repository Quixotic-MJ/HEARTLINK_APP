"""
HL-054: the rules that put a patient in the case review queue.

PROPOSED values from the Case Review & Model Check design (2026-10-14), pending confirmation by the
cardiologist. Change them here only. The blood-pressure and symptom triggers match the mobile app's
emergency check in HeartLink-mobile/app/(home)/(health)/log-symptoms.tsx, so both should change together.
"""

TIERS = ("Stable", "Moderate", "Elevated Risk", "Critical")

# Urgent lane
URGENT_TIERS = ("Critical",)
CRISIS_SYSTOLIC = 180
CRISIS_DIASTOLIC = 120
LOW_SYSTOLIC = 90
LOW_DIASTOLIC = 60
SYMPTOM_WINDOW_DAYS = 7
CHEST_SYMPTOM = "Chest Discomfort / Tightness"
CHEST_SEVERITY_AT_LEAST = 7
BREATH_SYMPTOM = "Shortness of Breath"
BREATH_URGENT_CONTEXTS = ("resting",)
URGENT_REVIEW_HOURS = 48

# Sample lane (drawn by an admin, at most once a week is the intent)
SAMPLE_PER_TIER = 5
SAMPLE_COOLDOWN_DAYS = 30

# Queue order: urgent first, then re-reviews, then the sample; oldest first within a lane
LANE_ORDER = {"urgent": 0, "rereview": 1, "sample": 2}
