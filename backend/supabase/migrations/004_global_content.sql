-- backend/supabase/migrations/004_global_content.sql
-- Global Content Tables (Recipes, Exercise Routines, Clinics) & User Saved Bookmarks

-- 1. Global Heart-Healthy Recipes Library
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    name TEXT NOT NULL,
    subtitle TEXT,
    category TEXT NOT NULL CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
    hss_tier TEXT NOT NULL CHECK (hss_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')),
    sodium_mg NUMERIC NOT NULL CHECK (sodium_mg >= 0),
    calories NUMERIC NOT NULL CHECK (calories >= 0),
    saturated_fat_g NUMERIC NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0),
    cholesterol_mg NUMERIC NOT NULL DEFAULT 0 CHECK (cholesterol_mg >= 0),
    fiber_g NUMERIC NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
    prep_time_minutes INT NOT NULL CHECK (prep_time_minutes >= 0),
    servings INT NOT NULL CHECK (servings >= 1),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    heart_benefit TEXT,
    tags TEXT[] DEFAULT '{}',
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps TEXT[] DEFAULT '{}',
    image_url TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    expert_validated BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Global Exercise Routines Library
CREATE TABLE IF NOT EXISTS public.exercise_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL CHECK (duration_minutes >= 1),
    hss_tier TEXT NOT NULL CHECK (hss_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')),
    type TEXT NOT NULL,
    intensity TEXT NOT NULL CHECK (intensity IN ('None', 'Low', 'Moderate', 'High')),
    goal TEXT,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    media_url TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    guide_images TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    expert_validated BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Medical Clinics Directory
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    name TEXT NOT NULL,
    doctor TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    phone TEXT NOT NULL,
    specialty TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. User Saved Recipes Bookmarks (Composite Uniqueness)
CREATE TABLE IF NOT EXISTS public.saved_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, recipe_id)
);

-- 5. User Saved Exercises Bookmarks (Composite Uniqueness)
CREATE TABLE IF NOT EXISTS public.saved_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES public.exercise_routines(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, routine_id)
);

-- Enable Row Level Security
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_exercises ENABLE ROW LEVEL SECURITY;
