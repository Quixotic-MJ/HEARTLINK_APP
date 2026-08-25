-- backend/supabase/migrations/008_case_review_and_calibration.sql
-- Case Review, Expert Evaluations, Calibration Datasets & Candidate Models

-- 1. Versioned Calibration Datasets
CREATE TABLE IF NOT EXISTS public.calibration_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    record_count INT NOT NULL DEFAULT 0 CHECK (record_count >= 0),
    excluded_record_count INT NOT NULL DEFAULT 0 CHECK (excluded_record_count >= 0),
    model_hashes_represented TEXT[] DEFAULT '{}',
    feature_pipeline_versions_represented TEXT[] DEFAULT '{}',
    source_evaluation_ids TEXT[] DEFAULT '{}',
    rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ML Candidate Models Registry
CREATE TABLE IF NOT EXISTS public.candidate_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT UNIQUE NOT NULL,
    artifact_filename TEXT NOT NULL,
    model_hash TEXT NOT NULL,
    dataset_id TEXT,
    feature_pipeline_identifier TEXT,
    validation_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'rejected', 'deployed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Calibration Run Audit Records
CREATE TABLE IF NOT EXISTS public.calibration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.calibration_datasets(id) ON DELETE SET NULL,
    model_version TEXT NOT NULL,
    pre_brier_score NUMERIC NOT NULL,
    post_brier_score NUMERIC NOT NULL,
    pre_ece NUMERIC NOT NULL,
    post_ece NUMERIC NOT NULL,
    calibration_method TEXT NOT NULL CHECK (calibration_method IN ('platt_scaling', 'isotonic_regression', 'temperature_scaling')),
    calibrated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    calibrated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Clinical Expert Evaluations
CREATE TABLE IF NOT EXISTS public.expert_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    case_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expert_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    model_score INT NOT NULL,
    model_tier TEXT NOT NULL,
    expert_score INT NOT NULL CHECK (expert_score >= 1 AND expert_score <= 100),
    expert_tier TEXT NOT NULL CHECK (expert_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')),
    score_difference INT NOT NULL,
    tier_match BOOLEAN NOT NULL,
    notes TEXT NOT NULL,
    recommendation_feedback JSONB DEFAULT '{}'::jsonb,
    exercise_feedback JSONB DEFAULT '{}'::jsonb,
    recipe_feedback JSONB DEFAULT '{}'::jsonb,
    adjustment_reasons TEXT[] DEFAULT '{}',
    reviewer_confidence NUMERIC CHECK (reviewer_confidence IS NULL OR (reviewer_confidence >= 0.0 AND reviewer_confidence <= 1.0)),
    input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_context JSONB DEFAULT '{}'::jsonb,
    model_metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'Logged' CHECK (status IN ('Logged', 'Archived', 'Pending', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.calibration_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_evaluations ENABLE ROW LEVEL SECURITY;
