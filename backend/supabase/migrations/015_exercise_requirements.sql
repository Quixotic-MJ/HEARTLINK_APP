-- backend/supabase/migrations/015_exercise_requirements.sql
-- Add requirements and calories columns to exercise_routines

-- Add requirements column for equipment/prerequisites
ALTER TABLE public.exercise_routines
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add calories estimate column
ALTER TABLE public.exercise_routines
  ADD COLUMN IF NOT EXISTS calories INT DEFAULT 0;
