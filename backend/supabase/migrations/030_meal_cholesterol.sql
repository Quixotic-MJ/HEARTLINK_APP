-- HL-028: daily cholesterol tracking from food logs.
--
-- Meal logs store cholesterol (mg) like sodium and calories. Meals logged from a recipe before this
-- change get the recipe's value, scaled by how much was eaten (the logged calories against the
-- recipe's calories per serving). Each patient gets a daily cholesterol limit next to their sodium
-- limit; 200 mg is the starting value until the cardiologist confirms it and HL-016 sets it per patient.
-- Safe to re-run: columns are only added if missing, and only meals still at 0 are filled in.

ALTER TABLE public.meal_logs
    ADD COLUMN IF NOT EXISTS cholesterol_mg numeric NOT NULL DEFAULT 0;

ALTER TABLE public.meal_logs DROP CONSTRAINT IF EXISTS meal_logs_cholesterol_mg_check;
ALTER TABLE public.meal_logs ADD CONSTRAINT meal_logs_cholesterol_mg_check CHECK (cholesterol_mg >= 0);

ALTER TABLE public.user_thresholds
    ADD COLUMN IF NOT EXISTS cholesterol_limit_mg integer DEFAULT 200;

ALTER TABLE public.user_thresholds DROP CONSTRAINT IF EXISTS user_thresholds_cholesterol_limit_mg_check;
ALTER TABLE public.user_thresholds ADD CONSTRAINT user_thresholds_cholesterol_limit_mg_check
    CHECK (cholesterol_limit_mg IS NULL OR (cholesterol_limit_mg >= 50 AND cholesterol_limit_mg <= 1000));

UPDATE public.meal_logs m
    SET cholesterol_mg = ROUND(r.cholesterol_mg * CASE WHEN r.calories > 0 THEN m.calories / r.calories ELSE 1 END, 1)
    FROM public.recipes r
    WHERE m.recipe_id = r.id AND m.cholesterol_mg = 0 AND r.cholesterol_mg > 0;
