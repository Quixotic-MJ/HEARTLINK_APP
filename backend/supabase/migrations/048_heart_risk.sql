-- HL-139 to HL-141: Heart risk (the AHA PREVENT equations). Additive and safe to re-run; no existing data changes.
--
-- 1. Three yes/no answers PREVENT needs (HL-140). Empty until the person answers, in setup or Settings.
ALTER TABLE public.baseline_onboarding ADD COLUMN IF NOT EXISTS bp_medicine boolean;
ALTER TABLE public.baseline_onboarding ADD COLUMN IF NOT EXISTS has_diabetes boolean;
ALTER TABLE public.baseline_onboarding ADD COLUMN IF NOT EXISTS cholesterol_medicine boolean;

COMMENT ON COLUMN public.baseline_onboarding.bp_medicine IS 'HL-140: takes medicine for blood pressure (Heart risk)';
COMMENT ON COLUMN public.baseline_onboarding.has_diabetes IS 'HL-140: told by a doctor they have diabetes (Heart risk)';
COMMENT ON COLUMN public.baseline_onboarding.cholesterol_medicine IS 'HL-140: takes medicine for cholesterol (Heart risk)';

-- 2. A kidney lab result (HL-141): blood creatinine in mg/dL (the app converts umol/L), or the eGFR printed on the report.
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS creatinine numeric;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS egfr numeric;

ALTER TABLE public.lab_results DROP CONSTRAINT IF EXISTS lab_results_kind_check;
ALTER TABLE public.lab_results ADD CONSTRAINT lab_results_kind_check
    CHECK (kind IN ('cholesterol', 'blood_sugar', 'kidney'));

ALTER TABLE public.lab_results DROP CONSTRAINT IF EXISTS lab_results_kidney_check;
ALTER TABLE public.lab_results ADD CONSTRAINT lab_results_kidney_check
    CHECK (kind <> 'kidney' OR creatinine IS NOT NULL OR egfr IS NOT NULL);

COMMENT ON COLUMN public.lab_results.creatinine IS 'HL-141: mg/dL; eGFR is worked out with CKD-EPI 2021';
COMMENT ON COLUMN public.lab_results.egfr IS 'HL-141: mL/min/1.73m2, when the report prints it';

-- 3. Fix found on the way: case review rounds for patients on the current score are saved with the scorer
--    'heart_score', which the list from 022 didn't allow.
ALTER TABLE public.review_cases DROP CONSTRAINT IF EXISTS review_cases_app_scorer_check;
ALTER TABLE public.review_cases ADD CONSTRAINT review_cases_app_scorer_check
    CHECK (app_scorer IN ('heart_score', 'baseline_model', 'bp_rules', 'lifestyle_points', 'unknown'));
