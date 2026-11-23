-- HL-163: automatic step tracking (panel revision). The Android app reads the phone's step counts from Health Connect
-- and sends one row per day: the day's step total (shown to the patient, never scored) and the brisk periods, the
-- stretches walked at 100+ steps a minute. Brisk periods count as moderate-activity minutes in the Habit score
-- (app/services/step_minutes.py). The app re-sends the whole week on each sync, so a day is replaced, not added to.
-- Also: the patient's own daily step goal (for encouragement only). Backend only, like every table since 020.
-- Additive and safe to re-run.

CREATE TABLE IF NOT EXISTS public.step_days (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day date NOT NULL,
    steps integer NOT NULL CHECK (steps >= 0 AND steps <= 100000),
    brisk_periods jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(brisk_periods) = 'array'),
    source text NOT NULL DEFAULT 'health_connect',
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, day)
);

ALTER TABLE public.step_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.step_days FROM anon, authenticated;

COMMENT ON TABLE public.step_days IS 'HL-163: daily steps from the phone (Health Connect); brisk periods count as movement minutes';
COMMENT ON COLUMN public.step_days.day IS 'The day in Asia/Manila';
COMMENT ON COLUMN public.step_days.brisk_periods IS 'List of [start, end] ISO times walked at 100+ steps a minute';

ALTER TABLE public.user_thresholds
    ADD COLUMN IF NOT EXISTS daily_steps_goal integer NOT NULL DEFAULT 7000;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_thresholds_daily_steps_goal_check'
    ) THEN
        ALTER TABLE public.user_thresholds
            ADD CONSTRAINT user_thresholds_daily_steps_goal_check
            CHECK (daily_steps_goal >= 1000 AND daily_steps_goal <= 30000);
    END IF;
END $$;

COMMENT ON COLUMN public.user_thresholds.daily_steps_goal IS 'HL-163: the patient''s own daily step goal; encouragement only, not scored';
