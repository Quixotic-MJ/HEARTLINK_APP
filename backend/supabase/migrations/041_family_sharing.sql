-- backend/supabase/migrations/041_family_sharing.sql
-- HL-087: family sharing (Premium for the patient). A Premium patient makes a one-time invite code (24 hours); a
-- family member who enters it follows the patient: a read-only summary in the app and a notification when the patient
-- logs an emergency-level reading. Links stay when Premium ends (sharing pauses) and go at once when removed.
-- A family-only account is a patient account with account_kind = 'family' (no health setup). Backend only, like
-- every table since 020. Safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'patient';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_kind_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_kind_check CHECK (account_kind IN ('patient', 'family'));
COMMENT ON COLUMN public.profiles.account_kind IS 'patient, or family: only follows family members (no health setup)';

CREATE TABLE IF NOT EXISTS public.family_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z2-9]{6}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_family_invites_patient ON public.family_invites(patient_id);

CREATE TABLE IF NOT EXISTS public.family_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT family_links_unique UNIQUE (patient_id, follower_id),
    CONSTRAINT family_links_not_self CHECK (patient_id <> follower_id)
);

CREATE INDEX IF NOT EXISTS idx_family_links_follower ON public.family_links(follower_id);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_invites FROM anon, authenticated;
REVOKE ALL ON public.family_links FROM anon, authenticated;
