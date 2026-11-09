-- HL-122 to HL-124: the PAR-Q+ screening. The app opens the official, unchanged PAR-Q+ and the person records its result,
-- plus HeartLink's extra check and a pregnancy or illness check. The result decides which exercises they may do, and never
-- the score. Older rows (the 5-question check) have no state and are asked to do the new screening. Additive and safe to
-- re-run: the live app keeps working.
ALTER TABLE public.exercise_screenings
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS parq_result text,
    ADD COLUMN IF NOT EXISTS form_version text,
    ADD COLUMN IF NOT EXISTS rules_version text,
    ADD COLUMN IF NOT EXISTS declared_at timestamptz,
    ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.exercise_screenings DROP CONSTRAINT IF EXISTS exercise_screenings_state_check;
ALTER TABLE public.exercise_screenings ADD CONSTRAINT exercise_screenings_state_check
    CHECK (state IS NULL OR state IN ('eligible', 'caution', 'delayed', 'locked'));
ALTER TABLE public.exercise_screenings DROP CONSTRAINT IF EXISTS exercise_screenings_parq_result_check;
ALTER TABLE public.exercise_screenings ADD CONSTRAINT exercise_screenings_parq_result_check
    CHECK (parq_result IS NULL OR parq_result IN ('all_no', 'cleared_by_follow_ups', 'follow_up_yes'));

COMMENT ON COLUMN public.exercise_screenings.state IS 'HL-123: eligible, caution, delayed or locked; empty for the old 5-question check';
COMMENT ON COLUMN public.exercise_screenings.parq_result IS 'HL-122: what the person said their PAR-Q+ showed';
COMMENT ON COLUMN public.exercise_screenings.form_version IS 'HL-122: the PAR-Q+ version they were shown';
COMMENT ON COLUMN public.exercise_screenings.rules_version IS 'HL-123: the version of the HeartLink rules that gave the state';
COMMENT ON COLUMN public.exercise_screenings.declared_at IS 'HL-122: when they confirmed the declaration';
COMMENT ON COLUMN public.exercise_screenings.expires_at IS 'HL-124: PAR-Q+ clearance lasts at most 12 months';
