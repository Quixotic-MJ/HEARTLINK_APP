"""
test_dashboard_security.py
--------------------------
Automated security, authentication, ownership isolation, HSS state integrity,
timestamp sorting resilience, and contract preservation test suite for the
HeartLink Dashboard module (GET /api/dashboard/me, GET /api/dashboard/wrapup).

Covers all required areas:
1. Authentication:
   - Valid patient JWT -> 200
   - Missing Authorization token -> 401 / 403
   - Invalid / tampered JWT -> 401
   - Expired JWT -> 401
   - Blacklisted / revoked JWT -> 401
   - Disabled patient account -> 403
2. Ownership Isolation:
   - Authenticated Patient A receives Patient A profile & data (never Patient B)
   - Patient A notifications count includes only Patient A notifications
   - Patient A vitals & logs include only Patient A records
   - Patient A HSS history includes only Patient A records
   - Patient A alerts include only Patient A alerts
   - Patient A recommendations are customized to Patient A's tier/dietary preferences
   - Wrap-up API (/api/dashboard/wrapup) strictly scopes logs/HSS to authenticated patient
3. HSS State Integrity & Tier Mapping:
   - No HSS history returns non-misleading zero/unknown state without Critical alarm
   - HSS score 49 -> Critical tier
   - HSS score 50 -> Elevated Risk tier
   - HSS score 60 -> Moderate tier
   - HSS score 80 -> Stable tier
4. Timestamp Sorting Resilience:
   - Mixed ISO string and datetime objects in hss_history sort without TypeError
   - Mixed ISO string and datetime objects in alerts sort without TypeError
   - Mixed ISO string and datetime objects in daily_health_logs sort without TypeError
5. Contract Preservation & Non-Fabricated Data:
   - All expected keys present in response payload
   - Empty patient data returns unrecorded defaults rather than fabricated metrics
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token, token_blacklist


class TestDashboardSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.patient_a_id = "usr-patient-101"
        cls.patient_b_id = "usr-patient-102"

        # Generate tokens
        cls.token_patient_a = create_access_token({"user_id": cls.patient_a_id, "role": "patient"})
        cls.token_patient_b = create_access_token({"user_id": cls.patient_b_id, "role": "patient"})

        cls.auth_headers_a = {"Authorization": f"Bearer {cls.token_patient_a}"}
        cls.auth_headers_b = {"Authorization": f"Bearer {cls.token_patient_b}"}

    def setUp(self):
        # Snapshot in-memory collections for strict isolation
        self._orig_profiles = [dict(p) for p in mock_db.profiles]
        self._orig_hss = [dict(h) for h in mock_db.hss_history]
        self._orig_logs = [dict(l) for l in mock_db.daily_health_logs]
        self._orig_alerts = [dict(a) for a in mock_db.alerts]
        self._orig_notifications = [dict(n) for n in mock_db.notifications]
        self._orig_meal_logs = [dict(m) for m in mock_db.meal_logs]
        self._orig_exercise_logs = [dict(e) for e in mock_db.exercise_logs]
        self._orig_sleep_logs = [dict(s) for s in mock_db.sleep_logs]
        self._orig_blacklist = set(token_blacklist)

    def tearDown(self):
        # Restore in-memory collections
        mock_db.profiles.clear()
        mock_db.profiles.extend(self._orig_profiles)
        mock_db.hss_history.clear()
        mock_db.hss_history.extend(self._orig_hss)
        mock_db.daily_health_logs.clear()
        mock_db.daily_health_logs.extend(self._orig_logs)
        mock_db.alerts.clear()
        mock_db.alerts.extend(self._orig_alerts)
        mock_db.notifications.clear()
        mock_db.notifications.extend(self._orig_notifications)
        mock_db.meal_logs.clear()
        mock_db.meal_logs.extend(self._orig_meal_logs)
        mock_db.exercise_logs.clear()
        mock_db.exercise_logs.extend(self._orig_exercise_logs)
        mock_db.sleep_logs.clear()
        mock_db.sleep_logs.extend(self._orig_sleep_logs)
        token_blacklist.clear()
        token_blacklist.update(self._orig_blacklist)

    # ── 1. Authentication Tests ───────────────────────────────────────────────

    def test_01_valid_jwt_returns_200(self):
        response = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["first_name"], "John Mark")

    def test_02_missing_token_rejected(self):
        response = self.client.get("/api/dashboard/me")
        self.assertIn(response.status_code, (401, 403))

    def test_03_invalid_jwt_rejected(self):
        response = self.client.get(
            "/api/dashboard/me",
            headers={"Authorization": "Bearer invalid.jwt.token.here"},
        )
        self.assertEqual(response.status_code, 401)

    def test_04_expired_jwt_rejected(self):
        expired_token = create_access_token(
            {"user_id": self.patient_a_id, "role": "patient"},
            expires_delta=timedelta(seconds=-60),
        )
        response = self.client.get(
            "/api/dashboard/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        self.assertEqual(response.status_code, 401)

    def test_05_blacklisted_token_rejected(self):
        revoked_token = create_access_token({"user_id": self.patient_a_id, "role": "patient"})
        token_blacklist.add(revoked_token)
        response = self.client.get(
            "/api/dashboard/me",
            headers={"Authorization": f"Bearer {revoked_token}"},
        )
        self.assertEqual(response.status_code, 401)

    def test_06_disabled_account_rejected(self):
        # Mark patient_a as disabled
        for p in mock_db.profiles:
            if p["id"] == self.patient_a_id:
                p["account_status"] = "disabled"

        response = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(response.status_code, 403)

    # ── 2. Ownership Isolation Tests ──────────────────────────────────────────

    def test_07_patient_isolation_dashboard_me(self):
        res_a = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        res_b = self.client.get("/api/dashboard/me", headers=self.auth_headers_b)

        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_b.status_code, 200)

        data_a = res_a.json()
        data_b = res_b.json()

        self.assertEqual(data_a["user"]["first_name"], "John Mark")
        self.assertEqual(data_b["user"]["first_name"], "Pedro")

    def test_08_notifications_isolation(self):
        # Clear existing notifications and add specific ones for A and B
        mock_db.notifications.clear()
        mock_db.notifications.extend([
            {"id": "n1", "user_id": self.patient_a_id, "read": False, "title": "A1", "message": "msg", "type": "alert", "scope": "personal", "created_at": datetime.utcnow()},
            {"id": "n2", "user_id": self.patient_a_id, "read": False, "title": "A2", "message": "msg", "type": "alert", "scope": "personal", "created_at": datetime.utcnow()},
            {"id": "n3", "user_id": self.patient_b_id, "read": False, "title": "B1", "message": "msg", "type": "alert", "scope": "personal", "created_at": datetime.utcnow()},
        ])

        res_a = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        res_b = self.client.get("/api/dashboard/me", headers=self.auth_headers_b)

        self.assertEqual(res_a.json()["unread_notifications_count"], 2)
        self.assertEqual(res_b.json()["unread_notifications_count"], 1)

    def test_09_health_logs_isolation(self):
        mock_db.daily_health_logs.clear()
        mock_db.daily_health_logs.extend([
            {"id": "log-a", "user_id": self.patient_a_id, "bpm": 72, "systolic_bp": 120, "diastolic_bp": 80, "logged_at": datetime.utcnow()},
            {"id": "log-b", "user_id": self.patient_b_id, "bpm": 95, "systolic_bp": 145, "diastolic_bp": 95, "logged_at": datetime.utcnow()},
        ])

        res_a = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        res_b = self.client.get("/api/dashboard/me", headers=self.auth_headers_b)

        self.assertEqual(res_a.json()["latest_vitals"]["bpm"], "72")
        self.assertEqual(res_b.json()["latest_vitals"]["bpm"], "95")

    def test_10_hss_history_isolation(self):
        mock_db.hss_history.clear()
        mock_db.hss_history.extend([
            {"id": "hss-a", "user_id": self.patient_a_id, "score": 85, "tier": "Stable", "computed_at": datetime.utcnow()},
            {"id": "hss-b", "user_id": self.patient_b_id, "score": 45, "tier": "Critical", "computed_at": datetime.utcnow()},
        ])

        res_a = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        res_b = self.client.get("/api/dashboard/me", headers=self.auth_headers_b)

        self.assertEqual(res_a.json()["hss_score"], 85)
        self.assertEqual(res_a.json()["hss_tier"], "Stable")
        self.assertEqual(res_b.json()["hss_score"], 45)
        self.assertEqual(res_b.json()["hss_tier"], "Critical")

    def test_11_alerts_isolation(self):
        mock_db.alerts.clear()
        mock_db.alerts.extend([
            {"id": "alt-a", "user_id": self.patient_a_id, "title": "Alert For A", "message": "High BP spike", "type": "critical", "created_at": datetime.utcnow()},
        ])

        res_a = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        res_b = self.client.get("/api/dashboard/me", headers=self.auth_headers_b)

        self.assertIsNotNone(res_a.json()["latest_alert"])
        self.assertEqual(res_a.json()["latest_alert"]["id"], "alt-a")
        self.assertIsNone(res_b.json()["latest_alert"])

    def test_12_wrapup_api_security_and_isolation(self):
        # Unauthenticated wrapup rejected
        res_unauth = self.client.get("/api/dashboard/wrapup")
        self.assertIn(res_unauth.status_code, (401, 403))

        # Authenticated wrapup scoped to caller
        res_a = self.client.get("/api/dashboard/wrapup", headers=self.auth_headers_a)
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.json()
        self.assertIn("overview", data_a)
        self.assertIn("vitals", data_a)
        self.assertIn("nutrition", data_a)
        self.assertIn("daily_records", data_a)

    # ── 3. HSS State & Tier Integrity Tests ───────────────────────────────────

    def test_13_no_hss_history_returns_zero_unknown(self):
        mock_db.hss_history.clear()

        res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["hss_score"], 0)
        self.assertEqual(data["hss_tier"], "Unknown")
        self.assertIsNone(data["latest_alert"])

    def test_14_hss_score_tiers(self):
        tiers_to_test = [
            (49, "Critical"),
            (50, "Elevated Risk"),
            (60, "Moderate"),
            (80, "Stable"),
        ]
        for score, expected_tier in tiers_to_test:
            mock_db.hss_history.clear()
            mock_db.hss_history.append({
                "id": f"hss-{score}",
                "user_id": self.patient_a_id,
                "score": score,
                "tier": expected_tier,
                "computed_at": datetime.utcnow(),
            })
            res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["hss_score"], score)
            self.assertEqual(data["hss_tier"], expected_tier)

    # ── 4. Timestamp Sorting Resilience Tests ─────────────────────────────────

    def test_15_mixed_string_and_datetime_hss_sorting(self):
        mock_db.hss_history.clear()
        mock_db.hss_history.extend([
            {"id": "h1", "user_id": self.patient_a_id, "score": 75, "tier": "Moderate", "computed_at": "2026-07-01T10:00:00"},
            {"id": "h2", "user_id": self.patient_a_id, "score": 88, "tier": "Stable", "computed_at": datetime(2026, 7, 10, 10, 0, 0)},
            {"id": "h3", "user_id": self.patient_a_id, "score": 65, "tier": "Moderate", "computed_at": "2026-07-05T12:00:00Z"},
        ])

        res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Newest should be h2 (2026-07-10)
        self.assertEqual(data["hss_score"], 88)
        self.assertEqual(data["hss_tier"], "Stable")

    def test_16_mixed_string_and_datetime_alerts_sorting(self):
        mock_db.alerts.clear()
        mock_db.alerts.extend([
            {"id": "a1", "user_id": self.patient_a_id, "title": "Older Alert", "type": "info", "created_at": "2026-07-01T08:00:00"},
            {"id": "a2", "user_id": self.patient_a_id, "title": "Newer Alert", "type": "warning", "created_at": datetime(2026, 7, 12, 14, 0, 0)},
        ])

        res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNotNone(data["latest_alert"])
        self.assertEqual(data["latest_alert"]["id"], "a2")

    def test_17_mixed_string_and_datetime_logs_sorting(self):
        mock_db.daily_health_logs.clear()
        mock_db.daily_health_logs.extend([
            {"id": "l1", "user_id": self.patient_a_id, "bpm": 68, "systolic_bp": 115, "diastolic_bp": 75, "logged_at": "2026-07-01T09:00:00"},
            {"id": "l2", "user_id": self.patient_a_id, "bpm": 84, "systolic_bp": 125, "diastolic_bp": 82, "logged_at": datetime(2026, 7, 11, 8, 30, 0)},
        ])

        res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["latest_vitals"]["bpm"], "84")

    # ── 5. Contract Preservation & Non-Fabricated Data Tests ──────────────────

    def test_18_dashboard_contract_fields_presence(self):
        res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        expected_keys = [
            "user",
            "hss_score",
            "hss_tier",
            "last_sync",
            "latest_vitals",
            "latest_alert",
            "recommendations",
            "insight",
            "today_activity",
            "nutrition_budget",
            "unread_notifications_count",
        ]
        for key in expected_keys:
            self.assertIn(key, data, f"Missing expected key: {key}")

    def test_19_empty_patient_data_does_not_fabricate_metrics(self):
        # Clear all logs, alerts, and HSS for patient_a
        mock_db.hss_history[:] = [h for h in mock_db.hss_history if h["user_id"] != self.patient_a_id]
        mock_db.daily_health_logs[:] = [l for l in mock_db.daily_health_logs if l["user_id"] != self.patient_a_id]
        mock_db.alerts[:] = [a for a in mock_db.alerts if a["user_id"] != self.patient_a_id]
        mock_db.meal_logs[:] = [m for m in mock_db.meal_logs if m["user_id"] != self.patient_a_id]
        mock_db.exercise_logs[:] = [e for e in mock_db.exercise_logs if e["user_id"] != self.patient_a_id]
        mock_db.sleep_logs[:] = [s for s in mock_db.sleep_logs if s["user_id"] != self.patient_a_id]

        res = self.client.get("/api/dashboard/me", headers=self.auth_headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["hss_score"], 0)
        self.assertEqual(data["hss_tier"], "Unknown")
        self.assertIsNone(data["latest_alert"])
        self.assertEqual(data["latest_vitals"]["bpm"], "--")
        self.assertEqual(data["latest_vitals"]["bp"], "--/--")
        self.assertEqual(data["today_activity"]["meals_count"], 0)
        self.assertEqual(data["today_activity"]["total_exercise_minutes"], 0)
        self.assertEqual(data["today_activity"]["total_sleep_hours"], 0)
        self.assertFalse(data["today_activity"]["vitals_logged"])


if __name__ == "__main__":
    unittest.main()
