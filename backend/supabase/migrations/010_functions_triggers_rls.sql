-- backend/supabase/migrations/010_functions_triggers_rls.sql
-- Functions, Triggers, Storage Configuration & Row Level Security (RLS) Policies

-- ============================================================================
-- 1. UTILITY FUNCTIONS & TIMESTAMP TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
        CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_baseline_updated_at') THEN
        CREATE TRIGGER set_baseline_updated_at BEFORE UPDATE ON public.baseline_onboarding FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_thresholds_updated_at') THEN
        CREATE TRIGGER set_thresholds_updated_at BEFORE UPDATE ON public.user_thresholds FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_reminders_updated_at') THEN
        CREATE TRIGGER set_reminders_updated_at BEFORE UPDATE ON public.user_reminders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_recipes_updated_at') THEN
        CREATE TRIGGER set_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exercise_routines_updated_at') THEN
        CREATE TRIGGER set_exercise_routines_updated_at BEFORE UPDATE ON public.exercise_routines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_feedback_updated_at') THEN
        CREATE TRIGGER set_feedback_updated_at BEFORE UPDATE ON public.feedback_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- ============================================================================
-- 2. AUDIT LOG IMMUTABILITY TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_admin_activity_tampering()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow FK cascade: Postgres SET NULL when the referenced user is deleted.
    -- This only permits nullifying admin_user_id while all audit data fields stay unchanged.
    IF TG_OP = 'UPDATE'
       AND OLD.admin_user_id IS NOT NULL
       AND NEW.admin_user_id IS NULL
       AND OLD.action          IS NOT DISTINCT FROM NEW.action
       AND OLD.target_type     IS NOT DISTINCT FROM NEW.target_type
       AND OLD.target_id       IS NOT DISTINCT FROM NEW.target_id
       AND OLD.target_name     IS NOT DISTINCT FROM NEW.target_name
       AND OLD.admin_name      IS NOT DISTINCT FROM NEW.admin_name
       AND OLD.details         IS NOT DISTINCT FROM NEW.details
    THEN
        RETURN NEW;  -- allow the cascade nullification
    END IF;

    RAISE EXCEPTION 'Audit records in admin_activity_logs are strictly immutable. UPDATE and DELETE operations are denied.';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deny_activity_log_modification') THEN
        CREATE TRIGGER deny_activity_log_modification
        BEFORE UPDATE OR DELETE ON public.admin_activity_logs
        FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_activity_tampering();
    END IF;
END $$;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_team_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hss_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES (Defense-in-Depth for End-User Direct JWT Access)
-- ============================================================================

-- Helper functions for role checks
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::jsonb->>'role',
        (SELECT role FROM public.profiles WHERE id = auth.uid())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile or staff view patients" ON public.profiles;
    CREATE POLICY "Users can view own profile or staff view patients" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.get_auth_role() IN ('admin', 'super_admin', 'medical_expert')
    );

    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
END $$;

-- Baseline Onboarding Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own baseline" ON public.baseline_onboarding;
    CREATE POLICY "Users manage own baseline" ON public.baseline_onboarding
    FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Staff can read baseline" ON public.baseline_onboarding;
    CREATE POLICY "Staff can read baseline" ON public.baseline_onboarding
    FOR SELECT USING (public.get_auth_role() IN ('admin', 'super_admin', 'medical_expert'));
END $$;

-- User Configuration (Thresholds, Reminders, Care Team)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own thresholds" ON public.user_thresholds;
    CREATE POLICY "Users manage own thresholds" ON public.user_thresholds FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own reminders" ON public.user_reminders;
    CREATE POLICY "Users manage own reminders" ON public.user_reminders FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own care team" ON public.care_team_contacts;
    CREATE POLICY "Users manage own care team" ON public.care_team_contacts FOR ALL USING (auth.uid() = user_id);
END $$;

