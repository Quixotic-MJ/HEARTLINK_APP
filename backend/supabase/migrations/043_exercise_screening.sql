-- backend/supabase/migrations/043_exercise_screening.sql
-- HL-093: a short pre-exercise safety check, from the physiotherapist consultation. Any "yes" pauses active workouts
-- and exercise suggestions and advises a professional assessment, until the patient says a professional cleared them.
-- HeartLink's own questions, pending Sir Eugene's review. One row per patient. A screening, not a diagnosis.
-- Backend only, like every table since 020. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.exercise_screenings (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    needs_assessment boolean NOT NULL DEFAULT false,
    cleared_at timestamptz,
    answered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_screenings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exercise_screenings FROM anon, authenticated;

COMMENT ON TABLE public.exercise_screenings IS 'HL-093: pre-exercise safety check answers; a screening, not a diagnosis';
COMMENT ON COLUMN public.exercise_screenings.needs_assessment IS 'True when any answer was yes';
COMMENT ON COLUMN public.exercise_screenings.cleared_at IS 'When the patient said a professional cleared them; reset by new answers';
