-- HL-166 (panel revision): an optional blood oxygen reading (SpO2 %) from a pulse oximeter in the daily check-in.
-- It is never scored. Under 90% is treated as an emergency by the app, the family alert and the case review urgent lane
-- (PROPOSED threshold, pending the cardiologist's confirmation). Additive and safe to re-run.
ALTER TABLE public.daily_health_logs ADD COLUMN IF NOT EXISTS spo2_percent smallint;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_health_logs_spo2_percent_check') THEN
        ALTER TABLE public.daily_health_logs
            ADD CONSTRAINT daily_health_logs_spo2_percent_check
            CHECK (spo2_percent IS NULL OR (spo2_percent >= 50 AND spo2_percent <= 100));
    END IF;
END $$;

COMMENT ON COLUMN public.daily_health_logs.spo2_percent IS 'HL-166: blood oxygen % from a pulse oximeter (optional, never scored)';
