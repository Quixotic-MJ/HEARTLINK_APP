-- HL-114: when someone quit smoking, because the Heart score's nicotine points depend on it.
-- Empty for anyone who never smoked, still smokes, or hasn't answered yet. Adding an empty column changes no existing data.
ALTER TABLE public.baseline_onboarding ADD COLUMN IF NOT EXISTS smoke_quit_when text;

ALTER TABLE public.baseline_onboarding DROP CONSTRAINT IF EXISTS baseline_onboarding_smoke_quit_when_check;
ALTER TABLE public.baseline_onboarding ADD CONSTRAINT baseline_onboarding_smoke_quit_when_check
    CHECK (smoke_quit_when IS NULL OR smoke_quit_when IN ('under_1_year', '1_to_5_years', '5_plus_years'));

COMMENT ON COLUMN public.baseline_onboarding.smoke_quit_when IS 'HL-114: how long ago the person quit smoking, for the Heart score.';
