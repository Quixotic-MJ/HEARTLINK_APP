-- backend/supabase/migrations/038_single_admin_role.sql
-- HL-074: one Admin role. The adviser said Super Admin isn't needed (only the team uses the portal), so every
-- super_admin becomes admin and the role no longer exists. Safe to re-run.

UPDATE public.profiles SET role = 'admin' WHERE role = 'super_admin';

-- The role CHECK from 002 was named by Postgres, so find it by the role it allows, then add the new one.
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%super_admin%'
    LOOP
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('patient', 'medical_expert', 'admin'));

-- Staff notifications addressed to super_admin go to admins (without listing admin twice).
UPDATE public.admin_notifications
SET recipient_roles = ARRAY(
    SELECT DISTINCT r FROM unnest(array_replace(recipient_roles, 'super_admin', 'admin')) AS r
)
WHERE 'super_admin' = ANY(recipient_roles);

ALTER TABLE public.admin_notifications ALTER COLUMN recipient_roles SET DEFAULT '{admin}';
