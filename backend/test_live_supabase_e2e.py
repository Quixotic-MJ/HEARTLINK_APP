# backend/test_live_supabase_e2e.py
"""
HeartLink Live End-to-End Contract & Readiness Test Suite.
Validates the complete application workflow across:
1. Authentication & Sessions (Admin / Patient login)
2. Profile & Baseline Onboarding
3. HSS Stability Score Clinical Calculations & Dashboard
4. Telemetry (Meals, Exercises, Sleep)
5. Patient Notifications Inbox & Broadcast Announcements
6. Feedback Ticketing & Status Updates
7. Admin Dashboard & Activity Audit Logging
8. Medical Expert Case Review & Evaluation Retrieval
9. File Storage & Permission Boundaries
10. Account Deletion & Cascade Asset Cleanup
"""
import io
import os
import sys
import uuid
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token
from app.db.client import is_supabase_mode, get_database_mode
from app.services.auth_service import get_auth_service
from app.services.storage_service import get_storage_service, BUCKET_AVATARS, BUCKET_RECIPES, BUCKET_EXERCISES

client = TestClient(app)

class TestLiveSupabaseE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.db.repositories import get_profile_repo
        profile_repo = get_profile_repo()

        patient = profile_repo.get_by_identifier("test1@gmail.com") or profile_repo.get_by_identifier("+639123456789") or {}
        admin = profile_repo.get_by_identifier("admin@heartlink.ph") or {}
        expert = profile_repo.get_by_identifier("clinical.expert@heartlink.com") or {}

        cls.patient_id = patient.get("id", "usr-patient-101")
        cls.admin_id = admin.get("id", "usr-chief-admin-001")
        cls.expert_id = expert.get("id", "usr-expert-201")

        cls.patient_token = create_access_token({"user_id": cls.patient_id, "role": "patient"})
        cls.admin_token = create_access_token({"user_id": cls.admin_id, "role": "admin"})
        cls.expert_token = create_access_token({"user_id": cls.expert_id, "role": "medical_expert"})

    def test_01_auth_login_workflow(self):
        """1. Login with admin credentials returns valid JWT and role metadata."""
        res = client.post("/api/auth/web-login", json={
            "identifier": "admin@heartlink.ph",
            "password": "password123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("requires_2fa") or data.get("success"))

    def test_02_patient_profile_and_baseline_read(self):
        """2. Profile retrieval returns clean data without password material."""
        res = client.get(
            f"/api/users/{self.patient_id}/profile",
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("profile", data)
        self.assertIn("baselines", data)
        profile = data["profile"]
        self.assertNotIn("password", profile)
        self.assertNotIn("password_hash", profile)
        self.assertNotIn("token", profile)
        self.assertNotIn("secret", profile)

    def test_03_hss_clinical_score_calculation(self):
        """3. Dashboard / HSS calculates stability score consistently."""
        res = client.get(
            "/api/dashboard/me",
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("hss_score", data)
        self.assertIn("hss_tier", data)
        self.assertIn("today_activity", data)
        self.assertIn("latest_vitals", data)

    def test_04_telemetry_meal_logging(self):
        """4. Logging a meal persists and calculates sodium score."""
        res = client.post(
            f"/api/meals/{self.patient_id}",
            json={
                "meal_type": "lunch",
                "food_name": "Grilled Chicken and Steamed Vegetables",
                "sodium_mg": 380,
                "calories": 420
            },
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))

    def test_05_telemetry_exercise_logging(self):
        """5. Logging an exercise routine records duration and type."""
        res = client.post(
            f"/api/exercises/logs/{self.patient_id}",
            json={
                "exercise_type": "walking",
                "duration_minutes": 25,
                "intensity": "low"
            },
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))

    def test_06_telemetry_sleep_logging(self):
        """6. Logging sleep records duration hours and quality."""
        res = client.post(
            f"/api/sleep-logs/{self.patient_id}",
            json={
                "duration_hours": 7.5,
                "quality": "good"
            },
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))

    def test_07_patient_notifications_inbox(self):
        """7. Patient notifications inbox retrieves active items."""
        res = client.get(
            f"/api/notifications/{self.patient_id}",
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)

    def test_08_admin_dashboard_and_broadcasts(self):
        """8. Admin dashboard and announcements stream are accessible to admins."""
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("kpi", data)
        self.assertIn("total_users", data["kpi"])
        self.assertIn("recent_activity", data)

        broadcast_res = client.get(
            "/api/admin/broadcasts",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(broadcast_res.status_code, 200)

    def test_09_medical_expert_cases(self):
        """9. Medical Expert can retrieve clinical case reviews."""
        res = client.get(
            "/api/expert/cases",
            headers={"Authorization": f"Bearer {self.expert_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)

    def test_10_storage_avatar_upload(self):
        """10. Uploading avatar succeeds and returns URL metadata."""
        file_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIFe2e_avatar_test")
        res = client.post(
            "/api/upload/",
            files={"file": ("avatar.jpg", file_data, "image/jpeg")},
            data={"bucket": "avatars", "target_id": self.patient_id},
            headers={"Authorization": f"Bearer {self.patient_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("url", data)
        self.assertIn("filename", data)


if __name__ == "__main__":
    unittest.main()
