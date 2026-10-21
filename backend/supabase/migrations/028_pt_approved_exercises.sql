-- HL-026: patients only see exercises a Physical Therapist approved.
--
-- expert_validated now means "approved by a PT". It used to default to true, so every exercise
-- counted as approved without anyone checking it. New exercises now start as waiting for approval,
-- and existing ones with no recorded reviewer go back to waiting. Safe to re-run: an exercise a PT
-- has approved has reviewed_by set, so it is left alone.

ALTER TABLE public.exercise_routines
    ALTER COLUMN expert_validated SET DEFAULT false;

UPDATE public.exercise_routines
    SET expert_validated = false
    WHERE reviewed_by IS NULL AND expert_validated = true;
