-- Migration 012: Add duration_seconds to exercise_logs and loosen duration_minutes constraint
-- Description: Adds duration_seconds column for sub-minute workout precision and allows 0 minutes for short sessions.

DO $$
BEGIN
    -- 1. Add duration_seconds column if it does not exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'exercise_logs' 
        AND column_name = 'duration_seconds'
    ) THEN
        ALTER TABLE public.exercise_logs ADD COLUMN duration_seconds INT DEFAULT 0;
    END IF;

    -- 2. Drop existing check constraint on duration_minutes if present
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercise_logs_duration_minutes_check' 
        AND conrelid = 'public.exercise_logs'::regclass
    ) THEN
        ALTER TABLE public.exercise_logs DROP CONSTRAINT exercise_logs_duration_minutes_check;
    END IF;

    -- 3. Add updated constraint allowing 0 to 1440 minutes
    ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_duration_minutes_check 
        CHECK (duration_minutes >= 0 AND duration_minutes <= 1440);

    -- 4. Backfill legacy rows: populate duration_seconds from duration_minutes * 60 if duration_seconds is 0 or NULL
    UPDATE public.exercise_logs 
    SET duration_seconds = duration_minutes * 60 
    WHERE (duration_seconds IS NULL OR duration_seconds = 0) AND duration_minutes > 0;
END $$;
