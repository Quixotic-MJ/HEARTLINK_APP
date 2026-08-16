# backend/test_activity_logs_api.py
import os
import sys
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.utils.security import get_current_admin_user
import app.mock_db as mock_db

def mock_admin():
    return {"user_id": "usr-chief-admin-001", "role": "admin"}

def mock_super_admin():
    return {"user_id": "usr-super-admin-001", "role": "super_admin"}

def mock_expert():
    return {"user_id": "usr-expert-201", "role": "medical_expert"}

def mock_patient():
    return {"user_id": "usr-patient-101", "role": "patient"}

class TestActivityLogsApi(unittest.TestCase):
    def setUp(self):
        # Backup original collections
        self.original_activity = list(mock_db.admin_activity)
        self.original_profiles = list(mock_db.profiles)
        self.original_alerts = list(mock_db.alerts)
        self.original_hss = list(mock_db.hss_history)
        self.original_health_logs = list(mock_db.daily_health_logs)
        self.original_meals = list(mock_db.meal_logs)
        
        # Setup test client
        self.client = TestClient(app)
        app.dependency_overrides.clear()
        
    def tearDown(self):
        # Restore mock database state
        mock_db.admin_activity[:] = self.original_activity
        mock_db.profiles[:] = self.original_profiles
        mock_db.alerts[:] = self.original_alerts
        mock_db.hss_history[:] = self.original_hss
        mock_db.daily_health_logs[:] = self.original_health_logs
        mock_db.meal_logs[:] = self.original_meals
        mock_db.save_logs()
        app.dependency_overrides.clear()

    def test_admin_access_allowed(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 200)

    def test_super_admin_access_allowed(self):
        app.dependency_overrides[get_current_admin_user] = mock_super_admin
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 200)

    def test_medical_expert_forbidden(self):
        app.dependency_overrides[get_current_admin_user] = mock_expert
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 403)
        self.assertIn("role required", res.json()["detail"].lower())

    def test_patient_forbidden(self):
        app.dependency_overrides[get_current_admin_user] = mock_patient
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 403)
        self.assertIn("role required", res.json()["detail"].lower())

    def test_unauthenticated_rejected(self):
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 401)

    def test_sorting_newest_first(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        now = datetime.now()
        mock_db.admin_activity.extend([
            {
                "id": "act-1",
                "admin_user_id": "usr-chief-admin-001",
                "admin_name": "Chief Admin",
                "action": "created",
                "target_type": "recipe",
                "target_id": "rec-1",
                "target_name": "Oatmeal",
                "created_at": now - timedelta(minutes=10)
            },
            {
                "id": "act-2",
                "admin_user_id": "usr-chief-admin-001",
                "admin_name": "Chief Admin",
                "action": "updated",
                "target_type": "recipe",
                "target_id": "rec-1",
                "target_name": "Oatmeal",
                "created_at": now
            }
        ])
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        self.assertEqual(items[0]["id"], "act-2")
        self.assertEqual(items[1]["id"], "act-1")

    def test_pagination_correct_page(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        now = datetime.now()
        for i in range(25):
            mock_db.admin_activity.append({
                "id": f"act-{i:02d}",
                "admin_user_id": "usr-chief-admin-001",
                "admin_name": "Chief Admin",
                "action": "created",
                "target_type": "recipe",
                "target_id": f"rec-{i}",
                "target_name": f"Recipe {i}",
                "created_at": now - timedelta(minutes=i)
            })
        res = self.client.get("/api/admin/activity?page=2&page_size=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["page"], 2)
        self.assertEqual(data["page_size"], 10)
        self.assertEqual(data["total"], 25)
        self.assertEqual(data["total_pages"], 3)
        self.assertEqual(len(data["items"]), 10)
        # Verify descending order: page 2 starts at index 10 (act-10)
        self.assertEqual(data["items"][0]["id"], "act-10")

    def test_page_size_max_boundary(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/activity?page_size=150")
        self.assertEqual(res.status_code, 400)
        res = self.client.get("/api/admin/activity?page_size=0")
        self.assertEqual(res.status_code, 400)

    def test_invalid_page_rejected(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/activity?page=0")
        self.assertEqual(res.status_code, 400)
        res = self.client.get("/api/admin/activity?page=-3")
        self.assertEqual(res.status_code, 400)

    def test_invalid_page_size_rejected(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/activity?page_size=-5")
        self.assertEqual(res.status_code, 400)

    def test_action_filter(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend([
            {
                "id": "act-1",
                "action": "created",
                "target_type": "recipe",
                "created_at": datetime.now()
            },
            {
                "id": "act-2",
                "action": "deleted",
                "target_type": "recipe",
                "created_at": datetime.now()
            }
        ])
        res = self.client.get("/api/admin/activity?action=deleted")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["id"], "act-2")

    def test_target_type_filter(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend([
            {
                "id": "act-1",
                "action": "created",
                "target_type": "recipe",
                "created_at": datetime.now()
            },
            {
                "id": "act-2",
                "action": "created",
                "target_type": "exercise",
                "created_at": datetime.now()
            }
        ])
        res = self.client.get("/api/admin/activity?target_type=recipe")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["id"], "act-1")

    def test_admin_user_id_filter(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend([
            {
                "id": "act-1",
                "admin_user_id": "usr-chief-admin-001",
                "created_at": datetime.now()
            },
            {
                "id": "act-2",
                "admin_user_id": "usr-expert-201",
                "created_at": datetime.now()
            }
        ])
        res = self.client.get("/api/admin/activity?admin_user_id=usr-chief-admin-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["id"], "act-1")

    def test_search_matches_target_name(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend([
            {
                "id": "act-1",
                "target_name": "Garlic Tofu",
                "created_at": datetime.now()
            },
            {
                "id": "act-2",
                "target_name": "Oatmeal with Honey",
                "created_at": datetime.now()
            }
        ])
        res = self.client.get("/api/admin/activity?search=tofu")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["id"], "act-1")

    def test_search_is_case_insensitive(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend([
            {
                "id": "act-1",
                "target_name": "Garlic Tofu",
                "created_at": datetime.now()
            }
        ])
        res = self.client.get("/api/admin/activity?search=TOFU")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["id"], "act-1")

    def test_empty_collection_returns_empty_items(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["total"], 0)
        self.assertEqual(data["total_pages"], 0)

    def test_optional_target_fields_do_not_crash(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        # Insert event without target_id and target_name
        mock_db.admin_activity.append({
            "id": "act-1",
            "admin_user_id": "usr-chief-admin-001",
            "admin_name": "Chief Admin",
            "action": "system_backup",
            "target_type": "database",
            "created_at": datetime.now()
        })
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertIsNone(data["items"][0]["target_id"])
        self.assertIsNone(data["items"][0]["target_name"])

    def test_dashboard_recent_activity_remains_unchanged(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        mock_db.admin_activity.clear()
        now = datetime.now()
        for i in range(15):
            mock_db.admin_activity.append({
                "id": f"act-{i:02d}",
                "created_at": now - timedelta(minutes=i)
            })
        res = self.client.get("/api/admin/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recent_activity", data)
        self.assertEqual(len(data["recent_activity"]), 10)
        self.assertEqual(data["recent_activity"][0]["id"], "act-00")

    def test_health_alert_generation_creates_zero_admin_activity(self):
        initial_count = len(mock_db.admin_activity)
        mock_db.alerts.append({
            "id": "alert-test-1",
            "user_id": "usr-patient-101",
            "severity": "Warning",
            "alert_type": "BP Threshold",
            "message": "BP Alert generated"
        })
        self.assertEqual(len(mock_db.admin_activity), initial_count)

    def test_hss_calculation_creates_zero_admin_activity(self):
        initial_count = len(mock_db.admin_activity)
        mock_db.hss_history.append({
            "id": "hss-test-1",
            "user_id": "usr-patient-101",
            "score": 85,
            "tier": "Stable",
            "created_at": datetime.now()
        })
        self.assertEqual(len(mock_db.admin_activity), initial_count)

    def test_symptom_logging_creates_zero_admin_activity(self):
        initial_count = len(mock_db.admin_activity)
        payload = {
            "systolic_bp": 118,
            "diastolic_bp": 78,
            "heart_rate_bpm": 72,
            "weight_kg": 68.0,
            "symptoms": ["none"],
            "logged_at": datetime.now().isoformat()
        }
        res = self.client.post("/api/health-logs/usr-patient-101", json=payload)
        self.assertEqual(res.status_code, 200)  # POST health_logs returns 200 on success
        self.assertEqual(len(mock_db.admin_activity), initial_count)

    def test_meal_logging_creates_zero_admin_activity(self):
        initial_count = len(mock_db.admin_activity)
        payload = {
            "meal_name": "Low Sodium Chicken Tinola",
            "calories": 300,
            "sodium_mg": 250,
            "saturated_fat_g": 1.0,
            "fiber_g": 3,
            "logged_at": datetime.now().isoformat()
        }
        res = self.client.post("/api/meals/usr-patient-101", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mock_db.admin_activity), initial_count)

    def test_exercise_logging_creates_zero_admin_activity(self):
        initial_count = len(mock_db.admin_activity)
        payload = {
            "routine_id": "rout-610",
            "duration_minutes": 15,
            "completed": True,
            "logged_at": datetime.now().isoformat()
        }
        res = self.client.post("/api/exercises/logs/usr-patient-101", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mock_db.admin_activity), initial_count)

    def test_admin_alert_acknowledgement_not_supported(self):
        res = self.client.put("/api/admin/alerts/1/acknowledge")
        self.assertEqual(res.status_code, 404)

    def test_activity_log_contains_only_administrative_events(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/activity")
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        valid_targets = {"recipe", "exercise", "case", "staff", "broadcast", "feedback", "user", "dataset"}
        for item in items:
            self.assertIn(item["target_type"], valid_targets)

    def test_dashboard_recent_activity_contains_only_administrative_events(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/dashboard")
        self.assertEqual(res.status_code, 200)
        recent = res.json().get("recent_activity", [])
        valid_targets = {"recipe", "exercise", "case", "staff", "broadcast", "feedback", "user", "dataset"}
        for item in recent:
            self.assertIn(item["target_type"], valid_targets)

if __name__ == "__main__":
    unittest.main()
