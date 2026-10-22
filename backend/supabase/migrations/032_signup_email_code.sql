-- HL-052: each sign-up gets its own one-time code, sent by email. Only a keyed hash of the code is
-- stored (never the code), with a count of wrong tries so a code locks after 5 of them.
-- Sign-ups waiting from before this change have no code_hash; they are asked to send a new code.
ALTER TABLE public.pending_registrations
    ADD COLUMN IF NOT EXISTS code_hash text,
    ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;
