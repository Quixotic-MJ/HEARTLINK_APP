-- backend/supabase/migrations/021_normalize_profile_phones.sql
-- Database review 2026-10-14: profiles.phone held the same kind of number in several formats
-- (09.., 63.., +63..), so one number could exist twice and logins needed up to five lookups.
-- The backend now stores and searches phones as +63.. (app/utils/phone.py); this converts existing rows.
-- Non-numbers such as 'No Phone' are left alone.

UPDATE public.profiles SET phone = '+63' || substr(phone, 2) WHERE phone ~ '^0[0-9]+$';
UPDATE public.profiles SET phone = '+' || phone WHERE phone ~ '^63[0-9]+$';

-- One account per phone number (also speeds up phone lookups).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
ON public.profiles (phone)
WHERE phone LIKE '+%';
