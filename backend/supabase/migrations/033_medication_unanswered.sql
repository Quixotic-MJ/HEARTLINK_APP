-- backend/supabase/migrations/033_medication_unanswered.sql
-- The daily check-in's medicine question has three answers: "I took them" (true), "Not yet" (false)
-- and "I don't take any" (null). Until now the column could not hold null, so the app saved
-- "I don't take any" as false. Scoring treats null like false (no medication points).
-- Leaving the field out of an insert still stores false.

ALTER TABLE public.daily_health_logs ALTER COLUMN medication_taken DROP NOT NULL;

COMMENT ON COLUMN public.daily_health_logs.medication_taken IS
    'true = took their medicines, false = not yet, null = takes no regular medicines';
