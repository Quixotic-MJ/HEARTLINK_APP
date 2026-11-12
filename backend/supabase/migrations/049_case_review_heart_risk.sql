-- HL-153: case review and Model Check compare against the Heart risk (AHA PREVENT), not the habits score.
-- Additive and safe to re-run; no existing data changes. Older reviews keep their habits-style level and are left out
-- of Model Check's measures.
--
-- Bands (2026 ACC/AHA): low under 3%, borderline 3-4.9%, intermediate 5-9.9%, high 10% or more.

-- 1. What the app said when the round opened: its Heart risk
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS app_risk_band text;
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS app_risk_percent numeric;
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS app_risk_kind text;

ALTER TABLE public.review_cases DROP CONSTRAINT IF EXISTS review_cases_app_risk_band_check;
ALTER TABLE public.review_cases ADD CONSTRAINT review_cases_app_risk_band_check
    CHECK (app_risk_band IS NULL OR app_risk_band IN ('low', 'borderline', 'intermediate', 'high'));
ALTER TABLE public.review_cases DROP CONSTRAINT IF EXISTS review_cases_app_risk_kind_check;
ALTER TABLE public.review_cases ADD CONSTRAINT review_cases_app_risk_kind_check
    CHECK (app_risk_kind IS NULL OR app_risk_kind IN ('calculated', 'estimated'));

COMMENT ON COLUMN public.review_cases.app_risk_band IS 'HL-153: the app''s Heart risk band when the round opened';
COMMENT ON COLUMN public.review_cases.app_risk_percent IS 'HL-153: the app''s 10-year Heart risk, %, when the round opened';
COMMENT ON COLUMN public.review_cases.app_risk_kind IS 'HL-153: calculated (with lab results) or estimated (machine learning)';

-- 2. The Cardiologist's answer: the band they would give, an optional %, and how it compares
ALTER TABLE public.expert_evaluations ADD COLUMN IF NOT EXISTS expert_risk_band text;
ALTER TABLE public.expert_evaluations ADD COLUMN IF NOT EXISTS expert_risk_percent numeric;
ALTER TABLE public.expert_evaluations ADD COLUMN IF NOT EXISTS risk_agreement text;
ALTER TABLE public.expert_evaluations ADD COLUMN IF NOT EXISTS risk_difference numeric;

ALTER TABLE public.expert_evaluations DROP CONSTRAINT IF EXISTS expert_evaluations_expert_risk_band_check;
ALTER TABLE public.expert_evaluations ADD CONSTRAINT expert_evaluations_expert_risk_band_check
    CHECK (expert_risk_band IS NULL OR expert_risk_band IN ('low', 'borderline', 'intermediate', 'high'));
ALTER TABLE public.expert_evaluations DROP CONSTRAINT IF EXISTS expert_evaluations_expert_risk_percent_check;
ALTER TABLE public.expert_evaluations ADD CONSTRAINT expert_evaluations_expert_risk_percent_check
    CHECK (expert_risk_percent IS NULL OR (expert_risk_percent > 0 AND expert_risk_percent <= 100));
ALTER TABLE public.expert_evaluations DROP CONSTRAINT IF EXISTS expert_evaluations_risk_agreement_check;
ALTER TABLE public.expert_evaluations ADD CONSTRAINT expert_evaluations_risk_agreement_check
    CHECK (risk_agreement IS NULL OR risk_agreement IN ('agree', 'under', 'over'));

COMMENT ON COLUMN public.expert_evaluations.expert_risk_band IS 'HL-153: the Heart risk band the Cardiologist would give';
COMMENT ON COLUMN public.expert_evaluations.expert_risk_percent IS 'HL-153: the Cardiologist''s own 10-year risk estimate, % (optional)';
COMMENT ON COLUMN public.expert_evaluations.risk_agreement IS 'HL-153: the app''s band vs the Cardiologist''s (under = the app rated lower)';
COMMENT ON COLUMN public.expert_evaluations.risk_difference IS 'HL-153: the Cardiologist''s % minus the app''s %, when both exist';

-- 3. A Cardiologist review needs a band now; older reviews have the habits-style level instead
ALTER TABLE public.expert_evaluations DROP CONSTRAINT IF EXISTS cardiology_section_complete;
ALTER TABLE public.expert_evaluations ADD CONSTRAINT cardiology_section_complete CHECK (
    section <> 'cardiology'
    OR ((expert_risk_band IS NOT NULL OR expert_tier IS NOT NULL)
        AND confidence IS NOT NULL AND checkup_flag IS NOT NULL AND cardinality(reasons) > 0)
);
