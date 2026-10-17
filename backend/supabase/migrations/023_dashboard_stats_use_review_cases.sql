-- backend/supabase/migrations/023_dashboard_stats_use_review_cases.sql
-- Fix: migration 022 rebuilt expert_evaluations without user_id, but get_admin_dashboard_stats (019)
-- still read it, so the admin dashboard returned 500 ("column c.user_id does not exist").
-- The two review counts now come from review_cases (HL-053): completed rounds, and open rounds in the queue.
-- Everything else is unchanged from 019.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(days_cutoff INT DEFAULT 7)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    cutoff timestamptz;
    v_total_users INT;
    v_open_alerts INT;
    v_pending_evaluations INT;
    v_active_users INT;
    v_recipes INT;
    v_routines INT;
    v_evaluations INT;
    v_meals_this_week INT;
    v_exercises_this_week INT;
    v_vitals_this_week INT;
    v_sleep_this_week INT;
    v_symptoms_this_week INT;
    v_avg_hss INT;
    v_critical_hss INT := 0;
    v_elevated_hss INT := 0;
    v_moderate_hss INT := 0;
    v_stable_hss INT := 0;
    v_total_scored INT := 0;
BEGIN
    -- Timestamptz calculation based on schema
    cutoff := now() - (days_cutoff || ' days')::interval;

    SELECT COUNT(*) INTO v_total_users FROM public.profiles WHERE role = 'patient';

    SELECT COUNT(*) INTO v_open_alerts FROM public.clinical_alerts WHERE status != 'Resolved';

    SELECT COUNT(*) INTO v_recipes FROM public.recipes;
    SELECT COUNT(*) INTO v_routines FROM public.exercise_routines;

    -- Review rounds (HL-053): completed reviews, and cases still waiting in the queue
    SELECT COUNT(*) INTO v_evaluations FROM public.review_cases WHERE status = 'complete';
    SELECT COUNT(*) INTO v_pending_evaluations FROM public.review_cases WHERE status = 'open';

    -- active users (any log in last 7 days from patient tables)
    SELECT COUNT(DISTINCT user_id) INTO v_active_users
    FROM (
        SELECT user_id FROM public.meal_logs WHERE logged_at >= cutoff
        UNION
        SELECT user_id FROM public.exercise_logs WHERE logged_at >= cutoff
        UNION
        SELECT user_id FROM public.sleep_logs WHERE logged_at >= cutoff AND is_deleted = false
        UNION
        SELECT user_id FROM public.daily_health_logs WHERE logged_at >= cutoff
    ) active;

    -- weekly activity counts
    SELECT COUNT(*) INTO v_meals_this_week FROM public.meal_logs WHERE logged_at >= cutoff;
    SELECT COUNT(*) INTO v_exercises_this_week FROM public.exercise_logs WHERE logged_at >= cutoff;
    SELECT COUNT(*) INTO v_vitals_this_week FROM public.daily_health_logs WHERE logged_at >= cutoff;
    SELECT COUNT(*) INTO v_sleep_this_week FROM public.sleep_logs WHERE logged_at >= cutoff AND is_deleted = false;

    -- symptoms count (symptoms is a native text[] column)
    -- coalesce handles nulls
    SELECT COALESCE(SUM(cardinality(symptoms)), 0) INTO v_symptoms_this_week
    FROM public.daily_health_logs WHERE logged_at >= cutoff AND symptoms IS NOT NULL;

    -- latest HSS per user
    WITH latest_hss AS (
        SELECT user_id, score,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY computed_at DESC) as rn
        FROM public.hss_history
    ),
    valid_scores AS (
        SELECT lh.score FROM latest_hss lh
        JOIN public.profiles p ON p.id = lh.user_id
        WHERE lh.rn = 1 AND p.role = 'patient' AND lh.score IS NOT NULL
    )
    SELECT
        COALESCE(ROUND(AVG(score)), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE score < 50),
        COUNT(*) FILTER (WHERE score >= 50 AND score < 60),
        COUNT(*) FILTER (WHERE score >= 60 AND score < 80),
        COUNT(*) FILTER (WHERE score >= 80)
    INTO v_avg_hss, v_total_scored, v_critical_hss, v_elevated_hss, v_moderate_hss, v_stable_hss
    FROM valid_scores;

    RETURN json_build_object(
        'total_users', v_total_users,
        'active_users', v_active_users,
        'avg_hss', v_avg_hss,
        'hss_distribution', json_build_object(
            'stable', json_build_object('count', v_stable_hss, 'percentage', CASE WHEN v_total_scored > 0 THEN ROUND((v_stable_hss::numeric / v_total_scored) * 100) ELSE 0 END),
            'moderate', json_build_object('count', v_moderate_hss, 'percentage', CASE WHEN v_total_scored > 0 THEN ROUND((v_moderate_hss::numeric / v_total_scored) * 100) ELSE 0 END),
            'elevated_risk', json_build_object('count', v_elevated_hss, 'percentage', CASE WHEN v_total_scored > 0 THEN ROUND((v_elevated_hss::numeric / v_total_scored) * 100) ELSE 0 END),
            'critical', json_build_object('count', v_critical_hss, 'percentage', CASE WHEN v_total_scored > 0 THEN ROUND((v_critical_hss::numeric / v_total_scored) * 100) ELSE 0 END)
        ),
        'users_needing_review', json_build_object(
            'critical_hss', v_critical_hss,
            'symptoms_recorded', v_symptoms_this_week,
            'pending_evaluations', v_pending_evaluations,
            'open_alerts', v_open_alerts
        ),
        'user_activity', json_build_object(
            'meals', v_meals_this_week,
            'exercise', v_exercises_this_week,
            'vitals', v_vitals_this_week,
            'sleep', v_sleep_this_week,
            'symptoms', v_symptoms_this_week
        ),
        'content_library', json_build_object(
            'recipes', v_recipes,
            'routines', v_routines,
            'evaluations', v_evaluations
        )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(integer) TO service_role;
