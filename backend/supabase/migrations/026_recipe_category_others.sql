-- HL-030: an "Others" recipe category. The name typed in the portal is kept in category_other,
-- so the four standard categories (and the app's Breakfast/Lunch/Dinner filters) stay as they are.
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS category_other text;

ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_category_check;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_category_check
    CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Snack', 'Others'));

-- "Others" always needs a name; the standard categories never carry one.
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_category_other_check;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_category_other_check
    CHECK (
        (category = 'Others' AND category_other IS NOT NULL AND length(btrim(category_other)) > 0)
        OR (category <> 'Others' AND category_other IS NULL)
    );
