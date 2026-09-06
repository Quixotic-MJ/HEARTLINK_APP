from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Literal, Any
from datetime import date
import re


# Profile update (onboarding step 1)
class ProfileUpdate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: date
    sex: Literal["male", "female"]
    height_cm: float = Field(..., ge=50.0, le=300.0)
    weight_kg: float = Field(..., ge=20.0, le=400.0)
    health_goals: List[str] = []

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("first_name cannot be empty or whitespace only")
        return v.strip()


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

    @model_validator(mode="before")
    @classmethod
    def sanitize_conditional_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Clean physical activity when false or falsy/zero
            if not data.get("vigorous_activity"):
                data["vigorous_days"] = None
                data["vigorous_minutes"] = None
            if not data.get("moderate_activity"):
                data["moderate_days"] = None
                data["moderate_minutes"] = None
            if not data.get("walk_bike_transport"):
                data["walk_bike_days"] = None
                data["walk_bike_minutes"] = None
            # Clean smoking when false
            if not data.get("ever_smoked"):
                data["smoke_now"] = None
            # Clean drinking
            if not data.get("ever_drank") or data.get("drink_frequency") == "Never":
                data["drinks_per_occasion"] = None
                data["binge_drinking_freq"] = None
            elif str(data.get("drinks_per_occasion", "")).strip() in ("0", ""):
                data["drinks_per_occasion"] = None
        return data

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
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("new_password cannot be empty or whitespace only")
        if len(v) < 6:
            raise ValueError("new_password must be at least 6 characters")
        return v


# Delete Account
class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=1)


# Reminders
class ReminderItem(BaseModel):
    enabled: bool
    time: str = Field(..., pattern=r"^([01]\d|2[0-3]):([0-5]\d)$")


class RemindersUpdateRequest(BaseModel):
    morning: ReminderItem
    evening: ReminderItem
    activity: ReminderItem


# Care Team
class CareTeamContactRequest(BaseModel):
    name: str = Field(..., min_length=1)
    role_title: str = Field(..., min_length=1)
    contact_type: Literal["doctor", "emergency"] = "doctor"
    phone: str = Field(..., min_length=1)


# Health Thresholds
class ThresholdsUpdateRequest(BaseModel):
    sodium_limit_mg: int = Field(..., ge=500, le=5000)
    fluid_limit_ml: Optional[int] = Field(default=2000, ge=500, le=5000)
    active_minutes_goal: int = Field(..., ge=0, le=300)
    systolic_threshold: int = Field(..., ge=80, le=200)
    diastolic_threshold: int = Field(..., ge=40, le=130)

    @model_validator(mode="after")
    def validate_blood_pressure_thresholds(self):
        if self.systolic_threshold <= self.diastolic_threshold:
            raise ValueError("systolic_threshold must be strictly greater than diastolic_threshold")
        if (self.systolic_threshold - self.diastolic_threshold) < 15:
            raise ValueError("Pulse pressure threshold (systolic - diastolic) must be at least 15 mmHg")
        return self


