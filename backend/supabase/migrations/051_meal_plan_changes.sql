-- HL-159: the patient's own changes to the weekly meal plan (Premium). The plan itself is worked out, not stored
-- (backend/app/services/meal_plan.py); these rows are laid over it. One row per patient, day and meal: either a swap to
-- another Dietitian-approved recipe (recipe_id) or "My own meal", the patient's own estimate (own_name, own_sodium_mg,
-- own_calories), which is shown as an estimate and never as approved. Backend only, like every table since 020.
-- Additive and safe to re-run; no existing data changes.

CREATE TABLE IF NOT EXISTS public.meal_plan_changes (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day date NOT NULL,
    meal text NOT NULL CHECK (meal IN ('Breakfast', 'Lunch', 'Dinner')),
    -- A recipe that is deleted takes the swap with it; the plan's own pick comes back
    recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
    own_name text CHECK (char_length(own_name) BETWEEN 1 AND 80),
    own_sodium_mg integer CHECK (own_sodium_mg BETWEEN 0 AND 10000),
    own_calories integer CHECK (own_calories BETWEEN 0 AND 5000),
    saved_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, day, meal),
    CONSTRAINT meal_plan_changes_one_kind CHECK ((recipe_id IS NOT NULL) <> (own_name IS NOT NULL)),
    CONSTRAINT meal_plan_changes_own_sodium CHECK (own_name IS NULL OR own_sodium_mg IS NOT NULL)
);

ALTER TABLE public.meal_plan_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meal_plan_changes FROM anon, authenticated;

COMMENT ON TABLE public.meal_plan_changes IS 'HL-159: a patient''s swaps and own meals laid over the worked-out weekly meal plan';
COMMENT ON COLUMN public.meal_plan_changes.recipe_id IS 'A swap to another Dietitian-approved recipe; checked again each time the plan is read';
COMMENT ON COLUMN public.meal_plan_changes.own_name IS '"My own meal": the patient''s own estimate, shown as an estimate, never as approved';
