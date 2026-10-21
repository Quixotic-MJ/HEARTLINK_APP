-- HL-037: patients only see recipes a Dietitian approved.
--
-- expert_validated now means "approved by a Dietitian". Recipes record who approved them and when,
-- like exercises (028), plus an optional note when a Dietitian sends a recipe back for changes
-- (for example a prep time or difficulty that doesn't fit the dish). New recipes start as waiting,
-- and existing ones with no recorded reviewer go back to waiting. Safe to re-run: a recipe a
-- Dietitian approved has reviewed_by set, so it is left alone.

ALTER TABLE public.recipes
    ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
    ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.recipes
    ALTER COLUMN expert_validated SET DEFAULT false;

UPDATE public.recipes
    SET expert_validated = false
    WHERE reviewed_by IS NULL AND expert_validated = true;
