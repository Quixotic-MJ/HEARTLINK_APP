import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token

class TestFeedbackIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})
        cls.super_admin_token = create_access_token({"user_id": "usr-super-admin-001", "role": "super_admin"})
        cls.expert_token = create_access_token({"user_id": "usr-expert-201", "role": "medical_expert"})
        cls.patient_token = "usr-patient-101"

    def setUp(self):
        # Backup original database state
        self.original_tickets = [dict(t) for t in mock_db.feedback_tickets]
        self.original_activity = [dict(a) for a in mock_db.admin_activity]
        
        # Unconditionally clear and seed specific tickets for testing
        mock_db.feedback_tickets.clear()
        mock_db.feedback_tickets.extend([
            {
                "id": 1,
                "ticketId": "FB-1042",
                "date": "May 28, 2026",
                "user": "Robert Villanueva",
                "userEmail": "robert.v@email.com",
                "userId": "USR-A492",
                "category": "Bug Report",
                "preview": "The barcode scanner crashes when...",
                "fullMessage": "The barcode scanner crashes when I try to scan a generic oat brand. The camera opens, but right after it recognizes the barcode, the app completely freezes and closes itself.",
                "status": "Open",
                "deviceMeta": {
                    "os": "Android 14",
                    "model": "Samsung Galaxy S23 Ultra",
                    "appVersion": "v1.2.4",
                },
                "adminNotes": "",
            },
            {
                "id": 2,
                "ticketId": "FB-1041",
                "date": "May 27, 2026",
                "user": "Elena Marasigan",
                "userEmail": "elena.m@email.com",
                "userId": "USR-B118",
                "category": "UI/UX Suggestion",
                "preview": "Could you make the recipe font bigger?",
                "fullMessage": "I love the heart-healthy recipes, but when I am cooking in the kitchen, the font for the ingredients list is very hard to read from a distance. Could you add a text size toggle?",
                "status": "In Progress",
                "deviceMeta": {
                    "os": "iOS 17.4",
                    "model": "iPhone 13 Pro",
                    "appVersion": "v1.2.4",
                },
                "adminNotes": "Assigned to UI team. Planning to add an accessibility slider in the next minor patch.",
            },
            {
                "id": 3,
                "ticketId": "FB-1039",
                "user": "Miguel Santos",
                "userEmail": "miguel88@email.com",
                "userId": "USR-C882",
                "category": "Account Issue",
                "preview": "I cannot reset my password...",
                "fullMessage": "I forgot my password, but when I click the reset link in my email, it says the token is invalid or expired. I've tried this three times now.",
                "status": "Resolved",
                "deviceMeta": {
                    "os": "Android 13",
                    "model": "Google Pixel 6a",
                    "appVersion": "v1.2.3",
                },
                "adminNotes": "Known Firebase auth token expiration bug. Sent manual reset link and patched backend token lifespan.",
            },
            {
                "id": 4,
                "ticketId": "FB-1035",
                "user": "Anonymous User",
                "userEmail": "Not Provided",
                "userId": "N/A",
                "category": "Question",
                "preview": "Does the CSS score update automatically?",
                "fullMessage": "If I log my blood pressure today, does my Health Stability Score update right away, or does it take 24 hours?",
                "status": "Resolved",
                "deviceMeta": { "os": "Unknown", "model": "Unknown", "appVersion": "Unknown" },
                "adminNotes": "Replied via in-app notification confirming real-time updates.",
            }
        ])
        mock_db.save_logs()

    def tearDown(self):
        # Restore mock state
        mock_db.feedback_tickets.clear()
        mock_db.feedback_tickets.extend(self.original_tickets)
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend(self.original_activity)
        mock_db.save_logs()

    def test_unauthenticated_get(self):
        r = self.client.get("/api/feedback/")
        self.assertIn(r.status_code, [401, 403])

    def test_patient_get(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        r = self.client.get("/api/feedback/", headers=headers)
        self.assertEqual(r.status_code, 403)

    def test_admin_get(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        r = self.client.get("/api/feedback/", headers=headers)
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_super_admin_get(self):
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        r = self.client.get("/api/feedback/", headers=headers)
        self.assertEqual(r.status_code, 200)

    def test_unauthenticated_put(self):
        r = self.client.put("/api/feedback/1", json={"status": "Resolved"})
        self.assertIn(r.status_code, [401, 403])

    def test_patient_put(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        r = self.client.put("/api/feedback/1", json={"status": "Resolved"}, headers=headers)
        self.assertEqual(r.status_code, 403)

    def test_admin_put(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        r = self.client.put("/api/feedback/1", json={"status": "Resolved"}, headers=headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "Resolved")

    def test_super_admin_put(self):
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        r = self.client.put("/api/feedback/1", json={"status": "Resolved"}, headers=headers)
        self.assertEqual(r.status_code, 200)

    def test_authenticated_user_submit(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        payload = {
            "category": "Bug Report",
            "fullMessage": "Scanner doesn't work.",
            "userId": "usr-patient-101"
        }
        r = self.client.post("/api/feedback/", json=payload, headers=headers)
        self.assertEqual(r.status_code, 200)
        ticket = r.json()
        self.assertEqual(ticket["userId"], "usr-patient-101")
        self.assertEqual(ticket["user"], "John Mark Magdasal")
        self.assertEqual(ticket["category"], "Bug Report")

    def test_user_impersonate_impersonation_denied(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        payload = {
            "category": "Bug Report",
            "fullMessage": "Scanner doesn't work.",
            "userId": "usr-patient-102"
        }
        r = self.client.post("/api/feedback/", json=payload, headers=headers)
        self.assertEqual(r.status_code, 403)

    def test_invalid_category_rejected(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        payload = {
            "category": "Random Category",
            "fullMessage": "Scanner doesn't work.",
            "userId": "usr-patient-101"
        }
        r = self.client.post("/api/feedback/", json=payload, headers=headers)
        self.assertEqual(r.status_code, 400)

    def test_empty_message_rejected(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        payload = {
            "category": "Bug Report",
            "fullMessage": "   ",
            "userId": "usr-patient-101"
        }
        r = self.client.post("/api/feedback/", json=payload, headers=headers)
        self.assertEqual(r.status_code, 400)

    def test_invalid_status_rejected(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        r = self.client.put("/api/feedback/1", json={"status": "InvalidStatus"}, headers=headers)
        self.assertEqual(r.status_code, 400)

    def test_successful_status_update_creates_one_admin_activity(self):
        mock_db.admin_activity.clear()
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        r = self.client.put("/api/feedback/1", json={"status": "In Progress", "adminNotes": "In work..."}, headers=headers)
        self.assertEqual(r.status_code, 200)
        
        self.assertEqual(len(mock_db.admin_activity), 1)
        activity = mock_db.admin_activity[0]
        self.assertEqual(activity["action"], "updated")
        self.assertEqual(activity["target_type"], "feedback")
        self.assertEqual(activity["target_name"], r.json()["ticketId"])

    def test_failed_update_creates_zero_admin_activity(self):
        mock_db.admin_activity.clear()
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        # Non-existent ticket ID
        r = self.client.put("/api/feedback/9999", json={"status": "Resolved"}, headers=headers)
        self.assertEqual(r.status_code, 404)
        
        # Invalid status
        r = self.client.put("/api/feedback/1", json={"status": "InvalidStatus"}, headers=headers)
        self.assertEqual(r.status_code, 400)
        
        self.assertEqual(len(mock_db.admin_activity), 0)

    def test_persistence_survives_save_load(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Modify ticket 1
        r = self.client.put("/api/feedback/1", json={"status": "In Progress", "adminNotes": "Notes 123"}, headers=headers)
        self.assertEqual(r.status_code, 200)
        
        mock_db.feedback_tickets.clear()
        mock_db.load_logs()
        
        ticket = next((t for t in mock_db.feedback_tickets if t["id"] == 1), None)
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket["status"], "In Progress")
        self.assertEqual(ticket["adminNotes"], "Notes 123")

    def test_id_uniqueness(self):
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        
        payload = {
            "category": "Question",
            "fullMessage": "First question message.",
            "userId": "usr-patient-101"
        }
        r1 = self.client.post("/api/feedback/", json=payload, headers=headers)
        self.assertEqual(r1.status_code, 200)
        
        payload2 = {
            "category": "Question",
            "fullMessage": "Second question message.",
            "userId": "usr-patient-101"
        }
        r2 = self.client.post("/api/feedback/", json=payload2, headers=headers)
        self.assertEqual(r2.status_code, 200)
        
        t1 = r1.json()
        t2 = r2.json()
        
        self.assertNotEqual(t1["id"], t2["id"])
        self.assertNotEqual(t1["ticketId"], t2["ticketId"])

    def test_archive_preserves_notes(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        r = self.client.put("/api/feedback/1", json={"status": "Archived", "adminNotes": "Archiving notes ABC"}, headers=headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "Archived")
        self.assertEqual(r.json()["adminNotes"], "Archiving notes ABC")
        
        mock_db.feedback_tickets.clear()
        mock_db.load_logs()
        
        ticket = next((t for t in mock_db.feedback_tickets if t["id"] == 1), None)
        self.assertEqual(ticket["status"], "Archived")
        self.assertEqual(ticket["adminNotes"], "Archiving notes ABC")

    def test_restore_from_archived(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        self.client.put("/api/feedback/1", json={"status": "Archived"}, headers=headers)
        
        r = self.client.put("/api/feedback/1", json={"status": "In Progress"}, headers=headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "In Progress")
        
        restore_activities = [a for a in mock_db.admin_activity if a["action"] == "restored"]
        self.assertEqual(len(restore_activities), 1)

if __name__ == "__main__":
    unittest.main()
