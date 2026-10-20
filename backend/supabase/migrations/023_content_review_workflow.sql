-- 023_content_review_workflow.sql
-- Versioned, specialization-scoped review workflow for patient-facing content.

ALTER TABLE public.recipes
    DROP CONSTRAINT IF EXISTS recipes_status_check;

ALTER TABLE public.recipes
    ALTER COLUMN status SET DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1 CHECK (content_version >= 1),
    ADD COLUMN IF NOT EXISTS change_notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS yield_description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS serving_description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS nutrient_source TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS nutrient_source_record_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS nutrient_calculation_notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS nutrition_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS intended_audiences TEXT[] NOT NULL DEFAULT '{general_wellness}',
    ADD COLUMN IF NOT EXISTS allergen_notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contraindication_notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS evidence_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS requires_cardiologist_review BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_status_check
    CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'));

ALTER TABLE public.exercise_routines
    DROP CONSTRAINT IF EXISTS exercise_routines_status_check;

ALTER TABLE public.exercise_routines
    ALTER COLUMN status SET DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1 CHECK (content_version >= 1),
    ADD COLUMN IF NOT EXISTS change_notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS intended_audiences TEXT[] NOT NULL DEFAULT '{general_wellness}',
    ADD COLUMN IF NOT EXISTS frequency_guidance TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS progression_guidance TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS equipment TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS modifications TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS contraindications TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS clearance_required BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS clearance_notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS stop_symptoms TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS evidence_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS requires_cardiologist_review BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.exercise_routines
    ADD CONSTRAINT exercise_routines_status_check
    CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'));

CREATE TABLE IF NOT EXISTS public.content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'exercise')),
    content_id UUID NOT NULL,
    content_version INT NOT NULL CHECK (content_version >= 1),
    snapshot JSONB NOT NULL,
    change_notes TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (content_type, content_id, content_version)
);

CREATE TABLE IF NOT EXISTS public.content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'exercise')),
    content_id UUID NOT NULL,
    content_version INT NOT NULL CHECK (content_version >= 1),
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reviewer_specialization TEXT NOT NULL CHECK (
        reviewer_specialization IN ('Dietitian', 'Physical Therapist', 'Cardiologist')
    ),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
    comments TEXT NOT NULL,
    evidence_checked JSONB NOT NULL DEFAULT '[]'::jsonb,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (content_type, content_id, content_version, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reviews_item_version
    ON public.content_reviews (content_type, content_id, content_version, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reviews_specialization
    ON public.content_reviews (reviewer_specialization, decision, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_versions_item
    ON public.content_versions (content_type, content_id, content_version DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_workflow
    ON public.recipes (status, content_version, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_routines_workflow
    ON public.exercise_routines (status, content_version, updated_at DESC);

ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_versions FROM anon, authenticated;
REVOKE ALL ON public.content_reviews FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_content_review_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Content review records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS content_reviews_immutable ON public.content_reviews;
CREATE TRIGGER content_reviews_immutable
    BEFORE UPDATE OR DELETE ON public.content_reviews
    FOR EACH ROW EXECUTE FUNCTION public.prevent_content_review_mutation();

-- Capture the state that existed when this workflow was introduced. This is history,
-- not an approval: published legacy rows still require an attributable review record.
INSERT INTO public.content_versions (
    content_type, content_id, content_version, snapshot, change_notes, created_by, created_at
)
SELECT 'recipe', r.id, r.content_version, to_jsonb(r),
       'Baseline captured during workflow migration', r.created_by, r.updated_at
FROM public.recipes r
ON CONFLICT (content_type, content_id, content_version) DO NOTHING;

INSERT INTO public.content_versions (
    content_type, content_id, content_version, snapshot, change_notes, created_by, created_at
)
SELECT 'exercise', e.id, e.content_version, to_jsonb(e),
       'Baseline captured during workflow migration', e.created_by, e.updated_at
FROM public.exercise_routines e
ON CONFLICT (content_type, content_id, content_version) DO NOTHING;
