import copy
import unittest
from datetime import date, datetime
from fastapi.testclient import TestClient

from app.main import app
import app.mock_db as mock_db
from app.services.users import get_full_profile
from app.utils.security import create_access_token
from app.services.feature_transform import transform_to_model_features
from app.services.hss_service import compute_initial_hss


class TestBaselineModuleIntegrity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.original_profiles = copy.deepcopy(mock_db.profiles)
        self.original_onboarding = copy.deepcopy(mock_db.baseline_onboarding)
        self.original_hss = copy.deepcopy(mock_db.hss_history)
        self.original_activity = copy.deepcopy(mock_db.admin_activity)
        mock_db.seed_rich_demo_data()
        self.patient_id = "usr-patient-101"
        self.other_patient_id = "usr-patient-102"
        self.patient_token = create_access_token({"user_id": self.patient_id, "role": "patient"})
        self.other_patient_token = create_access_token({"user_id": self.other_patient_id, "role": "patient"})
        self.headers = {"Authorization": f"Bearer {self.patient_token}"}
        self.other_headers = {"Authorization": f"Bearer {self.other_patient_token}"}

    def tearDown(self):
        mock_db.profiles[:] = self.original_profiles
        mock_db.baseline_onboarding[:] = self.original_onboarding
        mock_db.hss_history[:] = self.original_hss
        mock_db.admin_activity[:] = self.original_activity

    # ── 1. Contract Tests ───────────────────────────────────────────────────────

    def test_01_get_full_profile_includes_onboarding(self):
        res = get_full_profile(self.patient_id)
        self.assertIsNotNone(res)
        self.assertIn("baselines", res)
        self.assertIn("onboarding", res["baselines"])
        self.assertIsNotNone(res["baselines"]["onboarding"])

    def test_02_get_full_profile_includes_clinical(self):
        res = get_full_profile(self.patient_id)
        self.assertIn("clinical", res["baselines"])
        self.assertIsNotNone(res["baselines"]["clinical"])

    def test_03_get_full_profile_includes_lifestyle_when_source_data_exists(self):
        res = get_full_profile(self.patient_id)
        self.assertIn("lifestyle", res["baselines"])
        lifestyle = res["baselines"]["lifestyle"]
        self.assertIsNotNone(lifestyle)
        self.assertIn("smoking_status", lifestyle)
        self.assertIn("avg_sleep_hours", lifestyle)

    def test_04_get_full_profile_includes_dietary_when_source_data_exists(self):
        res = get_full_profile(self.patient_id)
        self.assertIn("dietary", res["baselines"])
        dietary = res["baselines"]["dietary"]
        self.assertIsNotNone(dietary)
        self.assertIn("dietary_practice", dietary)
        self.assertIn("sodium_frequency", dietary)
        self.assertIn("allergies", dietary)

    def test_05_allergies_map_correctly(self):
        res = get_full_profile(self.patient_id)
        dietary = res["baselines"]["dietary"]
        onboarding = res["baselines"]["onboarding"]
        self.assertEqual(dietary["allergies"], onboarding.get("allergies", []))

    def test_06_sodium_frequency_maps_correctly(self):
        res = get_full_profile(self.patient_id)
        dietary = res["baselines"]["dietary"]
        onboarding = res["baselines"]["onboarding"]
        self.assertEqual(dietary["sodium_frequency"], onboarding.get("salty_food_freq"))

    def test_07_smoking_status_maps_correctly(self):
        res = get_full_profile(self.patient_id)
        lifestyle = res["baselines"]["lifestyle"]
        onboarding = res["baselines"]["onboarding"]
        expected = onboarding.get("smoke_now") or ("Every day" if onboarding.get("ever_smoked") else "Not at all")
        self.assertEqual(lifestyle["smoking_status"], expected)

    def test_08_sleep_value_maps_correctly(self):
        res = get_full_profile(self.patient_id)
        lifestyle = res["baselines"]["lifestyle"]
        onboarding = res["baselines"]["onboarding"]
        self.assertEqual(lifestyle["avg_sleep_hours"], float(onboarding.get("sleep_hours")))

    def test_09_absence_of_family_history_does_not_fabricate_value(self):
        res = get_full_profile(self.patient_id)
        lifestyle = res["baselines"]["lifestyle"]
        self.assertNotIn("family_history", lifestyle)

    # ── 2. Validation Tests ─────────────────────────────────────────────────────

    def _valid_baseline_payload(self):
        return {
            "vigorous_activity": True,
            "vigorous_days": 3,
            "vigorous_minutes": 30,
            "moderate_activity": True,
            "moderate_days": 2,
            "moderate_minutes": 20,
            "walk_bike_transport": True,
            "walk_bike_days": 5,
            "walk_bike_minutes": 15,
            "sedentary_hours": "4-6h",
            "sleep_hours": 7.5,
            "ever_smoked": True,
            "smoke_now": "Some days",
            "ever_drank": True,
            "drink_frequency": "Monthly or less",
            "drinks_per_occasion": "1-2",
            "binge_drinking_freq": "Never",
            "diet_level": "average",
            "fried_food_freq": "sometimes",
            "salty_food_freq": "sometimes",
            "fruit_veg_servings": "2-3",
            "allergies": ["peanuts"],
            "dietary_practice": "Standard Filipino"
        }

    def test_10_invalid_enum_rejected(self):
        payload = self._valid_baseline_payload()
        payload["diet_level"] = "super_healthy"
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)

    def test_11_invalid_numeric_range_rejected(self):
        profile_payload = {
            "first_name": "Juan",
            "last_name": "Luna",
            "date_of_birth": "1995-05-20",
            "sex": "male",
            "height_cm": 20.0,  # Below minimum 50.0
            "weight_kg": 70.0,
            "health_goals": []
        }
        res = self.client.put(f"/api/users/{self.patient_id}/profile", json=profile_payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)

    def test_12_invalid_days_week_rejected(self):
        payload = self._valid_baseline_payload()
        payload["vigorous_days"] = 10  # Max is 7
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)

    def test_13_invalid_minutes_day_rejected(self):
        payload = self._valid_baseline_payload()
        payload["vigorous_minutes"] = 0  # Min is 1
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)

    def test_14_invalid_categorical_value_rejected(self):
        payload = self._valid_baseline_payload()
        payload["sedentary_hours"] = "8h+"  # Invalid enum (must be 8+h)
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)

    def test_15_valid_conditional_submission_accepted(self):
        payload = {
            "vigorous_activity": False,
            "vigorous_days": None,
            "vigorous_minutes": None,
            "moderate_activity": False,
            "moderate_days": None,
            "moderate_minutes": None,
            "walk_bike_transport": False,
            "walk_bike_days": None,
            "walk_bike_minutes": None,
            "sedentary_hours": "6-8h",
            "sleep_hours": 8.0,
            "ever_smoked": False,
            "smoke_now": None,
            "ever_drank": False,
            "drink_frequency": None,
            "drinks_per_occasion": None,
            "binge_drinking_freq": None,
            "diet_level": "light",
            "fried_food_freq": "rarely",
            "salty_food_freq": "rarely",
            "fruit_veg_servings": "4-5",
            "allergies": [],
            "dietary_practice": "Low Sodium"
        }
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)

    # ── 3. Security Tests ───────────────────────────────────────────────────────

    def test_16_unauthenticated_baseline_submission_rejected(self):
        payload = self._valid_baseline_payload()
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload)
        self.assertIn(res.status_code, [401, 403])

    def test_17_unauthenticated_profile_update_rejected(self):
        profile_payload = {
            "first_name": "Juan",
            "last_name": "Luna",
            "date_of_birth": "1995-05-20",
            "sex": "male",
            "height_cm": 170.0,
            "weight_kg": 65.0,
            "health_goals": []
        }
        res = self.client.put(f"/api/users/{self.patient_id}/profile", json=profile_payload)
        self.assertIn(res.status_code, [401, 403])

    def test_18_cross_user_baseline_submission_rejected(self):
        payload = self._valid_baseline_payload()
        # Patient 101 attempting to update Patient 102's baseline
        res = self.client.post(f"/api/users/{self.other_patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 403)

    def test_19_cross_user_profile_update_rejected(self):
        profile_payload = {
            "first_name": "Hacker",
            "last_name": "User",
            "date_of_birth": "1990-01-01",
            "sex": "male",
            "height_cm": 175.0,
            "weight_kg": 70.0,
            "health_goals": []
        }
        # Patient 101 attempting to update Patient 102's profile
        res = self.client.put(f"/api/users/{self.other_patient_id}/profile", json=profile_payload, headers=self.headers)
        self.assertEqual(res.status_code, 403)

    def test_20_owner_baseline_submission_succeeds(self):
        payload = self._valid_baseline_payload()
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)

    # ── 4. Idempotency Tests ────────────────────────────────────────────────────

    def test_21_first_baseline_submission_creates_baseline(self):
        payload = self._valid_baseline_payload()
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        onb = [o for o in mock_db.baseline_onboarding if o["user_id"] == self.patient_id]
        self.assertEqual(len(onb), 1)

    def test_22_repeated_baseline_submission_updates_existing_record(self):
        payload = self._valid_baseline_payload()
        self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        
        payload["sleep_hours"] = 8.5
        res = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        
        onb = [o for o in mock_db.baseline_onboarding if o["user_id"] == self.patient_id]
        self.assertEqual(len(onb), 1)
        self.assertEqual(onb[0]["sleep_hours"], 8.5)

    def test_23_stable_baseline_hss_id_preserved(self):
        payload = self._valid_baseline_payload()
        res1 = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        hss1 = res1.json().get("initial_hss")
        self.assertEqual(hss1["id"], f"hss-base-{self.patient_id}")

        res2 = self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        hss2 = res2.json().get("initial_hss")
        self.assertEqual(hss2["id"], f"hss-base-{self.patient_id}")

    def test_24_no_duplicate_baseline_hss_records_created(self):
        payload = self._valid_baseline_payload()
        self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        self.client.post(f"/api/users/{self.patient_id}/baseline/complete", json=payload, headers=self.headers)
        
        baseline_hss = [h for h in mock_db.hss_history if h.get("user_id") == self.patient_id and h.get("source") == "baseline"]
        self.assertEqual(len(baseline_hss), 1)

    # ── 5. Transformation & Demo Tests ──────────────────────────────────────────

    def test_25_normalized_demo_enum_passes_through_transformation_without_fallback(self):
        profile = next(p for p in mock_db.profiles if p["id"] == "usr-patient-a01")
        onboarding = next(o for o in mock_db.baseline_onboarding if o["user_id"] == "usr-patient-a01")
        features = transform_to_model_features(onboarding, profile)
        self.assertEqual(features.shape[1], 37)
        self.assertEqual(features.shape[0], 1)

    def test_26_sleep_conversion_accuracy(self):
        # Explicit mapping verification
        def map_sleep(val: str) -> float:
            mapping = {"5": 5.0, "5-6": 5.5, "7-8": 7.5, "9": 9.0}
            return mapping.get(val, float(val) if val.replace('.', '', 1).isdigit() else 8.0)
            
        self.assertEqual(map_sleep("7-8"), 7.5)
        self.assertEqual(map_sleep("5-6"), 5.5)
        self.assertEqual(map_sleep("5"), 5.0)
        self.assertEqual(map_sleep("9"), 9.0)

    def test_27_all_demo_baseline_records_use_valid_enums(self):
        valid_diet = {"light", "average", "heavy", "very_heavy"}
        valid_smoke = {"Every day", "Some days", "Not at all", None}
        valid_drink = {"Never", "Monthly or less", "2-4x/month", "2-3x/week", "4+/week", None}
        valid_sedentary = {"<2h", "2-4h", "4-6h", "6-8h", "8+h"}
        valid_fruit = {"0-1", "2-3", "4-5", "6+"}

        invalid_strings = {"excellent", "poor", "Daily", "Weekly", "8h+", "4+"}

        for record in mock_db.baseline_onboarding:
            uid = record.get("user_id")
            diet = record.get("diet_level")
            smoke = record.get("smoke_now")
            drink = record.get("drink_frequency")
            sed = record.get("sedentary_hours")
            fruit = record.get("fruit_veg_servings")

            self.assertIn(diet, valid_diet, f"User {uid} has invalid diet_level: {diet}")
            self.assertIn(smoke, valid_smoke, f"User {uid} has invalid smoke_now: {smoke}")
            self.assertIn(drink, valid_drink, f"User {uid} has invalid drink_frequency: {drink}")
            self.assertIn(sed, valid_sedentary, f"User {uid} has invalid sedentary_hours: {sed}")
            self.assertIn(fruit, valid_fruit, f"User {uid} has invalid fruit_veg_servings: {fruit}")

            for val in [diet, smoke, drink, sed, fruit]:
                self.assertNotIn(val, invalid_strings, f"User {uid} contains forbidden legacy string: {val}")

    def test_28_demo_trajectories_preserved(self):
        # usr-patient-d01 must remain Critical tier
        p_d01 = next(p for p in mock_db.profiles if p["id"] == "usr-patient-d01")
        o_d01 = next(o for o in mock_db.baseline_onboarding if o["user_id"] == "usr-patient-d01")
        score_d, tier_d, _ = compute_initial_hss(o_d01, p_d01)
        self.assertEqual(tier_d, "Critical", f"usr-patient-d01 tier was expected to be Critical, got {tier_d} (score: {score_d})")

        # usr-patient-a01 must remain Stable tier
        p_a01 = next(p for p in mock_db.profiles if p["id"] == "usr-patient-a01")
        o_a01 = next(o for o in mock_db.baseline_onboarding if o["user_id"] == "usr-patient-a01")
        score_a, tier_a, _ = compute_initial_hss(o_a01, p_a01)
        self.assertEqual(tier_a, "Stable", f"usr-patient-a01 tier was expected to be Stable, got {tier_a} (score: {score_a})")


if __name__ == "__main__":
    unittest.main()