-- Patient Telemetry (Health Logs, Meals, Exercises, Sleep, HSS History)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own health logs" ON public.daily_health_logs;
    CREATE POLICY "Users manage own health logs" ON public.daily_health_logs FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own meals" ON public.meal_logs;
    CREATE POLICY "Users manage own meals" ON public.meal_logs FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own exercises" ON public.exercise_logs;
    CREATE POLICY "Users manage own exercises" ON public.exercise_logs FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own sleep" ON public.sleep_logs;
    CREATE POLICY "Users manage own sleep" ON public.sleep_logs FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users read own HSS" ON public.hss_history;
    CREATE POLICY "Users read own HSS" ON public.hss_history FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Experts read telemetry for case review" ON public.daily_health_logs;
    CREATE POLICY "Experts read telemetry for case review" ON public.daily_health_logs FOR SELECT USING (public.get_auth_role() = 'medical_expert');
END $$;

-- Notifications Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users access own notifications" ON public.patient_notifications;
    CREATE POLICY "Users access own notifications" ON public.patient_notifications FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Anyone can read broadcasts" ON public.system_broadcasts;
    CREATE POLICY "Anyone can read broadcasts" ON public.system_broadcasts FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.system_broadcasts;
    CREATE POLICY "Admins manage broadcasts" ON public.system_broadcasts FOR ALL USING (public.get_auth_role() IN ('admin', 'super_admin'));
END $$;

-- Global Content & Bookmarks
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone reads published recipes" ON public.recipes;
    CREATE POLICY "Anyone reads published recipes" ON public.recipes FOR SELECT USING (status = 'published' OR public.get_auth_role() IN ('admin', 'super_admin', 'medical_expert'));

    DROP POLICY IF EXISTS "Anyone reads published routines" ON public.exercise_routines;
    CREATE POLICY "Anyone reads published routines" ON public.exercise_routines FOR SELECT USING (status = 'published' OR public.get_auth_role() IN ('admin', 'super_admin', 'medical_expert'));

    DROP POLICY IF EXISTS "Anyone reads clinics" ON public.clinics;
    CREATE POLICY "Anyone reads clinics" ON public.clinics FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users manage saved recipes" ON public.saved_recipes;
    CREATE POLICY "Users manage saved recipes" ON public.saved_recipes FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage saved exercises" ON public.saved_exercises;
    CREATE POLICY "Users manage saved exercises" ON public.saved_exercises FOR ALL USING (auth.uid() = user_id);
END $$;

-- Admin Activity Log Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins view activity logs" ON public.admin_activity_logs;
    CREATE POLICY "Admins view activity logs" ON public.admin_activity_logs FOR SELECT USING (public.get_auth_role() IN ('admin', 'super_admin'));
END $$;

-- Admin Notifications Policies (were missing — causing 500 on GET /api/admin/notifications)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins manage admin notifications" ON public.admin_notifications;
    CREATE POLICY "Admins manage admin notifications" ON public.admin_notifications
    FOR ALL USING (public.get_auth_role() IN ('admin', 'super_admin'));

    DROP POLICY IF EXISTS "Admins manage notification reads" ON public.admin_notification_reads;
    CREATE POLICY "Admins manage notification reads" ON public.admin_notification_reads
    FOR ALL USING (public.get_auth_role() IN ('admin', 'super_admin'));
END $$;

-- Feedback Tickets Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users insert own feedback" ON public.feedback_tickets;
    CREATE POLICY "Users insert own feedback" ON public.feedback_tickets FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

    DROP POLICY IF EXISTS "Users read own feedback" ON public.feedback_tickets;
    CREATE POLICY "Users read own feedback" ON public.feedback_tickets FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Admins manage feedback" ON public.feedback_tickets;
    CREATE POLICY "Admins manage feedback" ON public.feedback_tickets FOR ALL USING (public.get_auth_role() IN ('admin', 'super_admin'));
END $$;

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKETS PROVISIONING
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('recipes', 'recipes', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('exercises', 'exercises', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies
DO $$ BEGIN
    -- Avatars: Public read, authenticated user write to own folder
    DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
    CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
    CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]
    );

    -- Recipes & Exercises: Public read, staff upload
    DROP POLICY IF EXISTS "Public recipe images" ON storage.objects;
    CREATE POLICY "Public recipe images" ON storage.objects FOR SELECT USING (bucket_id IN ('recipes', 'exercises'));
END $$;
