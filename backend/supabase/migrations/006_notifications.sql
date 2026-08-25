-- backend/supabase/migrations/006_notifications.sql
-- System Broadcasts & Patient Notifications

-- 1. Administrative System Broadcast Announcements
CREATE TABLE IF NOT EXISTS public.system_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Maintenance', 'App Update', 'Safety Reminder', 'General', 'Health Tip', 'Feature Update', 'General Announcement')),
    target_audience TEXT NOT NULL DEFAULT 'All Registered Accounts',
    publisher TEXT,
    publisher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    display_publisher TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Patient Inbox Notifications (Personal Alerts + Broadcast Copies)
CREATE TABLE IF NOT EXISTS public.patient_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    broadcast_id UUID REFERENCES public.system_broadcasts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('alert', 'insight', 'achievement', 'reminder', 'announcement', 'system')),
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'broadcast')),
    broadcast_type TEXT,
    publisher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;
