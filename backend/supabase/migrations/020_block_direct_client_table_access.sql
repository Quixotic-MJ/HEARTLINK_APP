-- backend/supabase/migrations/020_block_direct_client_table_access.sql
-- Database review 2026-10-14.
--
-- The mobile app and web portal never query Supabase tables directly: every request goes through the
-- FastAPI backend, which uses the service-role key. But Supabase grants the public "anon" key and any
-- logged-in user ("authenticated") table access by default, and the policy "Users can update own
-- profile" let a patient who talks to Supabase directly change their own profiles.role to super_admin.
--
-- Fix: remove direct table access for anon/authenticated entirely, now and for future tables.
-- Not affected: the backend (service_role), Supabase Auth logins, and Storage buckets.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- The dashboard stats function is backend-only.
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(INT) TO service_role;
