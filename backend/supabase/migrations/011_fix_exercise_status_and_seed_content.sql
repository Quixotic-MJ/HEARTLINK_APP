-- 011_fix_exercise_status_and_seed_content.sql
-- Idempotent migration to update exercise_logs status constraint and ensure schema consistency.

DO $$
BEGIN
    -- 1. Drop existing check constraint on exercise_logs status if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercise_logs_status_check' 
        AND conrelid = 'public.exercise_logs'::regclass
    ) THEN
        ALTER TABLE public.exercise_logs DROP CONSTRAINT exercise_logs_status_check;
    END IF;

    -- 2. Re-add broadened check constraint supporting all 6 valid mobile workout statuses
    ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_status_check 
        CHECK (status IN ('completed', 'in_progress', 'skipped', 'partial', 'incomplete_due_to_symptoms', 'abandoned'));
END $$;
