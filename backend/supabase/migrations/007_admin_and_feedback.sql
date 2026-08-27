-- backend/supabase/migrations/007_admin_and_feedback.sql
-- Admin Notifications, Read State Relational Table, Activity Audit Logs & Feedback Tickets

-- 1. Admin Broadcasts & System Alerts
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('feedback', 'staff', 'security', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning')),
    recipient_roles TEXT[] NOT NULL DEFAULT '{admin,super_admin}',
    route TEXT NOT NULL CHECK (route IN ('/feedbacks', '/users', '/settings')),
    target_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Admin Notification Read States (Relational Normalization from array read_by)
CREATE TABLE IF NOT EXISTS public.admin_notification_reads (
    notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (notification_id, admin_user_id)
);

-- 3. Immutable Administrative Activity Audit Log
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    target_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. User Feedback & Support Tickets
CREATE TABLE IF NOT EXISTS public.feedback_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Bug Report', 'UI/UX Suggestion', 'Account Issue', 'Question', 'Other')),
    preview TEXT NOT NULL,
    full_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    device_meta JSONB DEFAULT '{}'::jsonb,
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;
