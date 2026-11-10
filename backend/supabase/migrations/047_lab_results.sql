-- HL-138: optional lab results for the Heart score. Life's Essential 8 has two areas that need a blood test: cholesterol
-- (a lipid profile) and blood sugar (fasting blood sugar or HbA1c). People who have recent results can type them in;
-- each counts in the score for 12 months from the test date. Self-reported, not a diagnosis. One row per patient per
-- kind, values in mg/dL (the app converts mmol/L). Backend only, like every table since 020. Additive and safe to re-run.

CREATE TABLE IF NOT EXISTS public.lab_results (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('cholesterol', 'blood_sugar')),
    test_date date NOT NULL,
    total_cholesterol numeric,
    hdl numeric,
    cholesterol_medicine boolean,
    fasting_glucose numeric,
    hba1c numeric,
    has_diabetes boolean,
    saved_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, kind),
    CONSTRAINT lab_results_cholesterol_check CHECK (
        kind <> 'cholesterol' OR (total_cholesterol IS NOT NULL AND hdl IS NOT NULL AND hdl < total_cholesterol)
    ),
    CONSTRAINT lab_results_blood_sugar_check CHECK (
        kind <> 'blood_sugar' OR fasting_glucose IS NOT NULL OR hba1c IS NOT NULL
    )
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lab_results FROM anon, authenticated;

COMMENT ON TABLE public.lab_results IS 'HL-138: self-reported lab results for the Heart score; not a diagnosis';
COMMENT ON COLUMN public.lab_results.test_date IS 'When the blood test was taken; counts in the score for 12 months';
COMMENT ON COLUMN public.lab_results.total_cholesterol IS 'mg/dL; non-HDL = total_cholesterol - hdl';
COMMENT ON COLUMN public.lab_results.hba1c IS 'Percent';
