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


# Unified Onboarding Baseline
class BaselineOnboardingRequest(BaseModel):
    # Physical Activity
    vigorous_activity: bool
    vigorous_days: Optional[int] = None
    vigorous_minutes: Optional[int] = None
    moderate_activity: bool
    moderate_days: Optional[int] = None
    moderate_minutes: Optional[int] = None
    walk_bike_transport: bool
    walk_bike_days: Optional[int] = None
    walk_bike_minutes: Optional[int] = None
    sedentary_hours: str
    
    # Sleep & Smoking
    sleep_hours: float
    ever_smoked: bool
    smoke_now: Optional[str] = None
    
    # Alcohol
    ever_drank: bool
    drink_frequency: Optional[str] = None
    drinks_per_occasion: Optional[str] = None
    binge_drinking_freq: Optional[str] = None
    
    # Diet Habits
    diet_level: str
    fried_food_freq: str
    salty_food_freq: str
    fruit_veg_servings: str
    
    # Health Background (Non-ML features)
    allergies: List[str] = []
    dietary_practice: str = "None"


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
