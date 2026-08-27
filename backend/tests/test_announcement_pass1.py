"""
HeartLink — Announcement Module Pass 1 Tests
Tests: title validation, notification headline fix, audience safety,
       category whitelist, activity log target_name, backward compatibility.
"""
import os
import sys
import unittest
from fastapi.testclient import TestClient
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token


def _admin_headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestAnnouncementPass1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})
        cls.super_token = create_access_token({"user_id": "usr-super-admin-001", "role": "super_admin"})
        cls.expert_token = create_access_token({"user_id": "usr-expert-201", "role": "medical_expert"})

    def setUp(self):
        # Snapshot state
        self._orig_broadcasts = [dict(b) for b in mock_db.system_broadcasts]
        self._orig_notifications = [dict(n) for n in mock_db.notifications]
        self._orig_activity = [dict(a) for a in mock_db.admin_activity]

    def tearDown(self):
        # Restore state
        mock_db.system_broadcasts[:] = self._orig_broadcasts
        mock_db.notifications[:] = self._orig_notifications
        mock_db.admin_activity[:] = self._orig_activity

    # ------------------------------------------------------------------
    # 1. Title required
    # ------------------------------------------------------------------
    def test_01_title_required_missing(self):
        """POST without title returns 422."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"type": "General", "message": "Hello", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------
    # 2. Title whitespace-only rejected
    # ------------------------------------------------------------------
    def test_02_title_whitespace_rejected(self):
        """POST with whitespace-only title returns 422."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "   ", "type": "General", "message": "Hello", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------
    # 3. Title max length enforced (81 chars should fail)
    # ------------------------------------------------------------------
    def test_03_title_max_length_enforced(self):
        """POST with title > 80 chars returns 422."""
        long_title = "A" * 81
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": long_title, "type": "General", "message": "Hello", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------
    # 4. Title at exactly 80 chars is accepted
    # ------------------------------------------------------------------
    def test_04_title_exactly_80_chars_accepted(self):
        """POST with title of exactly 80 chars is accepted."""
        title_80 = "B" * 80
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": title_80, "type": "General", "message": "Valid message", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 200)

    # ------------------------------------------------------------------
    # 5. Valid category accepted
    # ------------------------------------------------------------------
    def test_05_valid_category_accepted(self):
        """All four valid categories should be accepted."""
        for cat in ["Maintenance", "App Update", "Safety Reminder", "General"]:
            r = self.client.post(
                "/api/admin/broadcasts",
                json={"title": f"Test {cat}", "type": cat, "message": "msg", "targetAudience": "All Registered Accounts"},
                headers=_admin_headers(self.admin_token),
            )
            self.assertEqual(r.status_code, 200, f"Category '{cat}' was rejected unexpectedly")

    # ------------------------------------------------------------------
    # 6. Invalid category rejected
    # ------------------------------------------------------------------
    def test_06_invalid_category_rejected(self):
        """POST with an unlisted category returns 422."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Test", "type": "High-Risk Alert", "message": "msg", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------
    # 7. Valid audience accepted
    # ------------------------------------------------------------------
    def test_07_valid_audience_accepted(self):
        """'All Registered Accounts' is accepted."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Good", "type": "General", "message": "msg", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 200)

    # ------------------------------------------------------------------
    # 8. Invalid audience (High-Risk Individuals Only) rejected
    # ------------------------------------------------------------------
    def test_08_high_risk_audience_rejected(self):
        """'High-Risk Individuals Only' is no longer a valid audience value."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Targeted", "type": "General", "message": "msg", "targetAudience": "High-Risk Individuals Only"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------
    # 9. System Staff Only audience rejected
    # ------------------------------------------------------------------
    def test_09_staff_only_audience_rejected(self):
        """'System Staff Only' is no longer a valid audience value."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Staff only", "type": "General", "message": "msg", "targetAudience": "System Staff Only"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------
    # 10. New broadcast stores title
    # ------------------------------------------------------------------
    def test_10_new_broadcast_stores_title(self):
        """Created broadcast record should contain the supplied title."""
        title = "Scheduled DB Maintenance"
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": title, "type": "Maintenance", "message": "Brief downtime expected.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()["data"]
        self.assertEqual(data["title"], title)

    # ------------------------------------------------------------------
    # 11. notification.title equals announcement title (not category)
    # ------------------------------------------------------------------
    def test_11_notification_title_equals_announcement_title(self):
        """After creation, linked notifications should carry the announcement title, not the category."""
        before_ids = {n["id"] for n in mock_db.notifications}
        title = "Safety Check — Please Review"
        self.client.post(
            "/api/admin/broadcasts",
            json={"title": title, "type": "Safety Reminder", "message": "Check your HSS score.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        new_notifs = [n for n in mock_db.notifications if n["id"] not in before_ids]
        self.assertGreater(len(new_notifs), 0, "No notifications were created")
        for n in new_notifs:
            self.assertEqual(n["title"], title, f"Notification title should be '{title}', got '{n['title']}'")

    # ------------------------------------------------------------------
    # 12. notification.broadcast_type equals category
    # ------------------------------------------------------------------
    def test_12_notification_broadcast_type_equals_category(self):
        """broadcast_type in notification should be the category string, not the title."""
        before_ids = {n["id"] for n in mock_db.notifications}
        self.client.post(
            "/api/admin/broadcasts",
            json={"title": "App Refresh", "type": "App Update", "message": "New version available.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        new_notifs = [n for n in mock_db.notifications if n["id"] not in before_ids]
        self.assertGreater(len(new_notifs), 0)
        for n in new_notifs:
            self.assertEqual(n["broadcast_type"], "App Update")

    # ------------------------------------------------------------------
    # 13. Old records without title do not crash loading
    # ------------------------------------------------------------------
    def test_13_old_records_without_title_survive_load(self):
        """Records lacking the title field should be returned without crashing."""
        # Inject a legacy record with no title
        legacy = {
            "id": "brd-legacy-test",
            "date": "Jan 01, 2026 09:00 AM",
            "publisher": "SYS-00 (Legacy Admin)",
            "message": "Legacy message from before title was added.",
            "type": "General",
            "target_audience": "All Registered Accounts",
            "created_at": datetime(2026, 1, 1, 9, 0, 0),
        }
        mock_db.system_broadcasts.append(legacy)
        r = self.client.get("/api/admin/broadcasts", headers=_admin_headers(self.admin_token))
        self.assertEqual(r.status_code, 200)
        ids = [b["id"] for b in r.json()]
        self.assertIn("brd-legacy-test", ids)

    # ------------------------------------------------------------------
    # 14. Activity log target_name uses announcement title
    # ------------------------------------------------------------------
    def test_14_activity_log_uses_announcement_title(self):
        """record_admin_activity should receive the announcement title, not the category."""
        before_ids = {a["id"] for a in mock_db.admin_activity}
        title = "Infrastructure Update Tonight"
        self.client.post(
            "/api/admin/broadcasts",
            json={"title": title, "type": "Maintenance", "message": "Short maintenance window.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        new_acts = [a for a in mock_db.admin_activity if a["id"] not in before_ids]
        self.assertTrue(any(a.get("target_name") == title for a in new_acts),
                        f"Expected activity with target_name='{title}', got: {[a.get('target_name') for a in new_acts]}")

    # ------------------------------------------------------------------
    # 15. All active users receive announcement (no HSS targeting)
    # ------------------------------------------------------------------
    def test_15_all_active_patients_receive_announcement(self):
        """Fan-out should create one notification per active patient, regardless of audience."""
        active_patients = [p for p in mock_db.profiles if p.get("role") == "patient" and p.get("account_status") == "active"]
        before_count = len(mock_db.notifications)
        self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Fan-out Test", "type": "General", "message": "Testing fan-out.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        new_count = len(mock_db.notifications) - before_count
        self.assertEqual(new_count, len(active_patients),
                         f"Expected {len(active_patients)} notifications, got {new_count}")

    # ------------------------------------------------------------------
    # 16. No HSS data used in fan-out
    # ------------------------------------------------------------------
    def test_16_no_hss_based_targeting_performed(self):
        """Notification recipients must NOT be filtered by HSS tier."""
        # All active patients, including low-risk ones, must receive the announcement
        active_patients = {p["id"] for p in mock_db.profiles if p.get("role") == "patient" and p.get("account_status") == "active"}
        before_ids = {n["id"] for n in mock_db.notifications}
        self.client.post(
            "/api/admin/broadcasts",
            json={"title": "No HSS Filter", "type": "General", "message": "Everyone gets this.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        notif_user_ids = {n["user_id"] for n in mock_db.notifications if n["id"] not in before_ids}
        # Every active patient should be in the notified set
        missing = active_patients - notif_user_ids
        self.assertEqual(len(missing), 0, f"Patients not notified (suggests HSS filtering): {missing}")

    # ------------------------------------------------------------------
    # 17. Activity log uses title on delete too
    # ------------------------------------------------------------------
    def test_17_delete_activity_log_uses_title(self):
        """DELETE /broadcasts/{id} should log the title, not the category."""
        # Create first
        title = "Delete Title Test"
        create_r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": title, "type": "General", "message": "Will be deleted.", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        broadcast_id = create_r.json()["data"]["id"]
        before_ids = {a["id"] for a in mock_db.admin_activity}

        self.client.delete(f"/api/admin/broadcasts/{broadcast_id}", headers=_admin_headers(self.admin_token))

        new_acts = [a for a in mock_db.admin_activity if a["id"] not in before_ids and a.get("action") == "deleted"]
        self.assertTrue(any(a.get("target_name") == title for a in new_acts),
                        f"Expected delete activity with target_name='{title}'")

    # ------------------------------------------------------------------
    # 18. recipients_count in POST response
    # ------------------------------------------------------------------
    def test_18_recipients_count_in_response(self):
        """POST response should include recipients_count."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Count Test", "type": "General", "message": "msg", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("recipients_count", r.json())
        self.assertIsInstance(r.json()["recipients_count"], int)

    # ------------------------------------------------------------------
    # 19. display_publisher stored on new broadcasts
    # ------------------------------------------------------------------
    def test_19_display_publisher_stored(self):
        """New broadcasts should contain display_publisher (clean name, no user ID prefix)."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "Publisher Test", "type": "General", "message": "msg", "targetAudience": "All Registered Accounts"},
            headers=_admin_headers(self.admin_token),
        )
        data = r.json()["data"]
        self.assertIn("display_publisher", data)
        # display_publisher should NOT contain the raw user ID pattern 'usr-...'
        self.assertNotRegex(data["display_publisher"], r"^usr-")

    # ------------------------------------------------------------------
    # 20. RBAC: unauthenticated cannot create broadcasts
    # ------------------------------------------------------------------
    def test_20_unauthenticated_cannot_create_broadcast(self):
        """Unauthenticated requests to POST /api/admin/broadcasts should fail.
        Note: get_current_admin_user allows medical_expert (shared with clinical modules);
        route-level blocking for medical_expert is enforced in the Web Admin UI layout."""
        r = self.client.post(
            "/api/admin/broadcasts",
            json={"title": "No Auth", "type": "General", "message": "msg", "targetAudience": "All Registered Accounts"},
        )
        self.assertIn(r.status_code, [401, 403])


if __name__ == "__main__":
    unittest.main(verbosity=2)
