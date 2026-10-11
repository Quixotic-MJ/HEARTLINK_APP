-- backend/supabase/migrations/017_add_expert_type_to_profiles.sql
-- Add expert_type column to profiles table for Medical Expert sub-roles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS expert_type TEXT CHECK (
    expert_type IS NULL OR expert_type IN ('Physical Therapist', 'Dietitian', 'Cardiologist')
);

CREATE INDEX IF NOT EXISTS idx_profiles_expert_type 
ON public.profiles(expert_type) 
WHERE expert_type IS NOT NULL;

COMMENT ON COLUMN public.profiles.expert_type IS 'Clinical sub-role specialization for medical_expert: Physical Therapist, Dietitian, or Cardiologist.';
