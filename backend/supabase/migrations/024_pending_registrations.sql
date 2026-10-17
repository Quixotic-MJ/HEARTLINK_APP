-- HL-046: sign-ups waiting for their verification code, kept in the database so a restart or a
-- second worker doesn't lose them. Only a bcrypt hash of the password is stored, never the password.
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    phone text PRIMARY KEY,                 -- +63 format, one pending sign-up per number
    email text NOT NULL,
    password_hash text NOT NULL,            -- bcrypt, handed to Supabase Auth as password_hash
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for clean-up of expired sign-ups
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires_at ON public.pending_registrations(expires_at);

-- Backend only (service role), like every table since 020
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pending_registrations FROM anon, authenticated;
