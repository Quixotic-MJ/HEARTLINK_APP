-- backend/supabase/migrations/022_case_review_v2.sql
-- HL-053: data model for the Case Review & Model Check redesign.
--
-- Old expert_evaluations never stored a row: the API wrote 7 columns the table does not have, so every
-- save failed (0 rows on 2026-10-14, no foreign keys point at it). It is rebuilt as one row per expert
-- section of a review round. review_cases keeps every round instead of overwriting.

-- 1. Review rounds ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    case_code TEXT NOT NULL,
    lane TEXT NOT NULL CHECK (lane IN ('urgent', 'sample', 'rereview')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete', 'archived')),
    -- What the app said when the round opened (shown to the Cardiologist only after submitting)
    app_score INT CHECK (app_score IS NULL OR (app_score >= 1 AND app_score <= 100)),
    app_tier TEXT CHECK (app_tier IS NULL OR app_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')),
    app_scorer TEXT NOT NULL DEFAULT 'unknown' CHECK (app_scorer IN ('baseline_model', 'bp_rules', 'lifestyle_points', 'unknown')),
    model_version TEXT,
    model_hash TEXT,
    -- The 37 inputs the baseline model reads, and what reviewers were shown
    model_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- A patient has at most one open round at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_cases_one_open
ON public.review_cases (patient_id) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_review_cases_queue ON public.review_cases (status, lane, created_at);
CREATE INDEX IF NOT EXISTS idx_review_cases_patient ON public.review_cases (patient_id, created_at DESC);

ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;

-- 2. Expert sections of a round (rebuilt; held 0 rows) -----------------------------------------------
DROP TABLE IF EXISTS public.expert_evaluations;

CREATE TABLE public.expert_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
    section TEXT NOT NULL CHECK (section IN ('cardiology', 'nutrition', 'exercise')),
    expert_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_expert_type TEXT,
    -- Fixed at submit time: only reviews by verified clinicians count in Model Check and datasets
    is_clinical BOOLEAN NOT NULL DEFAULT false,
    -- Cardiology section
    expert_tier TEXT CHECK (expert_tier IS NULL OR expert_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')),
    expert_score INT CHECK (expert_score IS NULL OR (expert_score >= 1 AND expert_score <= 100)),
    reasons TEXT[] NOT NULL DEFAULT '{}',
    confidence TEXT CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high')),
    checkup_flag TEXT CHECK (checkup_flag IS NULL OR checkup_flag IN ('not_needed', 'within_2_weeks', 'asap')),
    tier_agreement TEXT CHECK (tier_agreement IS NULL OR tier_agreement IN ('agree', 'under', 'over')),
    score_difference INT,
    -- Nutrition / exercise sections: [{"item_type","item_id","item_name","verdict","note"}]
    item_verdicts JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (review_case_id, section),
    CONSTRAINT cardiology_section_complete CHECK (
        section <> 'cardiology'
        OR (expert_tier IS NOT NULL AND confidence IS NOT NULL AND checkup_flag IS NOT NULL AND cardinality(reasons) > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_expert_evaluations_case ON public.expert_evaluations (review_case_id);
CREATE INDEX IF NOT EXISTS idx_expert_evaluations_clinical ON public.expert_evaluations (section, is_clinical, status);

ALTER TABLE public.expert_evaluations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_expert_evaluations_updated_at ON public.expert_evaluations;
CREATE TRIGGER set_expert_evaluations_updated_at BEFORE UPDATE ON public.expert_evaluations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Verified clinicians --------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_clinician BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinician_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinician_verified_at TIMESTAMPTZ;

-- 4. Recipes / exercises a reviewer marked not suitable for one patient ------------------------------
CREATE TABLE IF NOT EXISTS public.patient_hidden_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('recipe', 'exercise')),
    item_id UUID NOT NULL,
    review_case_id UUID REFERENCES public.review_cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (patient_id, item_type, item_id)
);

ALTER TABLE public.patient_hidden_recommendations ENABLE ROW LEVEL SECURITY;

-- Migration 020 keeps anon/authenticated off new tables by default; repeat it explicitly for these.
REVOKE ALL ON public.review_cases, public.expert_evaluations, public.patient_hidden_recommendations FROM anon, authenticated;
