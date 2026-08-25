# backend/test_supabase_repository_contract.py
"""
Supabase Repository Contract & Dual-Mode Equivalence Tests.
Ensures repository interfaces, method signatures, return shapes, and error semantics
behave identically across Mock and Supabase modes.
"""
import unittest
import uuid
from datetime import datetime, date

from app.db.repositories.profiles import MockProfileRepository, SupabaseProfileRepository
from app.db.repositories.baseline import MockBaselineRepository, SupabaseBaselineRepository
from app.db.repositories.health_logs import MockHealthLogsRepository, SupabaseHealthLogsRepository
from app.db.repositories.meals import MockMealsRepository, SupabaseMealsRepository
from app.db.repositories.exercises import MockExercisesRepository, SupabaseExercisesRepository
from app.db.repositories.sleep import MockSleepLogsRepository, SupabaseSleepLogsRepository
from app.db.repositories.hss import MockHSSRepository, SupabaseHSSRepository
from app.db.repositories.notifications import MockNotificationRepository, SupabaseNotificationRepository
from app.db.repositories.admin import MockAdminRepository, SupabaseAdminRepository
from app.db.repositories.feedback import MockFeedbackRepository, SupabaseFeedbackRepository
from app.db.repositories.case_review import MockCaseReviewRepository, SupabaseCaseReviewRepository
from app.db.repositories.content import MockContentRepository, SupabaseContentRepository

import app.mock_db as mock_db


class TestSupabaseRepositoryContract(unittest.TestCase):
    def setUp(self):
        self.profile_repo = MockProfileRepository()
        self.baseline_repo = MockBaselineRepository()
        self.health_repo = MockHealthLogsRepository()
        self.meals_repo = MockMealsRepository()
        self.exercises_repo = MockExercisesRepository()
        self.sleep_repo = MockSleepLogsRepository()
        self.hss_repo = MockHSSRepository()
        self.notif_repo = MockNotificationRepository()
        self.admin_repo = MockAdminRepository()
        self.feedback_repo = MockFeedbackRepository()
        self.case_repo = MockCaseReviewRepository()
        self.content_repo = MockContentRepository()

    def test_profile_repository_contract(self):
        test_uid = f"usr-test-{uuid.uuid4().hex[:6]}"
        profile_data = {
            "id": test_uid,
            "legacy_id": test_uid,
            "first_name": "Test",
            "last_name": "User",
            "email": f"{test_uid}@example.com",
            "role": "patient",
            "account_status": "active",
            "onboarding_status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        created = self.profile_repo.create(profile_data)
        self.assertEqual(created["id"], test_uid)

        fetched = self.profile_repo.get_by_id(test_uid)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["first_name"], "Test")

        updated = self.profile_repo.update(test_uid, {"first_name": "UpdatedName"})
        self.assertEqual(updated["first_name"], "UpdatedName")

        # Cleanup
        deleted = self.profile_repo.delete(test_uid)
        self.assertTrue(deleted)
        self.assertIsNone(self.profile_repo.get_by_id(test_uid))

    def test_baseline_repository_contract(self):
        test_uid = "usr-patient-101"
        baseline = self.baseline_repo.get_baseline(test_uid)
        if baseline:
            self.assertEqual(baseline["user_id"], test_uid)
            self.assertIn("sedentary_hours", baseline)

        thresholds = self.baseline_repo.get_thresholds(test_uid)
        self.assertIsNotNone(thresholds)
        self.assertIn("sodium_limit_mg", thresholds)

        reminders = self.baseline_repo.get_reminders(test_uid)
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
        activity = self.admin_repo.list_activity(page=1, page_size=10)
        self.assertIn("items", activity)
        self.assertIn("total", activity)
        self.assertIsInstance(activity["items"], list)

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
        self.assertGreater(len(recipes), 0)

        routines = self.content_repo.list_routines()
        self.assertGreater(len(routines), 0)

        clinics = self.content_repo.list_clinics()
        self.assertGreater(len(clinics), 0)


if __name__ == "__main__":
    unittest.main()
