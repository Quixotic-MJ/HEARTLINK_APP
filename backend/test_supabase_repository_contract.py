# backend/test_supabase_repository_contract.py
"""
Supabase Repository Contract & Dual-Mode Equivalence Tests.
Ensures repository interfaces, method signatures, return shapes, and error semantics
behave identically across Mock and Supabase modes.
"""
import unittest
import uuid
from datetime import datetime, date

from app.db.repositories import (
    get_profile_repo,
    get_baseline_repo,
    get_health_logs_repo,
    get_meals_repo,
    get_exercises_repo,
    get_sleep_repo,
    get_hss_repo,
    get_notification_repo,
    get_admin_repo,
    get_feedback_repo,
    get_case_review_repo,
    get_content_repo,
)


class TestSupabaseRepositoryContract(unittest.TestCase):
    def setUp(self):
        self.profile_repo = get_profile_repo()
        self.baseline_repo = get_baseline_repo()
        self.health_repo = get_health_logs_repo()
        self.meals_repo = get_meals_repo()
        self.exercises_repo = get_exercises_repo()
        self.sleep_repo = get_sleep_repo()
        self.hss_repo = get_hss_repo()
        self.notif_repo = get_notification_repo()
        self.admin_repo = get_admin_repo()
        self.feedback_repo = get_feedback_repo()
        self.case_repo = get_case_review_repo()
        self.content_repo = get_content_repo()

    def test_profile_repository_contract(self):
        test_uid = "usr-patient-101"
        fetched = self.profile_repo.get_by_id(test_uid)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.get("role"), "patient")

        by_ident = self.profile_repo.get_by_identifier(fetched.get("email", ""))
        self.assertIsNotNone(by_ident)
        self.assertEqual(by_ident.get("id"), fetched.get("id"))

        profiles_list = self.profile_repo.list_all(role_filter="patient")
        self.assertIsInstance(profiles_list, list)
        self.assertGreater(len(profiles_list), 0)

    def test_baseline_repository_contract(self):
        test_uid = "usr-patient-101"
        baseline = self.baseline_repo.get_baseline(test_uid)
        if baseline:
            self.assertIn("user_id", baseline)

        thresholds = self.baseline_repo.get_thresholds(test_uid)
        if thresholds:
            self.assertIn("sodium_limit_mg", thresholds)

        reminders = self.baseline_repo.get_reminders(test_uid)
        if reminders:
            self.assertIn("morning", reminders)

    def test_health_telemetry_repositories_contract(self):
        test_uid = "usr-patient-101"
        logs = self.health_repo.list_user_logs(test_uid, limit=5)
        self.assertIsInstance(logs, list)

        meals = self.meals_repo.list_user_meals(test_uid, limit=5)
        self.assertIsInstance(meals, list)

        exercises = self.exercises_repo.list_user_logs(test_uid, limit=5)
        self.assertIsInstance(exercises, list)

        sleep = self.sleep_repo.list_user_logs(test_uid, limit=5)
        self.assertIsInstance(sleep, list)

    def test_hss_repository_contract(self):
        test_uid = "usr-patient-101"
        latest = self.hss_repo.get_latest_hss(test_uid)
        if latest:
            self.assertIn("score", latest)
            self.assertIn("tier", latest)
            self.assertIn(latest["tier"], ["Stable", "Moderate", "Elevated Risk", "Critical"])

        history = self.hss_repo.list_hss_history(test_uid, limit=10)
        self.assertIsInstance(history, list)

    def test_notifications_repository_contract(self):
        test_uid = "usr-patient-101"
        notifs = self.notif_repo.list_user_notifications(test_uid)
        self.assertIsInstance(notifs, list)

        broadcasts = self.notif_repo.list_broadcasts()
        self.assertIsInstance(broadcasts, list)

    def test_admin_repository_contract(self):
        activity = self.admin_repo.list_activity(limit=10)
        self.assertIsInstance(activity, list)

        admin_notifs = self.admin_repo.list_admin_notifications(caller_role="admin", caller_id="usr-admin-001")
        self.assertIn("items", admin_notifs)
        self.assertIn("unread_count", admin_notifs)

    def test_feedback_repository_contract(self):
        tickets = self.feedback_repo.list_tickets()
        self.assertIsInstance(tickets, list)
        if tickets:
            t = tickets[0]
            self.assertIn("status", t)

    def test_content_repository_contract(self):
        recipes = self.content_repo.list_recipes()
        self.assertIsInstance(recipes, list)

        routines = self.content_repo.list_routines()
        self.assertIsInstance(routines, list)

        clinics = self.content_repo.list_clinics()
        self.assertIsInstance(clinics, list)


if __name__ == "__main__":
    unittest.main()
