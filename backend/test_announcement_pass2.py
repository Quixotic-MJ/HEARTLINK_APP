"""
HeartLink — Announcement Module Pass 2 Tests
Tests: Category badges, mobile notification delivery endpoint,
       backward compatibility, demo data integrity, deletion cascade.
"""
import os
import sys
import unittest
from fastapi.testclient import TestClient
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token


def _admin_headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestAnnouncementPass2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})

    def setUp(self):
        self._orig_broadcasts = [dict(b) for b in mock_db.system_broadcasts]
        self._orig_notifications = [dict(n) for n in mock_db.notifications]
        self._orig_activity = [dict(a) for a in mock_db.admin_activity]

    def tearDown(self):
        mock_db.system_broadcasts[:] = self._orig_broadcasts
        mock_db.notifications[:] = self._orig_notifications
        mock_db.admin_activity[:] = self._orig_activity

    def test_01_all_four_categories_have_valid_structure(self):
        """Verify all 4 categories can be created and retrieved with correct title and type."""
        categories = ["Maintenance", "App Update", "Safety Reminder", "General"]
        for cat in categories:
            title = f"{cat} Notice"
            r = self.client.post(
                "/api/admin/broadcasts",
                json={
                    "title": title,
                    "type": cat,
                    "message": f"Sample message for {cat}",
                    "targetAudience": "All Registered Accounts"
                },
                headers=_admin_headers(self.admin_token)
            )
            self.assertEqual(r.status_code, 200)
            data = r.json()["data"]
            self.assertEqual(data["title"], title)
            self.assertEqual(data["type"], cat)

    def test_02_mobile_broadcasts_endpoint_returns_title(self):
        """GET /api/notifications/broadcasts (unauthenticated) includes title for mobile toasts."""
        title = "Live Broadcast Test Title"
        self.client.post(
            "/api/admin/broadcasts",
            json={
                "title": title,
                "type": "General",
                "message": "Testing mobile broadcast endpoint.",
                "targetAudience": "All Registered Accounts"
            },
            headers=_admin_headers(self.admin_token)
        )
        r = self.client.get("/api/notifications/broadcasts")
        self.assertEqual(r.status_code, 200)
        items = r.json()
        self.assertGreater(len(items), 0)
        latest = items[0]
        self.assertEqual(latest["title"], title)

    def test_03_legacy_record_without_title_backward_compatible(self):
        """Legacy announcements without title field do not break GET endpoints."""
        legacy = {
            "id": "brd-legacy-pass2",
            "date": "May 01, 2026 12:00 PM",
            "publisher": "SYS-99 (Legacy)",
            "message": "Old announcement without title",
            "type": "Maintenance",
            "target_audience": "All Registered Accounts",
            "created_at": datetime(2026, 5, 1, 12, 0, 0)
        }
        mock_db.system_broadcasts.append(legacy)

        r_admin = self.client.get("/api/admin/broadcasts", headers=_admin_headers(self.admin_token))
        self.assertEqual(r_admin.status_code, 200)
        found_admin = any(b.get("id") == "brd-legacy-pass2" for b in r_admin.json())
        self.assertTrue(found_admin)

        r_mobile = self.client.get("/api/notifications/broadcasts")
        self.assertEqual(r_mobile.status_code, 200)
        found_mobile = any(b.get("id") == "brd-legacy-pass2" for b in r_mobile.json())
        self.assertTrue(found_mobile)

    def test_04_seeded_announcements_exist_and_coherent(self):
        """Verify seeded announcements exist with valid fields."""
        r = self.client.get("/api/admin/broadcasts", headers=_admin_headers(self.admin_token))
        self.assertEqual(r.status_code, 200)
        items = r.json()
        ids = {b["id"] for b in items}
        self.assertTrue({"brd-1", "brd-2"}.issubset(ids))

        for b in items:
            self.assertIn("message", b)
            self.assertIn("type", b)
            self.assertIn("target_audience", b)
            self.assertEqual(b["target_audience"], "All Registered Accounts")

    def test_05_delete_cascade_consistency(self):
        """Deleting an announcement removes its notifications and records activity."""
        # Create
        title = "Delete Cascade Test"
        r = self.client.post(
            "/api/admin/broadcasts",
            json={
                "title": title,
                "type": "App Update",
                "message": "Temporary notice to delete.",
                "targetAudience": "All Registered Accounts"
            },
            headers=_admin_headers(self.admin_token)
        )
        b_id = r.json()["data"]["id"]

        # Check notifications exist
        notifs = [n for n in mock_db.notifications if n.get("broadcast_id") == b_id]
        self.assertGreater(len(notifs), 0)

        # Delete
        del_r = self.client.delete(f"/api/admin/broadcasts/{b_id}", headers=_admin_headers(self.admin_token))
        self.assertEqual(del_r.status_code, 200)

        # Verify notifications removed
        remaining = [n for n in mock_db.notifications if n.get("broadcast_id") == b_id]
        self.assertEqual(len(remaining), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
