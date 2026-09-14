-- backend/supabase/migrations/013_optional_vitals.sql
-- Allow daily health logs to be submitted without vitals (for patients without BP monitors)

ALTER TABLE public.daily_health_logs ALTER COLUMN systolic_bp DROP NOT NULL;
ALTER TABLE public.daily_health_logs ALTER COLUMN diastolic_bp DROP NOT NULL;
ALTER TABLE public.daily_health_logs ALTER COLUMN heart_rate_bpm DROP NOT NULL;

-- Optional constraint: If blood pressure is entered, both systolic and diastolic must be provided together
ALTER TABLE public.daily_health_logs
ADD CONSTRAINT check_bp_pair_or_null
CHECK (
    (systolic_bp IS NULL AND diastolic_bp IS NULL) OR
    (systolic_bp IS NOT NULL AND diastolic_bp IS NOT NULL)
);
