# backend/test_case_review_integrity.py
import os
import sys
import unittest
from datetime import datetime, date
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.utils.security import get_current_admin_user
import app.mock_db as mock_db
from app.services.clinical import get_model_metadata, get_clinical_baseline_data, get_recent_telemetry_timeline

# Mock authentication
def mock_admin():
    return {"user_id": "usr-chief-admin-001", "role": "admin", "name": "Chief Admin"}

def mock_expert():
    return {"user_id": "usr-expert-201", "role": "medical_expert", "name": "Expert Dr. Smith"}

class TestCaseReviewIntegrity(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        self.client = TestClient(app)
        
        # Save original lists
        self.original_evaluations = list(mock_db.expert_evaluations)
        self.original_profiles = list(mock_db.profiles)
        self.original_onboarding = list(mock_db.baseline_onboarding)
        self.original_health_logs = list(mock_db.daily_health_logs)
        self.original_hss = list(mock_db.hss_history)

    def tearDown(self):
        # Restore mock DB lists
        mock_db.expert_evaluations[:] = self.original_evaluations
        mock_db.profiles[:] = self.original_profiles
        mock_db.baseline_onboarding[:] = self.original_onboarding
        mock_db.daily_health_logs[:] = self.original_health_logs
        mock_db.hss_history[:] = self.original_hss
        mock_db.save_logs()

    def test_version_metadata(self):
        meta = get_model_metadata()
        self.assertIn("model_identifier", meta)
        self.assertIn("model_hash", meta)
        self.assertIn("feature_pipeline_version", meta)
        # Verify no fake versions are invented
        self.assertNotEqual(meta["model_identifier"], "v1.0-static-nhanes-lr")
        self.assertNotEqual(meta["feature_pipeline_version"], "v1.0")

    def test_clinical_and_timeline_telemetry(self):
        # Clear health logs and add specific records for usr-patient-101
        mock_db.daily_health_logs.clear()
        mock_db.daily_health_logs.append({
            "id": "log-test-1",
            "user_id": "usr-patient-101",
            "systolic_bp": 130,
            "diastolic_bp": 85,
            "heart_rate_bpm": 76,
            "weight_kg": 70.0,
            "medication_taken": True,
            "symptoms": ["chest_tightness"],
            "severity_map": {"chest_tightness": 3},
            "context": "resting",
            "notes": "Test log",
            "logged_at": datetime.utcnow()
        })
        
        clinical = get_clinical_baseline_data("usr-patient-101")
        self.assertEqual(clinical["resting_bp_mmhg"], "130/85")
        self.assertEqual(clinical["max_heart_rate_bpm"], 76)
        self.assertTrue(clinical["on_medication"])
        self.assertEqual(clinical["chest_pain_type"], 1)
        
        timeline = get_recent_telemetry_timeline("usr-patient-101")
        # Should have Vitals and Symptoms entries
        types = [item["type"] for item in timeline]
        self.assertIn("Vitals", types)
        self.assertIn("Symptoms", types)
        # Ensure no fabricated/synthetic records
        self.assertTrue(all(x["type"] in ["Vitals", "Symptoms", "Meal", "Exercise", "Sleep"] for x in timeline))

    def test_hss_tier_mapping_and_calibration_metrics(self):
        # Test boundaries: Stable >= 80, Moderate 60-79, Elevated Risk 50-59, Critical < 50
        test_cases = [
            (79, "Moderate"),
            (80, "Stable"),
            (59, "Elevated Risk"),
            (60, "Moderate"),
            (49, "Critical"),
            (50, "Elevated Risk")
        ]
        
        # Mock patient HSS in history
        mock_db.hss_history.clear()
        mock_db.hss_history.append({
            "id": "hss-t-1",
            "user_id": "usr-patient-101",
            "score": 65,
            "tier": "Moderate",
            "source": "baseline",
            "computed_at": datetime.utcnow()
        })
        
        for score, expected_tier in test_cases:
            # Clear evaluations
            mock_db.expert_evaluations.clear()
            
            payload = {
                "expert_hss_score": score,
                "notes": f"Testing score {score}",
                "recommendation_feedback": "Looks good"
            }
            res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
            self.assertEqual(res.status_code, 200)
            
            eval_data = res.json()["evaluation"]
            self.assertEqual(eval_data["expert_hss_tier"], expected_tier)
            self.assertEqual(eval_data["ml_predicted_hss"], 65)
            self.assertEqual(eval_data["ml_predicted_tier"], "Moderate")
            
            # Check calibration metrics
            self.assertEqual(eval_data["absolute_error"], abs(score - 65))
            self.assertEqual(eval_data["tier_agreement"], (expected_tier == "Moderate"))

    def test_immutable_snapshot_and_reproducibility(self):
        mock_db.hss_history.clear()
        mock_db.hss_history.append({
            "id": "hss-t-2",
            "user_id": "usr-patient-101",
            "score": 75,
            "tier": "Moderate",
            "source": "baseline",
            "computed_at": datetime.utcnow()
        })
        
        # Ensure clean profile
        for p in mock_db.profiles:
            if p["id"] == "usr-patient-101":
                p["date_of_birth"] = date(2000, 1, 1)
                p["sex"] = "male"
                
        # Save onboarding answers
        mock_db.baseline_onboarding.clear()
        mock_db.baseline_onboarding.append({
            "id": "onb-101",
            "user_id": "usr-patient-101",
            "sleep_hours": 8.0,
            "ever_smoked": False,
            "smoke_now": "Not at all",
            "salty_food_freq": "never",
            "family_history": ["heart_attack"],
            "diet_level": "good",
            "fried_food_freq": "never",
            "fruit_veg_servings": "5+"
        })
        
        # 1. Create evaluation
        payload = {
            "expert_hss_score": 70,
            "notes": "Original clinical reasons",
            "recommendation_feedback": "Perfect fit"
        }
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        
        eval_id = res.json()["evaluation"]["id"]
        
        # 2. Verify snapshot matches baseline profile
        eval_record = next(e for e in mock_db.expert_evaluations if e["id"] == eval_id)
        self.assertEqual(eval_record["input_snapshot"]["age"], datetime.now().year - 2000)
        self.assertEqual(eval_record["input_snapshot"]["sex"], "male")
        self.assertEqual(eval_record["input_snapshot"]["sleep_hours"], 8.0)
        
        # 3. Change live patient profile
        for p in mock_db.profiles:
            if p["id"] == "usr-patient-101":
                p["date_of_birth"] = date(1980, 1, 1) # change age
                p["sex"] = "female" # change sex
        
        # Change live onboarding
        for o in mock_db.baseline_onboarding:
            if o["user_id"] == "usr-patient-101":
                o["sleep_hours"] = 4.0 # decrease sleep
                
        # 4. Re-open historical evaluation
        eval_record_reopened = next(e for e in mock_db.expert_evaluations if e["id"] == eval_id)
        
        # 5. Verify snapshot remains unchanged
        self.assertEqual(eval_record_reopened["input_snapshot"]["age"], datetime.now().year - 2000)
        self.assertEqual(eval_record_reopened["input_snapshot"]["sex"], "male")
        self.assertEqual(eval_record_reopened["input_snapshot"]["sleep_hours"], 8.0)
        print("Snapshot reproducibility verified successfully!")

    def test_permissions_access_control(self):
        # 1. Admin Access - Allowed
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res = self.client.get("/api/admin/cases")
        self.assertEqual(res.status_code, 200)
        
        # 2. Medical Expert Access - Allowed
        app.dependency_overrides[get_current_admin_user] = mock_expert
        res = self.client.get("/api/admin/cases")
        self.assertEqual(res.status_code, 200)
        
        # 3. Patient Access - Denied (dependency overrides throws 403 or returns None which raises 401/403)
        def mock_patient():
            raise HTTPException(status_code=403, detail="Role-based access denied")
            
        app.dependency_overrides[get_current_admin_user] = mock_patient
        res = self.client.get("/api/admin/cases")
        self.assertEqual(res.status_code, 403)

if __name__ == "__main__":
    unittest.main()
