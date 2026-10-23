-- backend/supabase/migrations/037_push_tokens.sql
-- HL-018: each phone's Expo push token, so the backend can send push notifications (announcements and personal
-- notifications) instead of the app polling. Kept as-is because sending needs it; it names a device, not a secret
-- that signs anyone in. A token belongs to one account at a time (signing in as someone else moves it); sign-out
-- and Expo's "DeviceNotRegistered" answer disable it. Backend only, like every table since 020. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    platform text NOT NULL CHECK (platform IN ('android', 'ios')),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    disabled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON public.push_tokens(user_id) WHERE disabled_at IS NULL;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_tokens FROM anon, authenticated;
