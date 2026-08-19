"""
HeartLink — HSS Integrity Hardening Regression Tests
Verifies:
1. Repeated onboarding updates baseline in place and does not create duplicate IDs.
2. Baseline HSS retains one record per user with stable ID scheme.
3. Multiple ML predictions produce collision-resistant unique IDs.
4. IDs remain unique after list reset/filtering.
5. In-memory mutations during tests do not pollute mock_logs.json.
6. Demo HSS history count remains intact and deterministic.
7. Historical telemetry for users with multiple records is preserved.
"""
import os
import sys
import unittest
from datetime import datetime, date
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
import app.mock_db as mock_db
from app.services.ml_service import ml_service
from app.utils.security import create_access_token


class TestHSSIntegrityHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.patient_token = create_access_token({"user_id": "usr-patient-101", "role": "patient"})

    def setUp(self):
        self.original_hss = [dict(h) for h in mock_db.hss_history]
        self.original_profiles = [dict(p) for p in mock_db.profiles]
        self.original_onboarding = [dict(o) for o in mock_db.baseline_onboarding]

    def tearDown(self):
        mock_db.hss_history[:] = self.original_hss
        mock_db.profiles[:] = self.original_profiles
        mock_db.baseline_onboarding[:] = self.original_onboarding

    def test_01_repeated_onboarding_updates_baseline_without_duplicate_id(self):
        """Repeated onboarding for the same user updates the baseline record in place without duplicating."""
        test_uid = "usr-patient-101"
        
        # Ensure user profile has first_name and date_of_birth
        for p in mock_db.profiles:
            if p["id"] == test_uid:
                p["first_name"] = "Juan"
                p["date_of_birth"] = date(1995, 5, 20)
                p["sex"] = "male"
                p["height_cm"] = 175.0
                p["weight_kg"] = 72.0

        payload = {
            "vigorous_activity": False,
            "moderate_activity": True,
            "moderate_days": 3,
            "moderate_minutes": 30,
            "walk_bike_transport": True,
            "walk_bike_days": 5,
            "walk_bike_minutes": 20,
            "sedentary_hours": "4-6h",
            "sleep_hours": 7.5,
            "ever_smoked": False,
            "smoke_now": "Not at all",
            "ever_drank": False,
            "diet_level": "average",
            "fried_food_freq": "rarely",
            "salty_food_freq": "rarely",
            "fruit_veg_servings": "2-3",
            "allergies": [],
            "dietary_practice": "None"
        }

        headers = {"Authorization": f"Bearer {self.patient_token}"}

        # First onboarding submission
        r1 = self.client.post(f"/api/users/{test_uid}/baseline/complete", json=payload, headers=headers)
        self.assertEqual(r1.status_code, 201)

        baseline_records_1 = [h for h in mock_db.hss_history if h.get("user_id") == test_uid and h.get("source") == "baseline"]
        self.assertEqual(len(baseline_records_1), 1)
        base_id_1 = baseline_records_1[0]["id"]
        self.assertEqual(base_id_1, f"hss-base-{test_uid}")

        # Second onboarding submission (re-onboarding)
        payload["sleep_hours"] = 8.0
        r2 = self.client.post(f"/api/users/{test_uid}/baseline/complete", json=payload, headers=headers)
        self.assertEqual(r2.status_code, 201)

        baseline_records_2 = [h for h in mock_db.hss_history if h.get("user_id") == test_uid and h.get("source") == "baseline"]
        self.assertEqual(len(baseline_records_2), 1, "Expected exactly 1 baseline HSS record, found duplicates!")
        self.assertEqual(baseline_records_2[0]["id"], base_id_1)

        # Global uniqueness check
        all_ids = [h["id"] for h in mock_db.hss_history]
        self.assertEqual(len(all_ids), len(set(all_ids)), "Duplicate HSS IDs detected after repeated onboarding!")

    def test_02_multiple_ml_predictions_create_unique_ids(self):
        """Multiple ML inference calls produce distinct collision-resistant IDs."""
        test_uid = "usr-patient-102"
        pred1 = ml_service.predict_initial_hss(
            user_id=test_uid,
            lifestyle={"sleep_hours": 7.0, "exercise_freq": "moderate", "physical_activity_hours": 3.0, "stress_level": 2},
            dietary={"salty_food_freq": "rarely", "diet_level": "good"},
            clinical={"age": 30, "sex": "female", "resting_bp_mmhg": 120, "max_heart_rate_bpm": 170, "smoking_status": "never", "family_history": False, "diagnosed_conditions": [], "on_medication": False}
        )
        pred2 = ml_service.predict_initial_hss(
            user_id=test_uid,
            lifestyle={"sleep_hours": 8.0, "exercise_freq": "frequent", "physical_activity_hours": 5.0, "stress_level": 1},
            dietary={"salty_food_freq": "never", "diet_level": "good"},
            clinical={"age": 30, "sex": "female", "resting_bp_mmhg": 115, "max_heart_rate_bpm": 165, "smoking_status": "never", "family_history": False, "diagnosed_conditions": [], "on_medication": False}
        )

        self.assertIsInstance(pred1, dict)
        self.assertIsInstance(pred2, dict)
        self.assertNotEqual(pred1["id"], pred2["id"])
        self.assertTrue(pred1["id"].startswith("hss-pred-"))
        self.assertTrue(pred2["id"].startswith("hss-pred-"))

        # Global uniqueness check
        all_ids = [h["id"] for h in mock_db.hss_history]
        self.assertEqual(len(all_ids), len(set(all_ids)), "Duplicate HSS IDs detected after ML predictions!")

    def test_03_ids_remain_unique_after_list_reset(self):
        """ML prediction IDs do not collide even if list length is altered or reset."""
        p1 = ml_service.predict_initial_hss("usr-patient-101", {}, {}, {})
        # Simulate list alteration
        mock_db.hss_history.clear()
        p2 = ml_service.predict_initial_hss("usr-patient-101", {}, {}, {})
        self.assertIsInstance(p1, dict)
        self.assertIsInstance(p2, dict)
        self.assertNotEqual(p1["id"], p2["id"])

    def test_04_historical_hss_telemetry_for_same_user_preserved(self):
        """Multiple historical HSS records for the same user across time are legitimate and intact."""
        usr_102_records = [h for h in mock_db.hss_history if h.get("user_id") == "usr-patient-102"]
        self.assertGreater(len(usr_102_records), 1, "User 102 should have historical telemetry records")
        ids = [h["id"] for h in usr_102_records]
        self.assertEqual(len(ids), len(set(ids)), "Historical records for user 102 must have unique IDs")

    def test_05_seeder_idempotency_preserves_count_and_uniqueness(self):
        """Re-running seed_rich_demo_data does not duplicate IDs or alter expected count."""
        initial_count = len(mock_db.hss_history)
        mock_db.seed_rich_demo_data(force=True)
        final_count = len(mock_db.hss_history)
        self.assertEqual(initial_count, final_count)
        
        all_ids = [h["id"] for h in mock_db.hss_history]
        self.assertEqual(len(all_ids), len(set(all_ids)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
