-- HL-162: a family member can send the person they follow a reminder to check in, at most once a day each.
-- Additive and safe to re-run; no existing data changes.

-- When this follower last sent a reminder, so they can send at most one a day (staging and live share this database)
ALTER TABLE public.family_links ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

COMMENT ON COLUMN public.family_links.last_reminder_at IS 'HL-162: when this follower last sent the patient a check-in reminder';

-- The patient's switch for reminders from family members (on by default)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_reminders_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.family_reminders_enabled IS 'HL-162: let family members send this patient a check-in reminder';
