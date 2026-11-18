-- 055: the meal a patient chose when logging food (2026-11-18). The Food Diary groups logs by it, so breakfast logged in
-- the evening stays under Breakfast. Older logs have none and the diary uses their logged time, as before.
-- Additive and safe to run more than once.
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS time_of_meal TEXT;

ALTER TABLE public.meal_logs DROP CONSTRAINT IF EXISTS meal_logs_time_of_meal_check;
ALTER TABLE public.meal_logs ADD CONSTRAINT meal_logs_time_of_meal_check
    CHECK (time_of_meal IS NULL OR time_of_meal IN ('Breakfast', 'Lunch', 'Dinner', 'Snack'));
