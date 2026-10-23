-- backend/supabase/migrations/035_exercise_review_note.sql
-- HL-038: a Physical Therapist can send an exercise back with a note instead of approving it, the same way a
-- Dietitian sends a recipe back (029_dietitian_approved_recipes.sql). The note says what to fix; it is cleared
-- when a PT approves the exercise. A sent-back exercise stays unapproved, so patients never see it (HL-026).
-- Safe to re-run.

ALTER TABLE public.exercise_routines
    ADD COLUMN IF NOT EXISTS review_note text;

COMMENT ON COLUMN public.exercise_routines.review_note IS
    'Why a Physical Therapist sent this exercise back (null when approved or never sent back)';
