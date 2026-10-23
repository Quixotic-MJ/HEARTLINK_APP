-- backend/supabase/migrations/036_profile_deactivation_reason.sql
-- HL-073: the reason an admin gives when disabling an account (the portal already asks for one). It is shown on
-- the account and in the activity log, and cleared when the account is enabled again. Safe to re-run.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS deactivation_reason text;

COMMENT ON COLUMN public.profiles.deactivation_reason IS
    'Why an admin disabled this account (null while active)';
