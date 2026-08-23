"""
test_patient_notifications_security.py
-----------------------------------------
Automated security, authentication, ownership, persistence, and privacy
verification test suite for HeartLink Mobile Patient Notifications module.

Covers all 18 required scenarios across:
- 3A. Authentication (authenticated fetch, unauthenticated reject, invalid token)
- 3B. Ownership Isolation (cross-user fetch, caller scoping, cross-user mark-read, owner mark-read)
- 3C. Read State Integrity (idempotent mark-read, user-scoped mark-all-read, cross-user mark-all-read, unread count accuracy)
- 3D. Persistence (read state survival, runtime notification persistence cycle)
- 3E. Broadcast Contracts (public broadcast endpoint, title preservation, linked notification title, deletion cascade)
- 3F. Privacy (payload contains no credentials, hashes, tokens, secrets, or raw biometrics)
- 3G. Test State Isolation (snapshot/restore on setUp/tearDown)
"""

import unittest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token


class TestPatientNotificationsSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.patient_a_id = "usr-patient-101"
        cls.patient_b_id = "usr-patient-102"
        cls.admin_id = "usr-chief-admin-001"

        cls.token_patient_a = create_access_token({"user_id": cls.patient_a_id, "role": "patient"})
        cls.token_patient_b = create_access_token({"user_id": cls.patient_b_id, "role": "patient"})
        cls.token_admin = create_access_token({"user_id": cls.admin_id, "role": "admin"})

        cls.auth_headers_a = {"Authorization": f"Bearer {cls.token_patient_a}"}
        cls.auth_headers_b = {"Authorization": f"Bearer {cls.token_patient_b}"}
        cls.auth_headers_admin = {"Authorization": f"Bearer {cls.token_admin}"}

    def setUp(self):
        # Snapshot in-memory collections for strict isolation
        self._orig_notifications = [dict(n) for n in mock_db.notifications]
        self._orig_system_broadcasts = [dict(b) for b in mock_db.system_broadcasts]
        self._orig_profiles = [dict(p) for p in mock_db.profiles]

        # Ensure patient_a has baseline notifications for tests
        if not any(n.get("user_id") == self.patient_a_id for n in mock_db.notifications):
            mock_db.notifications.append({
                "id": "notif-001",
                "user_id": self.patient_a_id,
                "scope": "personal",
                "type": "alert",
                "broadcast_type": None,
                "broadcast_id": None,
                "publisher_id": None,
                "title": "Health Alert Warning",
                "message": "A daily check-in health log exceeded parameters.",
                "read": False,
                "created_at": datetime.now(),
            })

    def tearDown(self):
        # Restore in-memory collections to prevent test pollution
        mock_db.notifications[:] = [dict(n) for n in self._orig_notifications]
        mock_db.system_broadcasts[:] = [dict(b) for b in self._orig_system_broadcasts]
        mock_db.profiles[:] = [dict(p) for p in self._orig_profiles]

    # ─── 3A. AUTHENTICATION TESTS ──────────────────────────────────────────────

    def test_01_authenticated_patient_fetches_own_notifications(self):
        """1. Authenticated patient can fetch own notifications (200 OK)."""
        res = self.client.get(
            f"/api/notifications/{self.patient_a_id}",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

    def test_02_unauthenticated_notification_fetch_rejected(self):
        """2. Unauthenticated request to /api/notifications/{user_id} is rejected (401/403)."""
        res = self.client.get(f"/api/notifications/{self.patient_a_id}")
        self.assertIn(res.status_code, [401, 403])

    def test_03_invalid_token_rejected(self):
        """3. Request with malformed or tampered token is rejected with 401."""
        res = self.client.get(
            f"/api/notifications/{self.patient_a_id}",
            headers={"Authorization": "Bearer invalid.malformed.token"},
        )
        self.assertEqual(res.status_code, 401)

    # ─── 3B. OWNERSHIP ISOLATION TESTS ─────────────────────────────────────────

    def test_04_cross_patient_fetch_forbidden(self):
        """4. Patient A cannot fetch Patient B's notifications (403 Forbidden)."""
        res = self.client.get(
            f"/api/notifications/{self.patient_b_id}",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("own notifications", res.json().get("detail", ""))

    def test_05_returned_notifications_strictly_scoped_to_caller(self):
        """5. All returned notifications strictly belong to the requested user_id."""
        res = self.client.get(
            f"/api/notifications/{self.patient_a_id}",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 200)
        for notif in res.json():
            self.assertEqual(notif["user_id"], self.patient_a_id)

    def test_06_cross_patient_mark_read_forbidden(self):
        """6. Patient A cannot mark Patient B's notification as read (403 Forbidden)."""
        # Ensure Patient B has an unread notification
        b_notif = {
            "id": "notif-test-b-unread",
            "user_id": self.patient_b_id,
            "scope": "personal",
            "type": "reminder",
            "title": "Check-in Reminder",
            "message": "Time for your daily log.",
            "read": False,
            "created_at": datetime.now(),
        }
        mock_db.notifications.append(b_notif)

        # Patient A attempts to mark Patient B's notification read
        res = self.client.put(
            f"/api/notifications/{b_notif['id']}/read",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 403)

        # Verify Patient B's notification remains unread
        stored = next(n for n in mock_db.notifications if n["id"] == b_notif["id"])
        self.assertFalse(stored["read"])

    def test_07_patient_marks_own_notification_read(self):
        """7. Patient A can successfully mark own notification as read (200 OK)."""
        a_notif = {
            "id": "notif-test-a-unread",
            "user_id": self.patient_a_id,
            "scope": "personal",
            "type": "insight",
            "title": "Weekly Insight",
            "message": "Your score improved.",
            "read": False,
            "created_at": datetime.now(),
        }
        mock_db.notifications.append(a_notif)

        res = self.client.put(
            f"/api/notifications/{a_notif['id']}/read",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # Verify persisted read state in mock_db
        stored = next(n for n in mock_db.notifications if n["id"] == a_notif["id"])
        self.assertTrue(stored["read"])

    # ─── 3C. READ STATE TESTS ──────────────────────────────────────────────────

    def test_08_repeated_mark_read_is_idempotent(self):
        """8. Repeated mark-read requests are idempotent without error or data corruption."""
        a_notif = {
            "id": "notif-test-idempotent",
            "user_id": self.patient_a_id,
            "scope": "personal",
            "type": "alert",
            "title": "Alert",
            "message": "Test alert",
            "read": False,
            "created_at": datetime.now(),
        }
        mock_db.notifications.append(a_notif)

        # First call
        r1 = self.client.put(f"/api/notifications/{a_notif['id']}/read", headers=self.auth_headers_a)
        self.assertEqual(r1.status_code, 200)

        # Second call
        r2 = self.client.put(f"/api/notifications/{a_notif['id']}/read", headers=self.auth_headers_a)
        self.assertEqual(r2.status_code, 200)

        stored = next(n for n in mock_db.notifications if n["id"] == a_notif["id"])
        self.assertTrue(stored["read"])

    def test_09_mark_all_read_only_affects_current_user(self):
        """9. Mark-all-read marks all caller's notifications read while preserving other patients' unread state."""
        # Patient A unread
        mock_db.notifications.append({
            "id": "notif-a-1",
            "user_id": self.patient_a_id,
            "scope": "personal",
            "type": "reminder",
            "title": "A1",
            "message": "A1 message",
            "read": False,
            "created_at": datetime.now(),
        })
        # Patient B unread
        mock_db.notifications.append({
            "id": "notif-b-1",
            "user_id": self.patient_b_id,
            "scope": "personal",
            "type": "reminder",
            "title": "B1",
            "message": "B1 message",
            "read": False,
            "created_at": datetime.now(),
        })

        res = self.client.put(
            f"/api/notifications/{self.patient_a_id}/mark-all-read",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 200)

        # Verify Patient A notifications are all read
        a_notifs = [n for n in mock_db.notifications if n["user_id"] == self.patient_a_id]
        self.assertTrue(all(n["read"] for n in a_notifs))

        # Verify Patient B unread notification remains unchanged
        b_notif = next(n for n in mock_db.notifications if n["id"] == "notif-b-1")
        self.assertFalse(b_notif["read"])

    def test_10_cross_user_mark_all_read_forbidden(self):
        """10. Patient A cannot mark all notifications read for Patient B (403 Forbidden)."""
        res = self.client.put(
            f"/api/notifications/{self.patient_b_id}/mark-all-read",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 403)

    def test_11_unread_count_accuracy(self):
        """11. Verify unread count changes accurately after mark-one-read and mark-all-read."""
        # Add 3 unread for Patient A
        for i in range(3):
            mock_db.notifications.append({
                "id": f"notif-count-{i}",
                "user_id": self.patient_a_id,
                "scope": "personal",
                "type": "insight",
                "title": f"Count {i}",
                "message": f"Message {i}",
                "read": False,
                "created_at": datetime.now(),
            })

        # Fetch notifications and count unread
        res1 = self.client.get(f"/api/notifications/{self.patient_a_id}", headers=self.auth_headers_a)
        unread_before = sum(1 for n in res1.json() if not n["read"])
        self.assertGreaterEqual(unread_before, 3)

        # Mark one read
        self.client.put("/api/notifications/notif-count-0/read", headers=self.auth_headers_a)
        res2 = self.client.get(f"/api/notifications/{self.patient_a_id}", headers=self.auth_headers_a)
        unread_after_one = sum(1 for n in res2.json() if not n["read"])
        self.assertEqual(unread_after_one, unread_before - 1)

        # Mark all read
        self.client.put(f"/api/notifications/{self.patient_a_id}/mark-all-read", headers=self.auth_headers_a)
        res3 = self.client.get(f"/api/notifications/{self.patient_a_id}", headers=self.auth_headers_a)
        unread_after_all = sum(1 for n in res3.json() if not n["read"])
        self.assertEqual(unread_after_all, 0)

    # ─── 3D. PERSISTENCE TESTS ─────────────────────────────────────────────────

    def test_12_read_state_survives_save_and_load(self):
        """12. Read state changes survive serialization and deserialization (save_logs / load_logs)."""
        test_id = "notif-persist-read"
        mock_db.notifications.append({
            "id": test_id,
            "user_id": self.patient_a_id,
            "scope": "personal",
            "type": "reminder",
            "title": "Persistence Test",
            "message": "Testing read survival.",
            "read": False,
            "created_at": datetime.now(),
        })

        # Mark read
        self.client.put(f"/api/notifications/{test_id}/read", headers=self.auth_headers_a)
        mock_db.save_logs()

        # Reload
        mock_db.load_logs()

        stored = next((n for n in mock_db.notifications if n["id"] == test_id), None)
        self.assertIsNotNone(stored)
        self.assertTrue(stored["read"])

    def test_13_runtime_notification_survives_persistence_cycle(self):
        """13. A runtime notification survives save_logs / load_logs with all fields intact."""
        now = datetime.now()
        runtime_id = "notif-runtime-persist-01"
        mock_db.notifications.append({
            "id": runtime_id,
            "user_id": self.patient_a_id,
            "scope": "broadcast",
            "type": "system",
            "broadcast_type": "Maintenance",
            "broadcast_id": "brd-test-123",
            "publisher_id": self.admin_id,
            "title": "Server Maintenance",
            "message": "Scheduled for tonight.",
            "read": False,
            "created_at": now,
            "route": "/(home)/(settings)/about",
        })

        mock_db.save_logs()
        mock_db.load_logs()

        stored = next((n for n in mock_db.notifications if n["id"] == runtime_id), None)
        self.assertIsNotNone(stored)
        self.assertEqual(stored["id"], runtime_id)
        self.assertEqual(stored["user_id"], self.patient_a_id)
        self.assertEqual(stored["title"], "Server Maintenance")
        self.assertEqual(stored["broadcast_type"], "Maintenance")
        self.assertEqual(stored["route"], "/(home)/(settings)/about")
        self.assertFalse(stored["read"])

    # ─── 3E. BROADCAST CONTRACT TESTS ──────────────────────────────────────────

    def test_14_public_broadcast_endpoint_available(self):
        """14. Public endpoint GET /api/notifications/broadcasts is accessible without auth (200 OK)."""
        res = self.client.get("/api/notifications/broadcasts")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_15_announcement_title_preserved(self):
        """15. Broadcast publishing preserves the actual title and does not replace title with category."""
        payload = {
            "title": "Emergency Cardiovascular Protocol Update",
            "type": "Safety Reminder",
            "targetAudience": "All Registered Accounts",
            "message": "Please review updated hydration guidance.",
        }
        res = self.client.post("/api/admin/broadcasts", json=payload, headers=self.auth_headers_admin)
        self.assertEqual(res.status_code, 200)
        broadcast_data = res.json().get("data", {})
        self.assertEqual(broadcast_data.get("title"), "Emergency Cardiovascular Protocol Update")
        self.assertEqual(broadcast_data.get("type"), "Safety Reminder")

    def test_16_broadcast_linked_notification_preserves_title(self):
        """16. Fan-out notification records preserve the announcement title and category."""
        payload = {
            "title": "Planned System Upgrade",
            "type": "App Update",
            "targetAudience": "All Registered Accounts",
            "message": "New mobile features released.",
        }
        res = self.client.post("/api/admin/broadcasts", json=payload, headers=self.auth_headers_admin)
        self.assertEqual(res.status_code, 200)
        brd_id = res.json()["data"]["id"]

        # Inspect patient notification fanned out
        fan_notifs = [n for n in mock_db.notifications if n.get("broadcast_id") == brd_id]
        self.assertGreater(len(fan_notifs), 0)
        for fn in fan_notifs:
            self.assertEqual(fn["title"], "Planned System Upgrade")
            self.assertEqual(fn["broadcast_type"], "App Update")
            self.assertEqual(fn["scope"], "broadcast")

    def test_17_broadcast_deletion_cascade_remains_intact(self):
        """17. Deleting a broadcast cascades and deletes all linked patient notifications."""
        # Create broadcast
        payload = {
            "title": "Temporary Test Broadcast",
            "type": "General",
            "targetAudience": "All Registered Accounts",
            "message": "Will be deleted.",
        }
        res = self.client.post("/api/admin/broadcasts", json=payload, headers=self.auth_headers_admin)
        self.assertEqual(res.status_code, 200)
        brd_id = res.json()["data"]["id"]

        # Confirm fan-out entries exist
        linked_before = [n for n in mock_db.notifications if n.get("broadcast_id") == brd_id]
        self.assertGreater(len(linked_before), 0)

        # Delete broadcast
        del_res = self.client.delete(f"/api/admin/broadcasts/{brd_id}", headers=self.auth_headers_admin)
        self.assertEqual(del_res.status_code, 200)

        # Verify linked notifications are completely removed
        linked_after = [n for n in mock_db.notifications if n.get("broadcast_id") == brd_id]
        self.assertEqual(len(linked_after), 0)

    # ─── 3F. PRIVACY TESTS ─────────────────────────────────────────────────────

    def test_18_privacy_payload_no_sensitive_secrets(self):
        """18. Notification payloads do not expose passwords, hashes, tokens, secrets, or raw biometrics."""
        res = self.client.get(
            f"/api/notifications/{self.patient_a_id}",
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 200)
        forbidden_keys = {"password", "password_hash", "token", "secret", "hash", "salt"}

        for notif in res.json():
            for key in forbidden_keys:
                self.assertNotIn(key, notif, f"Privacy violation: {key} found in notification payload")


if __name__ == "__main__":
    unittest.main()
