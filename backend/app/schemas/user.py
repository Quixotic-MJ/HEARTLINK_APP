from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Literal
from datetime import date


# Profile update (onboarding step 1)
class ProfileUpdate(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: date
    sex: Literal["male", "female"]
    height_cm: float = Field(..., ge=50.0, le=300.0)
    weight_kg: float = Field(..., ge=20.0, le=400.0)
    health_goals: List[str] = []


# Unified Onboarding Baseline
class BaselineOnboardingRequest(BaseModel):
    # Physical Activity
    vigorous_activity: bool
    vigorous_days: Optional[int] = Field(None, ge=1, le=7)
    vigorous_minutes: Optional[int] = Field(None, ge=1, le=720)
    moderate_activity: bool
    moderate_days: Optional[int] = Field(None, ge=1, le=7)
    moderate_minutes: Optional[int] = Field(None, ge=1, le=720)
    walk_bike_transport: bool
    walk_bike_days: Optional[int] = Field(None, ge=1, le=7)
    walk_bike_minutes: Optional[int] = Field(None, ge=1, le=720)
    sedentary_hours: Literal["<2h", "2-4h", "4-6h", "6-8h", "8+h"]
    
    # Sleep & Smoking
    sleep_hours: float = Field(..., ge=1.0, le=24.0)
    ever_smoked: bool
    smoke_now: Optional[Literal["Every day", "Some days", "Not at all"]] = None
    
    # Alcohol
    ever_drank: bool
    drink_frequency: Optional[Literal["Never", "Monthly or less", "2-4x/month", "2-3x/week", "4+/week"]] = None
    drinks_per_occasion: Optional[Literal["1-2", "3-4", "5+"]] = None
    binge_drinking_freq: Optional[Literal["Never", "Monthly or less", "2-4x/month", "2-3x/week", "4+/week"]] = None
    
    # Diet Habits
    diet_level: Literal["light", "average", "heavy", "very_heavy"]
    fried_food_freq: Literal["rarely", "sometimes", "often", "daily"]
    salty_food_freq: Literal["rarely", "sometimes", "often", "daily"]
    fruit_veg_servings: Literal["0-1", "2-3", "4-5", "6+"]
    
    # Health Background (Non-ML features)
    allergies: List[str] = []
    dietary_practice: str = "None"

    @model_validator(mode="after")
    def validate_conditional_fields(self):
        if self.vigorous_activity:
            if self.vigorous_days is None or self.vigorous_minutes is None:
                raise ValueError("vigorous_days and vigorous_minutes are required when vigorous_activity is true")
        if self.moderate_activity:
            if self.moderate_days is None or self.moderate_minutes is None:
                raise ValueError("moderate_days and moderate_minutes are required when moderate_activity is true")
        if self.walk_bike_transport:
            if self.walk_bike_days is None or self.walk_bike_minutes is None:
                raise ValueError("walk_bike_days and walk_bike_minutes are required when walk_bike_transport is true")
        if self.ever_smoked:
            if not self.smoke_now:
                raise ValueError("smoke_now is required when ever_smoked is true")
        if self.ever_drank:
            if not self.drink_frequency:
                raise ValueError("drink_frequency is required when ever_drank is true")
            if self.drink_frequency != "Never":
                if not self.drinks_per_occasion or not self.binge_drinking_freq:
                    raise ValueError("drinks_per_occasion and binge_drinking_freq are required when drinking frequency is not Never")
        return self


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
