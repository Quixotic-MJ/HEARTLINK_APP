-- HL-019: notifications archive 72 hours after they're sent (panel consultation, 2026-10-21).
--
-- Patient and portal notifications get archived_at (empty = active). The backend's hourly job fills it
-- in; default lists show only active ones, and archived ones stay readable. Notifications already older
-- than 72 hours are archived now. Safe to re-run.

ALTER TABLE public.patient_notifications ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS patient_notifications_active_idx
    ON public.patient_notifications (user_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_notifications_active_idx
    ON public.admin_notifications (created_at DESC) WHERE archived_at IS NULL;

UPDATE public.patient_notifications
    SET archived_at = created_at + interval '72 hours'
    WHERE archived_at IS NULL AND created_at < timezone('utc'::text, now()) - interval '72 hours';

UPDATE public.admin_notifications
    SET archived_at = created_at + interval '72 hours'
    WHERE archived_at IS NULL AND created_at < timezone('utc'::text, now()) - interval '72 hours';
