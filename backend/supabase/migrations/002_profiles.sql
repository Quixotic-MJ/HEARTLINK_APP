-- backend/supabase/migrations/002_profiles.sql
-- User Profile & Identity Schema (Linked 1:1 with auth.users)

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    legacy_id TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    date_of_birth DATE,
    sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female')),
    height_cm NUMERIC CHECK (height_cm IS NULL OR (height_cm >= 50.0 AND height_cm <= 300.0)),
    weight_kg NUMERIC CHECK (weight_kg IS NULL OR (weight_kg >= 20.0 AND weight_kg <= 400.0)),
    avatar_url TEXT,
    health_goals TEXT[] DEFAULT '{}',
    onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'complete')),
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'disabled', 'archived')),
    role TEXT DEFAULT 'patient' CHECK (role IN ('patient', 'medical_expert', 'admin', 'super_admin')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security immediately
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Comments for schema documentation
COMMENT ON TABLE public.profiles IS 'Authoritative user profile table linked directly to auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'Foreign key matching auth.users(id) UUID exactly.';
COMMENT ON COLUMN public.profiles.legacy_id IS 'Optional mapping column for pre-migration mock IDs (e.g. usr-patient-101).';
