-- Forgot password on the phone: a 6-digit code emailed to the account's address, entered in the app with the new
-- password. One live code per account. Only a keyed hash of the code is stored (never the code), with a count of
-- wrong tries so a code locks after 5 of them, like the sign-up code (032). Re-runnable.
CREATE TABLE IF NOT EXISTS public.password_resets (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    code_hash text,                         -- NULL while the code is being used, so it works once
    attempts int NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for clean-up of expired codes
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets(expires_at);

-- Backend only (service role), like every table since 020
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_resets FROM anon, authenticated;
