-- backend/supabase/migrations/018_add_must_change_password_to_profiles.sql
-- HL-044: staff accounts get a one-time temporary password and must set their own on first login.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing admin and expert accounts were created with the shared password "TempPassword2026!",
-- which is public in the repo. Make them set a new password on their next login.
-- Super admins are left alone (their password was changed in HL-043).
UPDATE public.profiles
SET must_change_password = TRUE
WHERE role IN ('admin', 'medical_expert');

COMMENT ON COLUMN public.profiles.must_change_password IS 'True until the user replaces a temporary password given by an administrator (HL-044).';
