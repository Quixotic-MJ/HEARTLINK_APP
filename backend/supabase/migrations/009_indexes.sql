-- backend/supabase/migrations/009_indexes.sql
-- High-Performance Query Indexes for Production Access Patterns

-- 1. Daily Health Logs (User Timeline & Recent Vitals)
CREATE INDEX IF NOT EXISTS idx_health_logs_user_logged ON public.daily_health_logs (user_id, logged_at DESC);

-- 2. Meal Logs (Daily Calorie/Sodium Summaries)
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_logged ON public.meal_logs (user_id, logged_at DESC);

-- 3. Exercise Logs (Activity Adherence Tracking)
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_logged ON public.exercise_logs (user_id, logged_at DESC);

-- 4. Sleep Logs (Sleep Trends)
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_logged ON public.sleep_logs (user_id, logged_at DESC);

-- 5. HSS History (Latest Stability Score Retrieval)
CREATE INDEX IF NOT EXISTS idx_hss_history_user_computed ON public.hss_history (user_id, computed_at DESC);

-- 6. Patient Notifications (Inbox & Unread Partial Index)
CREATE INDEX IF NOT EXISTS idx_patient_notif_user_read ON public.patient_notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_patient_notif_unread ON public.patient_notifications (user_id) WHERE read = false;

-- 7. Admin Activity Logs (Chronological Audit Stream)
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON public.admin_activity_logs (created_at DESC);

-- 8. Feedback Tickets (Status Filter & Chronological Queue)
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON public.feedback_tickets (status, created_at DESC);

-- 9. Clinical Expert Evaluations (Case Review per Patient)
CREATE INDEX IF NOT EXISTS idx_evaluations_user_created ON public.expert_evaluations (user_id, created_at DESC);

-- 10. Clinical Alerts (Active & Unresolved Alerts)
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON public.clinical_alerts (user_id, created_at DESC);

-- 11. Admin Notifications (Newest First)
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON public.admin_notifications (created_at DESC);

-- 12. System Broadcasts (Active Announcements)
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON public.system_broadcasts (created_at DESC);
