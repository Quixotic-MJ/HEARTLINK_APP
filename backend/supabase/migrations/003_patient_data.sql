-- backend/supabase/migrations/003_patient_data.sql
-- Patient Baseline, User Thresholds, Reminders & Care Team Contacts

-- 1. Baseline Onboarding Questionnaire (1:1 with profiles)
CREATE TABLE IF NOT EXISTS public.baseline_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vigorous_activity BOOLEAN NOT NULL DEFAULT false,
    vigorous_days INT CHECK (vigorous_days IS NULL OR (vigorous_days >= 1 AND vigorous_days <= 7)),
    vigorous_minutes INT CHECK (vigorous_minutes IS NULL OR (vigorous_minutes >= 1 AND vigorous_minutes <= 720)),
    moderate_activity BOOLEAN NOT NULL DEFAULT false,
    moderate_days INT CHECK (moderate_days IS NULL OR (moderate_days >= 1 AND moderate_days <= 7)),
    moderate_minutes INT CHECK (moderate_minutes IS NULL OR (moderate_minutes >= 1 AND moderate_minutes <= 720)),
    walk_bike_transport BOOLEAN NOT NULL DEFAULT false,
    walk_bike_days INT CHECK (walk_bike_days IS NULL OR (walk_bike_days >= 1 AND walk_bike_days <= 7)),
    walk_bike_minutes INT CHECK (walk_bike_minutes IS NULL OR (walk_bike_minutes >= 1 AND walk_bike_minutes <= 720)),
    sedentary_hours TEXT NOT NULL CHECK (sedentary_hours IN ('<2h', '2-4h', '4-6h', '6-8h', '8+h')),
    sleep_hours NUMERIC NOT NULL CHECK (sleep_hours >= 1.0 AND sleep_hours <= 24.0),
    ever_smoked BOOLEAN NOT NULL DEFAULT false,
    smoke_now TEXT CHECK (smoke_now IS NULL OR smoke_now IN ('Every day', 'Some days', 'Not at all')),
    ever_drank BOOLEAN NOT NULL DEFAULT false,
    drink_frequency TEXT CHECK (drink_frequency IS NULL OR drink_frequency IN ('Never', 'Monthly or less', '2-4x/month', '2-3x/week', '4+/week')),
    drinks_per_occasion TEXT CHECK (drinks_per_occasion IS NULL OR drinks_per_occasion IN ('1-2', '3-4', '5+')),
    binge_drinking_freq TEXT CHECK (binge_drinking_freq IS NULL OR binge_drinking_freq IN ('Never', 'Monthly or less', '2-4x/month', '2-3x/week', '4+/week')),
    diet_level TEXT NOT NULL CHECK (diet_level IN ('light', 'average', 'heavy', 'very_heavy')),
    fried_food_freq TEXT NOT NULL CHECK (fried_food_freq IN ('rarely', 'sometimes', 'often', 'daily')),
    salty_food_freq TEXT NOT NULL CHECK (salty_food_freq IN ('rarely', 'sometimes', 'often', 'daily')),
    fruit_veg_servings TEXT NOT NULL CHECK (fruit_veg_servings IN ('0-1', '2-3', '4-5', '6+')),
    allergies TEXT[] DEFAULT '{}',
    dietary_practice TEXT DEFAULT 'None',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Thresholds Configuration (1:1 with profiles)
CREATE TABLE IF NOT EXISTS public.user_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sodium_limit_mg INT NOT NULL CHECK (sodium_limit_mg >= 500 AND sodium_limit_mg <= 5000),
    fluid_limit_ml INT DEFAULT 2000 CHECK (fluid_limit_ml IS NULL OR (fluid_limit_ml >= 500 AND fluid_limit_ml <= 5000)),
    active_minutes_goal INT NOT NULL CHECK (active_minutes_goal >= 0 AND active_minutes_goal <= 300),
    systolic_threshold INT NOT NULL CHECK (systolic_threshold >= 80 AND systolic_threshold <= 200),
    diastolic_threshold INT NOT NULL CHECK (diastolic_threshold >= 40 AND diastolic_threshold <= 130),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. User Reminders Configuration (1:1 with profiles)
CREATE TABLE IF NOT EXISTS public.user_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    morning JSONB NOT NULL DEFAULT '{"enabled": true, "time": "08:00"}'::jsonb,
    evening JSONB NOT NULL DEFAULT '{"enabled": false, "time": "20:00"}'::jsonb,
    activity JSONB NOT NULL DEFAULT '{"enabled": false, "time": "17:00"}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Care Team Contacts (1:N with profiles)
CREATE TABLE IF NOT EXISTS public.care_team_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    contact_type TEXT NOT NULL DEFAULT 'doctor' CHECK (contact_type IN ('doctor', 'emergency')),
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.baseline_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_team_contacts ENABLE ROW LEVEL SECURITY;
