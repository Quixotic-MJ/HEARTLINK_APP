from pydantic import BaseModel
from typing import Optional, List
from datetime import date


# Profile update (onboarding step 1)
class ProfileUpdate(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: date
    sex: str
    height_cm: float
    weight_kg: float
    health_goals: List[str] = []


# Baseline lifestyle (onboarding step 2)
class BaselineLifestyleRequest(BaseModel):
    smoking_status: str
    avg_sleep_hours: int
    family_history: bool


# Baseline dietary (onboarding step 3)
class BaselineDietaryRequest(BaseModel):
    sodium_frequency: str
    allergies: List[str] = []
    dietary_practice: str


# Baseline clinical (onboarding step 4 - final)
class BaselineClinicalRequest(BaseModel):
    diagnosed_conditions: List[str] = []
    on_medication: bool
    resting_bp_mmhg: Optional[int] = None
    max_heart_rate_bpm: Optional[int] = None
    fasting_blood_sugar: Optional[int] = None
    serum_cholesterol: Optional[int] = None
    chest_pain_type: Optional[int] = None
    exercise_angina: Optional[int] = None


# Change Password
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Reminders
class ReminderItem(BaseModel):
    enabled: bool
    time: str

class RemindersUpdateRequest(BaseModel):
    morning: ReminderItem
    evening: ReminderItem
    activity: ReminderItem

# Care Team
class CareTeamContactRequest(BaseModel):
    name: str
    role_title: str
    contact_type: str
    phone: str
