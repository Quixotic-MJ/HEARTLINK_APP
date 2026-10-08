CREATE TABLE public.revoked_tokens (
    token_hash text PRIMARY KEY,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz NOT NULL DEFAULT now()
);

-- Index for auto-cleanup of expired tokens
CREATE INDEX idx_revoked_tokens_expires_at ON public.revoked_tokens(expires_at);

-- Enable RLS with no policies so it's fully closed to anon/authenticated clients
-- The backend uses the service-role key which bypasses RLS
ALTER TABLE public.revoked_tokens ENABLE ROW LEVEL SECURITY;
