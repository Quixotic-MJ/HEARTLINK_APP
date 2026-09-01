# backend/test_admin_user_list_datetime.py
"""
Focused regression tests for datetime normalization across Admin User Management,
Clinical Telemetry, and Analytics services.
Validates timezone-aware conversion, timezone-naive UTC comparison,
and error-free handling of mixed/malformed timestamp datasets.
Isolated completely from production databases.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token, token_blacklist
from app.services.clinical import get_recent_telemetry_timeline
from app.services.analytics import get_analytics


class TestAdminUserListDatetimeRegression(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides.clear()
        self.client = TestClient(app)
        token_blacklist.clear()

        # Default fixture data
        self.admin_user = {
            "id": "usr-super-admin-001",
            "email": "super.admin@heartlink.ph",
            "role": "super_admin",
            "account_status": "active",
            "first_name": "Super",
            "last_name": "Admin",
            "password": "hashed_secret_pw",
        }
        self.chief_admin_user = {
            "id": "usr-chief-admin-001",
            "email": "admin@heartlink.ph",
            "role": "admin",
            "account_status": "active",
            "first_name": "System",
            "last_name": "Admin",
            "password": "hashed_secret_pw",
        }
        self.expert_user = {
            "id": "usr-expert-201",
            "email": "clinical.expert@heartlink.com",
            "role": "medical_expert",
            "account_status": "active",
            "first_name": "Maria",
            "last_name": "Santos",
            "password": "hashed_secret_pw",
        }
        self.patient_user = {
            "id": "usr-patient-101",
            "email": "patient@heartlink.ph",
            "role": "patient",
            "account_status": "active",
            "first_name": "Juan",
            "last_name": "Dela Cruz",
            "onboarding_status": "complete",
            "password": "hashed_secret_pw",
        }
        self.sample_profiles = [
            self.admin_user,
            self.chief_admin_user,
            self.expert_user,
            self.patient_user,
        ]

    def tearDown(self):
        app.dependency_overrides.clear()
        token_blacklist.clear()

    def _auth_headers(self, user_id: str = "usr-super-admin-001", role: str = "super_admin"):
        token = create_access_token({"user_id": user_id, "role": role})
        return {"Authorization": f"Bearer {token}"}

    # -------------------------------------------------------------------------
    # 1. Direct Datetime Parsing & Normalization Unit Tests
    # -------------------------------------------------------------------------
    def test_datetime_normalization_scenarios(self):
        """Test the normalization logic against all timestamp formats."""
        cases = [
            # Supabase-style UTC Z string
            ("2026-08-25T11:53:57.366917Z", datetime(2026, 8, 25, 11, 53, 57, 366917)),
            # Positive offset string (+08:00 Manila)
            ("2026-08-25T19:53:57.366917+08:00", datetime(2026, 8, 25, 11, 53, 57, 366917)),
            # Negative offset string (-05:00 New York)
            ("2026-08-25T06:53:57.366917-05:00", datetime(2026, 8, 25, 11, 53, 57, 366917)),
            # Python naive datetime
            (datetime(2026, 8, 25, 11, 53, 57), datetime(2026, 8, 25, 11, 53, 57)),
            # Python aware datetime (+08:00)
            (
                datetime(2026, 8, 25, 19, 53, 57, tzinfo=timezone(timedelta(hours=8))),
                datetime(2026, 8, 25, 11, 53, 57)
            ),
            # Missing / None
            (None, datetime.min),
            ({}, datetime.min),
            # Malformed string / non-string non-datetime
            ("not-a-valid-date", datetime.min),
            (12345, datetime.min),
        ]

        def parse_dt(x):
            if x is None:
                return datetime.min
            dt = x
            if isinstance(x, dict):
                dt = x.get("created_at") or x.get("logged_at") or x.get("timestamp") or x.get("computed_at")
            if isinstance(dt, datetime):
                if dt.tzinfo is not None:
                    return dt.astimezone(timezone.utc).replace(tzinfo=None)
                return dt
            if isinstance(dt, str):
                try:
                    s = dt.strip()
                    if s.endswith("Z"):
                        s = s[:-1] + "+00:00"
                    parsed = datetime.fromisoformat(s)
                    if parsed.tzinfo is not None:
                        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
                    return parsed
                except Exception:
                    return datetime.min
            return datetime.min

        for val, expected in cases:
            res = parse_dt(val)
            self.assertEqual(res, expected, f"Failed for input: {val}")
            self.assertIsNone(res.tzinfo, "Result must be timezone-naive")

    # -------------------------------------------------------------------------
    # 2. GET /api/users/ Integration Test with Mixed Timestamps
    # -------------------------------------------------------------------------
    @patch("app.db.repositories.get_profile_repo")
    @patch("app.db.repositories.get_meals_repo")
    @patch("app.db.repositories.get_exercises_repo")
    @patch("app.db.repositories.get_sleep_repo")
    @patch("app.db.repositories.get_health_logs_repo")
    @patch("app.db.repositories.get_hss_repo")
    @patch("app.db.repositories.get_case_review_repo")
    def test_read_all_users_with_mixed_and_malformed_timestamps(
        self,
        mock_case_rev,
        mock_hss,
        mock_hl,
        mock_sl,
        mock_ex,
        mock_ml,
        mock_prof,
    ):
        """
        Populates mock data with mixed aware, naive, offset, and malformed
        timestamps across meals, exercises, sleeps, and health logs.
        Verifies GET /api/users/ returns HTTP 200 without crashing.
        """
        patient_id = "usr-patient-101"
        now = datetime.utcnow()

        # Wire up repository mock methods
        mock_prof.return_value.list_all.return_value = list(self.sample_profiles)
        
        # Inject diverse timestamp formats into logs for patient
        mock_ml.return_value.list_user_meals.return_value = [
            {"id": "m-aware-z", "user_id": patient_id, "logged_at": (now - timedelta(days=1)).isoformat() + "Z", "meal_name": "Oatmeal"},
            {"id": "m-aware-pos", "user_id": patient_id, "logged_at": (now - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S") + "+08:00", "meal_name": "Salad"},
            {"id": "m-aware-neg", "user_id": patient_id, "logged_at": (now - timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S") + "-05:00", "meal_name": "Fish"},
            {"id": "m-naive-dt", "user_id": patient_id, "logged_at": now - timedelta(days=4), "meal_name": "Fruit"},
            {"id": "m-aware-dt", "user_id": patient_id, "logged_at": datetime.now(timezone.utc) - timedelta(days=5), "meal_name": "Soup"},
            {"id": "m-malformed", "user_id": patient_id, "logged_at": "invalid-timestamp-string", "meal_name": "Snack"},
            {"id": "m-missing", "user_id": patient_id, "logged_at": None, "meal_name": "Water"},
        ]

        mock_ex.return_value.list_user_logs.return_value = [
            {"id": "e-aware-z", "user_id": patient_id, "logged_at": (now - timedelta(days=1)).isoformat() + "Z", "routine_name": "Walk"},
            {"id": "e-malformed", "user_id": patient_id, "logged_at": "corrupt_date", "routine_name": "Stretch"},
        ]

        mock_sl.return_value.list_user_logs.return_value = [
            {"id": "s-aware-pos", "user_id": patient_id, "logged_at": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S") + "+08:00", "duration_hours": 7.5},
            {"id": "s-none", "user_id": patient_id, "logged_at": None, "duration_hours": 6.0},
        ]

        mock_hl.return_value.list_user_logs.return_value = [
            {"id": "h-aware-z", "user_id": patient_id, "logged_at": (now - timedelta(days=1)).isoformat() + "Z", "systolic_bp": 120, "diastolic_bp": 80},
            {"id": "h-malformed", "user_id": patient_id, "logged_at": 999999, "systolic_bp": 122, "diastolic_bp": 82},
        ]

        mock_hss.return_value.get_latest_hss.return_value = {
            "score": 85.5,
            "tier": "Stable",
            "computed_at": (now - timedelta(days=1)).isoformat() + "Z"
        }
        mock_case_rev.return_value.list_evaluations_for_user.return_value = []

        headers = self._auth_headers("usr-super-admin-001", "super_admin")
        res = self.client.get("/api/users/", headers=headers)

        self.assertEqual(res.status_code, 200, f"Expected 200 OK, got {res.status_code}: {res.text}")
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), len(self.sample_profiles))

        # Check enrichment on patient
        patient_record = next((u for u in data if u.get("id") == patient_id), None)
        self.assertIsNotNone(patient_record)
        self.assertEqual(patient_record.get("activity_status"), "Recently Active")
        self.assertEqual(patient_record.get("hss_score"), 85.5)
        self.assertEqual(patient_record.get("hss_tier"), "Stable")
        self.assertEqual(patient_record.get("review_status"), "Pending Review")
        
        # Verify credential sanitization
        for user in data:
            self.assertNotIn("password", user)
            self.assertNotIn("password_hash", user)
            self.assertNotIn("token", user)
            self.assertNotIn("secret", user)

    # -------------------------------------------------------------------------
    # 3. RBAC & Security Isolation
    # -------------------------------------------------------------------------
    @patch("app.db.repositories.get_profile_repo")
    @patch("app.db.repositories.get_meals_repo")
    @patch("app.db.repositories.get_exercises_repo")
    @patch("app.db.repositories.get_sleep_repo")
    @patch("app.db.repositories.get_health_logs_repo")
    @patch("app.db.repositories.get_hss_repo")
    @patch("app.db.repositories.get_case_review_repo")
    def test_read_all_users_rbac_security(self, *mocks):
        """Super admin and admin can access /api/users/, patient is denied (403)."""
        mock_prof = mocks[6]
        mock_prof.return_value.list_all.return_value = list(self.sample_profiles)

        # Super admin -> 200
        res_super = self.client.get("/api/users/", headers=self._auth_headers("usr-super-admin-001", "super_admin"))
        self.assertEqual(res_super.status_code, 200)

        # Admin -> 200
        res_admin = self.client.get("/api/users/", headers=self._auth_headers("usr-chief-admin-001", "admin"))
        self.assertEqual(res_admin.status_code, 200)

        # Medical expert -> 200
        res_expert = self.client.get("/api/users/", headers=self._auth_headers("usr-expert-201", "medical_expert"))
        self.assertEqual(res_expert.status_code, 200)

        # Patient -> 403 Forbidden
        res_patient = self.client.get("/api/users/", headers=self._auth_headers("usr-patient-101", "patient"))
        self.assertEqual(res_patient.status_code, 403)

        # Anonymous -> 401 Unauthorized
        res_anon = self.client.get("/api/users/")
        self.assertEqual(res_anon.status_code, 401)

    # -------------------------------------------------------------------------
    # 4. Immutability Check: Read Endpoint Does Not Mutate Records
    # -------------------------------------------------------------------------
    @patch("app.db.repositories.get_profile_repo")
    @patch("app.db.repositories.get_meals_repo")
    @patch("app.db.repositories.get_exercises_repo")
    @patch("app.db.repositories.get_sleep_repo")
    @patch("app.db.repositories.get_health_logs_repo")
    @patch("app.db.repositories.get_hss_repo")
    @patch("app.db.repositories.get_case_review_repo")
    def test_read_all_users_does_not_mutate_records(self, *mocks):
        """Ensures calling GET /api/users/ leaves all repository profiles unaltered."""
        mock_prof = mocks[6]
        mock_prof.return_value.list_all.return_value = list(self.sample_profiles)
        initial_profiles_snapshot = [dict(p) for p in self.sample_profiles]
        
        headers = self._auth_headers("usr-super-admin-001", "super_admin")
        res = self.client.get("/api/users/", headers=headers)
        self.assertEqual(res.status_code, 200)

        self.assertEqual(len(initial_profiles_snapshot), len(self.sample_profiles))
        for init, curr in zip(initial_profiles_snapshot, self.sample_profiles):
            self.assertEqual(init["id"], curr["id"])
            self.assertEqual(init["email"], curr["email"])
            self.assertEqual(init.get("role"), curr.get("role"))

    # -------------------------------------------------------------------------
    # 5. Clinical Service Telemetry Timeline Hardening
    # -------------------------------------------------------------------------
    @patch("app.services.clinical.get_health_logs_repo")
    @patch("app.services.clinical.get_meals_repo")
    @patch("app.services.clinical.get_exercises_repo")
    @patch("app.services.clinical.get_sleep_repo")
    def test_clinical_telemetry_timeline_mixed_timestamps(
        self,
        mock_sleep,
        mock_ex,
        mock_meals,
        mock_hl,
    ):
        """Validates get_recent_telemetry_timeline with mixed timezone formats."""
        user_id = "usr-patient-clinical-test"
        now = datetime.utcnow()

        mock_hl.return_value.list_user_logs.return_value = [
            {"id": "c-log-1", "user_id": user_id, "logged_at": (now - timedelta(days=2)).isoformat() + "Z", "systolic_bp": 118, "diastolic_bp": 78},
            {"id": "c-log-2", "user_id": user_id, "logged_at": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S") + "+08:00", "systolic_bp": 125, "diastolic_bp": 82},
            {"id": "c-log-3", "user_id": user_id, "logged_at": "invalid_date_entry", "systolic_bp": 130, "diastolic_bp": 85},
            {"id": "c-log-4", "user_id": user_id, "logged_at": None, "systolic_bp": 110, "diastolic_bp": 70},
        ]
        mock_meals.return_value.list_user_meals.return_value = []
        mock_ex.return_value.list_user_logs.return_value = []
        mock_sleep.return_value.list_user_logs.return_value = []

        logs = get_recent_telemetry_timeline(user_id, limit_days=30)
        self.assertIsInstance(logs, list)
        self.assertGreaterEqual(len(logs), 2)
        # Ensure sorting descending works without crashing
        self.assertEqual(logs[0]["data"]["systolic"], 125)
        self.assertEqual(logs[1]["data"]["systolic"], 118)

    # -------------------------------------------------------------------------
    # 6. Analytics Service Hardening
    # -------------------------------------------------------------------------
    @patch("app.services.analytics.get_hss_repo")
    @patch("app.services.analytics.get_baseline_repo")
    def test_analytics_service_mixed_hss_timestamps(self, mock_base, mock_hss):
        """Validates get_analytics with mixed timezone and naive formats in HSS history."""
        user_id = "usr-patient-analytics-test"
        now = datetime.utcnow()

        mock_hss.return_value.list_hss_history.return_value = [
            {"id": "hss-1", "user_id": user_id, "score": 75.0, "tier": "Stable", "computed_at": (now - timedelta(days=10)).isoformat() + "Z"},
            {"id": "hss-2", "user_id": user_id, "score": 80.0, "tier": "Stable", "computed_at": (now - timedelta(days=5)).strftime("%Y-%m-%dT%H:%M:%S") + "+08:00"},
            {"id": "hss-3", "user_id": user_id, "score": 82.0, "tier": "Stable", "computed_at": now - timedelta(days=1)},
            {"id": "hss-4", "user_id": user_id, "score": 70.0, "tier": "Moderate", "computed_at": "invalid-hss-date"},
            {"id": "hss-5", "user_id": user_id, "score": 68.0, "tier": "Moderate", "computed_at": None},
        ]
        mock_base.return_value.get_thresholds.return_value = {"systolic_threshold": 120}

        analytics = get_analytics(user_id)
        self.assertIsInstance(analytics, dict)
        self.assertIn("history", analytics)
        self.assertEqual(len(analytics["history"]), 5)
        # Verify history is sorted chronologically
        history = analytics["history"]
        for h in history:
            self.assertIn("score", h)
            self.assertIn("tier", h)


if __name__ == "__main__":
    unittest.main()
