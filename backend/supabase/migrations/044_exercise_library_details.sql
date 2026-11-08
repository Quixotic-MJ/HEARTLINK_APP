-- backend/supabase/migrations/044_exercise_library_details.sql
-- HL-094 and HL-095, from the physiotherapist consultation: each exercise gets a difficulty level, a category, the body
-- areas it works and a tempo, and each exercise log can hold how hard the session felt (0 to 10, HeartLink's own simple
-- scale). All optional: existing rows keep working. Safe to re-run.

ALTER TABLE public.exercise_routines
    ADD COLUMN IF NOT EXISTS difficulty_level text,
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS target_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tempo text;

ALTER TABLE public.exercise_routines DROP CONSTRAINT IF EXISTS exercise_routines_difficulty_level_check;
ALTER TABLE public.exercise_routines ADD CONSTRAINT exercise_routines_difficulty_level_check
    CHECK (difficulty_level IS NULL OR difficulty_level IN ('Beginner', 'Intermediate', 'Advanced'));

COMMENT ON COLUMN public.exercise_routines.difficulty_level IS 'HL-094: Beginner, Intermediate or Advanced; set with the physical therapist';
COMMENT ON COLUMN public.exercise_routines.category IS 'HL-094: e.g. Balance, Mobility; separate from type, which decides how the session plays';
COMMENT ON COLUMN public.exercise_routines.target_areas IS 'HL-094: body areas or muscles it works';
COMMENT ON COLUMN public.exercise_routines.tempo IS 'HL-094: movement speed, in plain words';

ALTER TABLE public.exercise_logs ADD COLUMN IF NOT EXISTS effort_rating smallint;
ALTER TABLE public.exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_effort_rating_check;
ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_effort_rating_check
    CHECK (effort_rating IS NULL OR effort_rating BETWEEN 0 AND 10);

COMMENT ON COLUMN public.exercise_logs.effort_rating IS 'HL-095: how hard it felt, 0 to 10, as the patient rated it; separate from symptoms';
