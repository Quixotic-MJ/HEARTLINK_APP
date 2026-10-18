-- Exercise structure: what an exercise needs beyond a list of timed steps, so the app can guide
-- older patients properly. Every new column has a safe default, so existing exercises keep working
-- (the app reads old ones as before) and the live app, which doesn't know these columns, is unaffected.
--
-- The steps column (JSONB) also gains optional keys per step, written by the portal:
--   section: warmup | main | cooldown     mode: time | count     reps, seconds_per_rep
--   both_sides: true/false                breath: setup | in | hold | out     image: picture link

ALTER TABLE public.exercise_routines
    -- Get-into-position instructions, done once before the timer starts.
    ADD COLUMN IF NOT EXISTS setup_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- How many times the main part repeats, and the rest between rounds.
    ADD COLUMN IF NOT EXISTS rounds integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS rest_seconds integer NOT NULL DEFAULT 0,
    -- Seated / Standing / Lying down / Walking, and where it's done.
    ADD COLUMN IF NOT EXISTS position text,
    ADD COLUMN IF NOT EXISTS setting text,
    -- Safety notes written by the expert: when to skip it, and when to stop.
    ADD COLUMN IF NOT EXISTS skip_if jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS stop_if jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- An easier way to do it, how it should feel, and how often to do it.
    ADD COLUMN IF NOT EXISTS easier_version text,
    ADD COLUMN IF NOT EXISTS effort_hint text,
    ADD COLUMN IF NOT EXISTS frequency text,
    -- Which expert last marked it as checked, and when.
    ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.exercise_routines DROP CONSTRAINT IF EXISTS exercise_routines_rounds_check;
ALTER TABLE public.exercise_routines ADD CONSTRAINT exercise_routines_rounds_check
    CHECK (rounds BETWEEN 1 AND 20);

ALTER TABLE public.exercise_routines DROP CONSTRAINT IF EXISTS exercise_routines_rest_seconds_check;
ALTER TABLE public.exercise_routines ADD CONSTRAINT exercise_routines_rest_seconds_check
    CHECK (rest_seconds BETWEEN 0 AND 600);

ALTER TABLE public.exercise_routines DROP CONSTRAINT IF EXISTS exercise_routines_position_check;
ALTER TABLE public.exercise_routines ADD CONSTRAINT exercise_routines_position_check
    CHECK (position IS NULL OR position IN ('Seated', 'Standing', 'Lying down', 'Walking'));

ALTER TABLE public.exercise_routines DROP CONSTRAINT IF EXISTS exercise_routines_setting_check;
ALTER TABLE public.exercise_routines ADD CONSTRAINT exercise_routines_setting_check
    CHECK (setting IS NULL OR setting IN ('Indoors', 'Outdoors', 'Either'));
