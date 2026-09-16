-- backend/supabase/migrations/014_sleep_schedule.sql
-- Add bedtime and wake_time columns to sleep_logs

ALTER TABLE public.sleep_logs 
ADD COLUMN IF NOT EXISTS bedtime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wake_time TIMESTAMPTZ;
