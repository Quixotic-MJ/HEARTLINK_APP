-- HL-047: refresh tokens behind the short-lived access tokens. Each use rotates the token, and
-- logout / password change revoke them. Only a SHA-256 hash of the token is stored, never the token.
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    client text NOT NULL CHECK (client IN ('web', 'mobile')),
    remember boolean NOT NULL DEFAULT true,  -- web "Stay signed in"; decides the cookie lifetime
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    revoked_reason text,                     -- rotated / logout / password_change / reuse_detected
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);

-- Backend only (service role), like every table since 020
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refresh_tokens FROM anon, authenticated;
