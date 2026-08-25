-- backend/supabase/migrations/005_health_tracking.sql
-- Health Telemetry Tables (Daily Vitals, Meals, Exercises, Sleep, HSS History, Alerts)

-- 1. Daily Health Logs (Vitals, BP, Symptoms)
CREATE TABLE IF NOT EXISTS public.daily_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    systolic_bp INT NOT NULL CHECK (systolic_bp >= 50 AND systolic_bp <= 300),
    diastolic_bp INT NOT NULL CHECK (diastolic_bp >= 30 AND diastolic_bp <= 200),
    heart_rate_bpm INT NOT NULL CHECK (heart_rate_bpm >= 30 AND heart_rate_bpm <= 250),
    weight_kg NUMERIC CHECK (weight_kg IS NULL OR (weight_kg >= 20.0 AND weight_kg <= 400.0)),
    blood_sugar NUMERIC CHECK (blood_sugar IS NULL OR (blood_sugar >= 20.0 AND blood_sugar <= 1000.0)),
    medication_taken BOOLEAN NOT NULL DEFAULT false,
    symptoms TEXT[] DEFAULT '{}',
    severity_map JSONB DEFAULT '{}'::jsonb,
    context TEXT CHECK (context IS NULL OR context IN ('resting', 'after_eating', 'after_exercise', 'morning', 'evening', 'other')),
    notes TEXT,
    triggered_by_exercise_id UUID,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Meal Logs (Dietary Tracking)
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
    meal_name TEXT NOT NULL,
    barcode TEXT,
    portion TEXT DEFAULT '1 serving',
    calories NUMERIC NOT NULL CHECK (calories >= 0),
    sodium_mg NUMERIC NOT NULL CHECK (sodium_mg >= 0),
    saturated_fat_g NUMERIC NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0),
    fiber_g NUMERIC NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
    image_url TEXT DEFAULT '',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Exercise Logs (Physical Activity Tracking)
CREATE TABLE IF NOT EXISTS public.exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES public.exercise_routines(id) ON DELETE SET NULL,
    routine_name TEXT NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 1440),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'skipped')),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Sleep Logs
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    duration_hours NUMERIC NOT NULL CHECK (duration_hours >= 0.5 AND duration_hours <= 24.0),
    quality TEXT NOT NULL CHECK (quality IN ('Poor', 'Fair', 'Good', 'Excellent')),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. HeartLink Stability Score (HSS) History
CREATE TABLE IF NOT EXISTS public.hss_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 1 AND score <= 100),
    tier TEXT NOT NULL CHECK (tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')),
    risk_probability NUMERIC CHECK (risk_probability IS NULL OR (risk_probability >= 0.0 AND risk_probability <= 1.0)),
    source TEXT NOT NULL DEFAULT 'telemetry' CHECK (source IN ('baseline', 'telemetry', 'expert_override')),
    model_version TEXT DEFAULT 'v1.0.0',
    model_hash TEXT,
    contributing_factors JSONB DEFAULT '{}'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Clinical Alerts
CREATE TABLE IF NOT EXISTS public.clinical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('Info', 'Warning', 'Critical')),
    alert_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Under Review' CHECK (status IN ('Under Review', 'Resolved', 'Dismissed')),
    trigger_context JSONB DEFAULT '{}'::jsonb,
    system_action TEXT,
    flagged_hss INT,
    patient_snapshot JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.daily_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hss_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;
