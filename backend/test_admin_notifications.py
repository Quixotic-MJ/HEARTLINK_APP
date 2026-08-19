import unittest
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token

class TestAdminNotifications(unittest.TestCase):
    def setUp(self):
        # Reset DB and reseed demo data
        mock_db.load_profiles()
        mock_db.profiles[:] = [p for p in mock_db.profiles if not p.get("email", "").startswith("alan.turing")]
        for p in mock_db.profiles:
            p["account_status"] = "active"
        mock_db.save_profiles()
        mock_db.load_logs()
        mock_db.seed_rich_demo_data()
        self.client = TestClient(app)

        # Tokens
        self.super_admin_token = create_access_token({"user_id": "usr-super-admin-001", "role": "super_admin"})
        self.admin_token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})
        self.expert_token = create_access_token({"user_id": "usr-expert-201", "role": "medical_expert"})
        self.patient_token = create_access_token({"user_id": "usr-patient-101", "role": "patient"})

        self.super_admin_headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.expert_headers = {"Authorization": f"Bearer {self.expert_token}"}
        self.patient_headers = {"Authorization": f"Bearer {self.patient_token}"}

    # ── 1. Authentication & RBAC (1–5) ─────────────────────────────────────────

    def test_01_admin_can_get_notifications(self):
        res = self.client.get("/api/admin/notifications", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("unread_count", data)
        self.assertIn("total", data)

    def test_02_super_admin_can_get_notifications(self):
        res = self.client.get("/api/admin/notifications", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertGreaterEqual(data["total"], 4)

    def test_03_medical_expert_receives_403(self):
        res = self.client.get("/api/admin/notifications", headers=self.expert_headers)
        self.assertEqual(res.status_code, 403)

    def test_04_patient_receives_403(self):
        res = self.client.get("/api/admin/notifications", headers=self.patient_headers)
        self.assertEqual(res.status_code, 403)

    def test_05_unauthenticated_request_rejected(self):
        res = self.client.get("/api/admin/notifications")
        self.assertIn(res.status_code, (401, 403))

    # ── 2. Filtering (6–8) ──────────────────────────────────────────────────────

    def test_06_admin_only_receives_admin_eligible_notifications(self):
        res = self.client.get("/api/admin/notifications", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        for item in items:
            self.assertIn("admin", item["recipient_roles"])

    def test_07_super_admin_receives_super_admin_notifications(self):
        res = self.client.get("/api/admin/notifications", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        for item in items:
            self.assertIn("super_admin", item["recipient_roles"])

    def test_08_restricted_staff_notification_hidden_from_ordinary_admin(self):
        # anotif-seed-002 is super_admin only
        admin_res = self.client.get("/api/admin/notifications", headers=self.admin_headers)
        admin_ids = [n["id"] for n in admin_res.json()["items"]]
        self.assertNotIn("anotif-seed-002", admin_ids)

        sa_res = self.client.get("/api/admin/notifications", headers=self.super_admin_headers)
        sa_ids = [n["id"] for n in sa_res.json()["items"]]
        self.assertIn("anotif-seed-002", sa_ids)

    # ── 3. Read State (9–12) ────────────────────────────────────────────────────

    def test_09_mark_one_notification_read(self):
        # anotif-seed-001 is unread for super_admin
        res = self.client.put("/api/admin/notifications/anotif-seed-001/read", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)
        notif = res.json()["notification"]
        self.assertIn("usr-super-admin-001", notif["read_by"])

    def test_10_marking_read_twice_does_not_duplicate_read_by(self):
        self.client.put("/api/admin/notifications/anotif-seed-001/read", headers=self.super_admin_headers)
        res2 = self.client.put("/api/admin/notifications/anotif-seed-001/read", headers=self.super_admin_headers)
        self.assertEqual(res2.status_code, 200)
        notif = res2.json()["notification"]
        user_occurrences = [u for u in notif["read_by"] if u == "usr-super-admin-001"]
        self.assertEqual(len(user_occurrences), 1)

    def test_11_mark_all_read_only_affects_visible_notifications(self):
        res = self.client.put("/api/admin/notifications/mark-all-read", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["unread_count"], 0)

        # Verify super-admin-only notification was NOT marked read by ordinary admin
        seed_002 = next((n for n in mock_db.admin_notifications if n["id"] == "anotif-seed-002"), None)
        self.assertNotIn("usr-chief-admin-001", seed_002["read_by"])

    def test_12_unread_count_updates_correctly(self):
        # Initially get count for super_admin
        res1 = self.client.get("/api/admin/notifications", headers=self.super_admin_headers)
        initial_unread = res1.json()["unread_count"]
        self.assertGreater(initial_unread, 0)

        # Mark one read
        self.client.put("/api/admin/notifications/anotif-seed-001/read", headers=self.super_admin_headers)

        res2 = self.client.get("/api/admin/notifications", headers=self.super_admin_headers)
        new_unread = res2.json()["unread_count"]
        self.assertEqual(new_unread, initial_unread - 1)

    # ── 4. Feedback Trigger (13–16) ─────────────────────────────────────────────

    def test_13_creating_feedback_creates_exactly_one_admin_notification(self):
        initial_count = len(mock_db.admin_notifications)
        payload = {
            "category": "Bug Report",
            "fullMessage": "The ECG waveform rendering freezes when switching tabs rapidly."
        }
        res = self.client.post("/api/feedback", json=payload, headers=self.patient_headers)
        self.assertEqual(res.status_code, 200)
        ticket = res.json()

        self.assertEqual(len(mock_db.admin_notifications), initial_count + 1)
        latest_notif = mock_db.admin_notifications[-1]
        self.assertEqual(latest_notif["type"], "feedback")
        self.assertEqual(latest_notif["target_id"], ticket["ticketId"])
        self.assertIn("admin", latest_notif["recipient_roles"])
        self.assertIn("super_admin", latest_notif["recipient_roles"])

    def test_14_duplicate_feedback_notification_prevented(self):
        from app.services.admin_notifications import create_admin_notification
        notif1 = create_admin_notification(
            type="feedback",
            title="New Feedback Received",
            message="FB-9999 (Bug Report) submitted for review.",
            severity="warning",
            recipient_roles=["admin", "super_admin"],
            route="/feedbacks",
            target_id="FB-9999"
        )
        notif2 = create_admin_notification(
            type="feedback",
            title="New Feedback Received",
            message="FB-9999 (Bug Report) submitted for review.",
            severity="warning",
            recipient_roles=["admin", "super_admin"],
            route="/feedbacks",
            target_id="FB-9999"
        )
        self.assertEqual(notif1["id"], notif2["id"])

    def test_15_feedback_category_determines_severity(self):
        # Bug Report -> warning
        res_bug = self.client.post("/api/feedback", json={"category": "Bug Report", "fullMessage": "App crashed"}, headers=self.patient_headers)
        t_bug = res_bug.json()
        notif_bug = next((n for n in mock_db.admin_notifications if n.get("target_id") == t_bug["ticketId"]), None)
        self.assertEqual(notif_bug["severity"], "warning")

        # Question -> info
        res_q = self.client.post("/api/feedback", json={"category": "Question", "fullMessage": "How do I log meals?"}, headers=self.patient_headers)
        t_q = res_q.json()
        notif_q = next((n for n in mock_db.admin_notifications if n.get("target_id") == t_q["ticketId"]), None)
        self.assertEqual(notif_q["severity"], "info")

    def test_16_feedback_notification_contains_no_full_feedback_body(self):
        secret_text = "CONFIDENTIAL_LONG_COMPLAINT_BODY_123456"
        res = self.client.post("/api/feedback", json={"category": "Account Issue", "fullMessage": secret_text}, headers=self.patient_headers)
        ticket = res.json()
        notif = next((n for n in mock_db.admin_notifications if n.get("target_id") == ticket["ticketId"]), None)
        self.assertNotIn(secret_text, notif["message"])
        self.assertIn("FB-", notif["message"])

    # ── 5. Staff Triggers (17–19) ───────────────────────────────────────────────

    def test_17_staff_creation_creates_one_super_admin_notification(self):
        initial_count = len(mock_db.admin_notifications)
        test_email = f"alan.turing.{uuid.uuid4().hex[:6]}@heartlink.ph"
        staff_payload = {
            "name": "Dr. Alan Turing",
            "email": test_email,
            "phone": "+639179998811",
            "role": "Authorized Medical Expert",
        }
        res = self.client.post("/api/admin/staff", json=staff_payload, headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)

        self.assertEqual(len(mock_db.admin_notifications), initial_count + 1)
        notif = mock_db.admin_notifications[-1]
        self.assertEqual(notif["type"], "staff")
        self.assertEqual(notif["severity"], "info")
        self.assertEqual(notif["recipient_roles"], ["super_admin"])
        self.assertIn("usr-super-admin-001", notif["read_by"])  # Actor excluded from unread count

        # Cleanup
        mock_db.profiles[:] = [p for p in mock_db.profiles if p.get("email") != test_email]
        mock_db.save_profiles()

    def test_18_staff_status_change_creates_one_super_admin_notification(self):
        initial_count = len(mock_db.admin_notifications)
        # Toggle staff usr-expert-201
        res = self.client.put("/api/admin/users/usr-expert-201/status", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)

        self.assertEqual(len(mock_db.admin_notifications), initial_count + 1)
        notif = mock_db.admin_notifications[-1]
        self.assertEqual(notif["type"], "staff")
        self.assertEqual(notif["severity"], "warning")
        self.assertEqual(notif["recipient_roles"], ["super_admin"])
        self.assertEqual(notif["target_id"], "usr-expert-201")

        # Restore to active
        self.client.put("/api/admin/users/usr-expert-201/status", headers=self.super_admin_headers)

    def test_19_patient_account_status_change_creates_no_staff_notification(self):
        initial_count = len(mock_db.admin_notifications)
        # Toggle patient usr-patient-101
        res = self.client.put("/api/admin/users/usr-patient-101/status", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)

        # Count must remain unchanged
        self.assertEqual(len(mock_db.admin_notifications), initial_count)

    # ── 6. Security Triggers (20–21) ───────────────────────────────────────────

    def test_20_lockout_creates_an_admin_security_notification(self):
        from app.api.auth.auth import record_failed_attempt
        initial_count = len(mock_db.admin_notifications)

        # Trigger 5 failed attempts for an IP/identifier
        target_id = "brute_force_attacker_01"
        for _ in range(5):
            record_failed_attempt(target_id)

        notif = next((n for n in mock_db.admin_notifications if n["type"] == "security" and n["title"] == "Rate Limit Lockout"), None)
        self.assertIsNotNone(notif)
        self.assertEqual(notif["severity"], "warning")
        self.assertIn("admin", notif["recipient_roles"])
        self.assertIn("super_admin", notif["recipient_roles"])

    def test_21_repeated_lockout_checks_do_not_create_duplicate_notifications(self):
        from app.api.auth.auth import record_failed_attempt
        target_id = "brute_force_attacker_02"
        for _ in range(10):
            record_failed_attempt(target_id)

        sec_notifs = [n for n in mock_db.admin_notifications if n["type"] == "security" and n["title"] == "Rate Limit Lockout"]
        # Seed has 1 + at most 1 new for this test
        self.assertLessEqual(len(sec_notifs), 2)

    # ── 7. Privacy Constraints (22–26) ─────────────────────────────────────────

    def test_22_no_password_appears(self):
        for n in mock_db.admin_notifications:
            self.assertNotIn("password", n["message"].lower())
            self.assertNotIn("Password123!", n["message"])

    def test_23_no_token_appears(self):
        for n in mock_db.admin_notifications:
            self.assertNotIn("bearer", n["message"].lower())
            self.assertNotIn("jwt", n["message"].lower())

    def test_24_no_hss_appears(self):
        for n in mock_db.admin_notifications:
            self.assertNotIn("hss score", n["message"].lower())
            self.assertNotIn("stability score", n["message"].lower())

    def test_25_no_vital_data_appears(self):
        for n in mock_db.admin_notifications:
            msg = n["message"].lower()
            self.assertNotIn("blood pressure", msg)
            self.assertNotIn("systolic", msg)
            self.assertNotIn("bpm", msg)
            self.assertNotIn("chest tightness", msg)

    def test_26_no_phone_number_appears(self):
        for n in mock_db.admin_notifications:
            self.assertNotIn("+63", n["message"])

    # ── 8. Persistence & Seeding (27–30) ───────────────────────────────────────

    def test_27_notifications_survive_save_load(self):
        from app.services.admin_notifications import create_admin_notification
        custom_notif = create_admin_notification(
            type="system",
            title="Database Optimization",
            message="Routine storage compaction completed.",
            severity="info",
            recipient_roles=["super_admin"],
            route="/settings"
        )
        custom_id = custom_notif["id"]

        # Simulate reload from disk
        mock_db.load_logs()
        found = next((n for n in mock_db.admin_notifications if n["id"] == custom_id), None)
        self.assertIsNotNone(found)
        self.assertEqual(found["title"], "Database Optimization")

    def test_28_demo_seed_is_idempotent(self):
        mock_db.seed_rich_demo_data()
        mock_db.seed_rich_demo_data()
        seed_records = [n for n in mock_db.admin_notifications if n.get("demo_seed") == "heartlink-admin-notifications-demo-v1"]
        self.assertEqual(len(seed_records), 4)

    def test_29_demo_seed_records_are_identifiable(self):
        seed_ids = {"anotif-seed-001", "anotif-seed-002", "anotif-seed-003", "anotif-seed-004"}
        for s_id in seed_ids:
            item = next((n for n in mock_db.admin_notifications if n["id"] == s_id), None)
            self.assertIsNotNone(item)
            self.assertEqual(item["demo_seed"], "heartlink-admin-notifications-demo-v1")

    def test_30_runtime_notifications_survive_reseeding(self):
        from app.services.admin_notifications import create_admin_notification
        runtime_notif = create_admin_notification(
            type="feedback",
            title="Runtime Feedback",
            message="FB-2000 (Question) submitted.",
            severity="info",
            recipient_roles=["admin", "super_admin"],
            route="/feedbacks",
            target_id="FB-2000"
        )
        runtime_id = runtime_notif["id"]

        # Run reseed
        mock_db.seed_rich_demo_data()

        found = next((n for n in mock_db.admin_notifications if n["id"] == runtime_id), None)
        self.assertIsNotNone(found)

    # ── Extra: Fault Isolation Test ────────────────────────────────────────────

    def test_31_feedback_creation_succeeds_even_if_notification_fails(self):
        with patch("app.services.admin_notifications.create_admin_notification", side_effect=Exception("Simulated notification service failure")):
            res = self.client.post("/api/feedback", json={"category": "Bug Report", "fullMessage": "Test crash"}, headers=self.patient_headers)
            self.assertEqual(res.status_code, 200)
            ticket = res.json()
            self.assertIn("FB-", ticket["ticketId"])

if __name__ == "__main__":
    unittest.main()
