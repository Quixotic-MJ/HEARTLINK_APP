-- backend/supabase/migrations/042_expert_notifications.sql
-- HL-082: medical experts get their own notifications in the portal bell (OT-07, option A): a recipe or exercise
-- waiting for their approval, new Cardiologist guidance, and a reply in a patient's notes. They share the admin
-- notifications table. recipient_roles names expert types as 'expert:Dietitian' (and so on), and actor_id is the
-- person who caused the notification, who never sees it. Existing rows are untouched. Safe to re-run.

ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_type_check
    CHECK (type IN ('feedback', 'staff', 'security', 'system', 'content', 'notes'));

ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_route_check;
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_route_check
    CHECK (route IN ('/feedbacks', '/users', '/settings', '/foods', '/exercises')
           OR route ~ '^/patients/[A-Za-z0-9-]+$');

ALTER TABLE public.admin_notifications
    ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.admin_notifications.actor_id IS
    'HL-082: who caused this notification (they never see it); null for system notifications';
