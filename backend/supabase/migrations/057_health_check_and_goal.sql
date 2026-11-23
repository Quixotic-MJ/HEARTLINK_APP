-- HL-164 (panel revision): the health check before setup and the patient's main goal. Additive and safe to re-run;
-- no existing data changes. Only people setting up from now on are asked; everyone else keeps the defaults.
--
-- 1. The conditions HeartLink isn't made for, ticked at the start of setup. Someone who ticks one is advised not to use
--    the app and can only go on with their doctor's OK (doctor_cleared). The server refuses a condition without it.
ALTER TABLE public.baseline_onboarding
    ADD COLUMN IF NOT EXISTS health_conditions text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.baseline_onboarding
    ADD COLUMN IF NOT EXISTS doctor_cleared boolean NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'baseline_onboarding_health_conditions_check') THEN
        ALTER TABLE public.baseline_onboarding
            ADD CONSTRAINT baseline_onboarding_health_conditions_check
            CHECK (health_conditions <@ ARRAY['heart_disease', 'stroke', 'kidney_disease', 'pregnancy']::text[]);
    END IF;
END $$;

COMMENT ON COLUMN public.baseline_onboarding.health_conditions IS 'HL-164: conditions ticked at the health check (heart_disease, stroke, kidney_disease, pregnancy)';
COMMENT ON COLUMN public.baseline_onboarding.doctor_cleared IS 'HL-164: said their doctor OKd using HeartLink (needed when a condition is ticked)';

-- 2. The patient's main goal, with their other goals; changed in Goals & limits. Empty for people set up before this.
ALTER TABLE public.user_thresholds ADD COLUMN IF NOT EXISTS main_goal text;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_thresholds_main_goal_check') THEN
        ALTER TABLE public.user_thresholds
            ADD CONSTRAINT user_thresholds_main_goal_check
            CHECK (main_goal IS NULL OR main_goal IN (
                'lower_bp', 'heart_healthy', 'move_more', 'less_salt', 'sleep_better', 'healthy_weight', 'quit_smoking'
            ));
    END IF;
END $$;

COMMENT ON COLUMN public.user_thresholds.main_goal IS 'HL-164: the main goal picked at setup or in Goals & limits';
