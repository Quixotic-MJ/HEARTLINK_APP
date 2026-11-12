-- HL-154: family alerts. A follower is told once when the patient hasn't logged a blood pressure reading for 2 days,
-- and gets a weekly summary on Sunday evening. Additive and safe to re-run; no existing data changes.

-- When each follower was last told, so the hourly job never tells them twice (staging and live share this database)
ALTER TABLE public.family_links ADD COLUMN IF NOT EXISTS last_nudge_at timestamptz;
ALTER TABLE public.family_links ADD COLUMN IF NOT EXISTS last_digest_at timestamptz;

COMMENT ON COLUMN public.family_links.last_nudge_at IS 'HL-154: when this follower was last told the patient had no check-in for 2 days';
COMMENT ON COLUMN public.family_links.last_digest_at IS 'HL-154: when this follower last got the weekly summary';

-- The patient's switch for the "no check-in" nudge (on by default; the weekly summary and emergency alerts aren't affected)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_nudges_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.family_nudges_enabled IS 'HL-154: tell followers when there is no blood pressure reading for 2 days';
