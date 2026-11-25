"""
HL-054: the rules for case review.

HL-168 (panel revision, 2026-11-24): case review is only a weekly random sample that experts check and the Cardiologist
approves for the dataset. Nobody monitors users, so the urgent and re-review lanes (and their 48-hour target) were
removed. EMERGENCY_SPO2_MAX and FAINTED_SYMPTOM stay: the app's own emergency checks use them.
"""

# The habits-style levels older reviews used (before HL-153)
TIERS = ("Stable", "Moderate", "Elevated Risk", "Critical")

# HL-153: what the Cardiologist judges and Model Check compares: the Heart risk band (AHA PREVENT, 2026 ACC/AHA bands:
# low under 3%, borderline 3-4.9%, intermediate 5-9.9%, high 10% or more), lowest first
RISK_BANDS = ("low", "borderline", "intermediate", "high")

# Used by the app's emergency checks (family alerts, the dashboard), not by case review.
# HL-166 (panel revision): blood oxygen of 88% or lower is an emergency in the app. 2026-11-25: matches MedlinePlus (NIH)
# and Cleveland Clinic ("seek immediate medical attention" at 88% or lower); pending the cardiologist's confirmation
EMERGENCY_SPO2_MAX = 88
FAINTED_SYMPTOM = "Fainted or Nearly Fainted"

# Sample lane (drawn by an admin, at most once a week is the intent). HL-153: per Heart risk band
SAMPLE_PER_TIER = 5
SAMPLE_COOLDOWN_DAYS = 30

# HL-168: the steps a case goes through after it is picked. "done" = approved, left out, or a practice review.
STAGES = ("check", "approve", "done")
