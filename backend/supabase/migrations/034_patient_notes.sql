-- backend/supabase/migrations/034_patient_notes.sql
-- HL-039 / HL-013 / HL-040: one notes table for the care team on a patient.
--
-- kind = 'guidance': a Cardiologist's overall feedback on the patient. Dietitians and Physical Therapists
--                    read it while approving recipes and exercises (HL-037/038).
-- kind = 'message':  the shared thread where Dietitians and Physical Therapists talk about the patient.
--
-- The backend checks who may read and write (EXPERT_PERMISSIONS in app/utils/security.py); clients never
-- reach the table directly. Notes are soft-deleted by their author (deleted_at), never removed.

CREATE TABLE IF NOT EXISTS public.patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Kept as written at the time, so a later change of specialization doesn't relabel old notes
    author_expert_type TEXT NOT NULL CHECK (author_expert_type IN ('Cardiologist', 'Dietitian', 'Physical Therapist')),
    kind TEXT NOT NULL CHECK (kind IN ('guidance', 'message')),
    body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    -- Guidance only comes from Cardiologists
    CONSTRAINT patient_notes_guidance_by_cardiologist CHECK (kind <> 'guidance' OR author_expert_type = 'Cardiologist')
);

-- A patient's thread, newest first
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient
ON public.patient_notes (patient_id, kind, created_at DESC) WHERE deleted_at IS NULL;

-- Latest guidance across patients (shown beside the recipe and exercise approval panels)
CREATE INDEX IF NOT EXISTS idx_patient_notes_latest_guidance
ON public.patient_notes (created_at DESC) WHERE kind = 'guidance' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patient_notes_author ON public.patient_notes (author_id);

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.patient_notes FROM anon, authenticated;
