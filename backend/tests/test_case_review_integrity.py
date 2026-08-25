# backend/test_case_review_integrity.py
import os
import sys
import unittest
from datetime import datetime, date
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.utils.security import get_current_admin_user
import app.mock_db as mock_db
from app.services.clinical import get_model_metadata, get_clinical_baseline_data, get_recent_telemetry_timeline

# Mock authentication fixtures
def mock_admin():
    return {"user_id": "usr-chief-admin-001", "role": "admin", "name": "Chief Admin"}

def mock_super_admin():
    return {"user_id": "usr-super-admin-001", "role": "super_admin", "name": "Super Admin"}

def mock_expert():
    return {"user_id": "usr-expert-201", "role": "medical_expert", "name": "Expert Dr. Smith"}

class TestCaseReviewIntegrity(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_current_admin_user] = mock_expert
        self.client = TestClient(app)
        
        # Save original state
        self.original_evaluations = list(mock_db.expert_evaluations)
        self.original_calibrations = list(mock_db.calibrations)
        self.original_profiles = list(mock_db.profiles)
        self.original_onboarding = list(mock_db.baseline_onboarding)
        self.original_health_logs = list(mock_db.daily_health_logs)
        self.original_hss = list(mock_db.hss_history)

    def tearDown(self):
        # Restore mock DB state
        mock_db.expert_evaluations[:] = self.original_evaluations
        mock_db.calibrations[:] = self.original_calibrations
        mock_db.profiles[:] = self.original_profiles
        mock_db.baseline_onboarding[:] = self.original_onboarding
        mock_db.daily_health_logs[:] = self.original_health_logs
        mock_db.hss_history[:] = self.original_hss
        mock_db.save_logs()
        app.dependency_overrides.clear()

    def test_version_metadata(self):
        meta = get_model_metadata()
        self.assertIn("model_identifier", meta)
        self.assertIn("model_hash", meta)
        self.assertIn("feature_pipeline_version", meta)
        self.assertNotEqual(meta["model_identifier"], "v1.0-static-nhanes-lr")
        self.assertNotEqual(meta["feature_pipeline_version"], "v1.0")

    def test_clinical_and_timeline_telemetry(self):
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
        types = [item["type"] for item in timeline]
        self.assertIn("Vitals", types)
        self.assertIn("Symptoms", types)
        self.assertTrue(all(x["type"] in ["Vitals", "Symptoms", "Meal", "Exercise", "Sleep"] for x in timeline))

    def test_hss_tier_mapping_and_calibration_metrics(self):
        test_cases = [
            (79, "Moderate"),
            (80, "Stable"),
            (59, "Elevated Risk"),
            (60, "Moderate"),
            (49, "Critical"),
            (50, "Elevated Risk")
        ]
        
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
            mock_db.expert_evaluations.clear()
            mock_db.calibrations.clear()
            
            payload = {
                "expert_hss_score": score,
                "notes": f"Testing score {score}",
                "recommendation_feedback": "Looks good"
            }
            res = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=payload)
            self.assertEqual(res.status_code, 200)
            
            eval_data = res.json()["evaluation"]
            self.assertEqual(eval_data["expert_hss_tier"], expected_tier)
            self.assertEqual(eval_data["ml_predicted_hss"], 65)
            self.assertEqual(eval_data["ml_predicted_tier"], "Moderate")
            self.assertEqual(eval_data["absolute_error"], abs(score - 65))
            self.assertEqual(eval_data["tier_agreement"], (expected_tier == "Moderate"))

    def test_math_bounds_rejection(self):
        # 1. Score > 100 rejected with 400
        payload_high = {
            "expert_hss_score": 101,
            "notes": "Testing high boundary score violation",
            "recommendation_feedback": "Check"
        }
        res_high = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=payload_high)
        self.assertEqual(res_high.status_code, 400)

        # 2. Score < 1 rejected with 400
        payload_low = {
            "expert_hss_score": 0,
            "notes": "Testing low boundary score violation",
            "recommendation_feedback": "Check"
        }
        res_low = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=payload_low)
        self.assertEqual(res_low.status_code, 400)

        # 3. Non-integer float rejected with 400
        payload_float = {
            "expert_hss_score": 75.5,
            "notes": "Testing non-integer float score",
            "recommendation_feedback": "Check"
        }
        res_float = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=payload_float)
        self.assertEqual(res_float.status_code, 400)

    def test_role_enforcement_on_evaluation_submission(self):
        valid_payload = {
            "expert_hss_score": 75,
            "notes": "Expert clinical evaluation reasons",
            "recommendation_feedback": "Recommended"
        }

        # 1. Admin attempt - 403 Forbidden
        app.dependency_overrides[get_current_admin_user] = mock_admin
        res_admin = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=valid_payload)
        self.assertEqual(res_admin.status_code, 403)

        # 2. Super Admin attempt - 403 Forbidden
        app.dependency_overrides[get_current_admin_user] = mock_super_admin
        res_super = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=valid_payload)
        self.assertEqual(res_super.status_code, 403)

        # 3. Medical Expert attempt - 200 OK
        app.dependency_overrides[get_current_admin_user] = mock_expert
        res_expert = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=valid_payload)
        self.assertEqual(res_expert.status_code, 200)

    def test_clinical_queue_filtering(self):
        # Setup: patient with normal BP (115/75) and normal HSS (85)
        mock_db.profiles[:] = [
            {
                "id": "usr-patient-normal",
                "role": "patient",
                "onboarding_status": "complete",
                "first_name": "Normal",
                "last_name": "User",
                "date_of_birth": date(1990, 1, 1),
                "sex": "female",
                "health_goals": []
            },
            {
                "id": "usr-patient-highbp",
                "role": "patient",
                "onboarding_status": "complete",
                "first_name": "HighBP",
                "last_name": "User",
                "date_of_birth": date(1985, 1, 1),
                "sex": "male",
                "health_goals": ["bp"]
            }
        ]
        
        mock_db.daily_health_logs.clear()
        # Normal BP log
        mock_db.daily_health_logs.append({
            "id": "log-normal",
            "user_id": "usr-patient-normal",
            "systolic_bp": 115,
            "diastolic_bp": 75,
            "logged_at": datetime.utcnow()
        })
        # High BP log (> 120 / > 80)
        mock_db.daily_health_logs.append({
            "id": "log-high",
            "user_id": "usr-patient-highbp",
            "systolic_bp": 135,
            "diastolic_bp": 88,
            "logged_at": datetime.utcnow()
        })
        
        mock_db.hss_history.clear()
        mock_db.hss_history.append({"id": "hss-norm", "user_id": "usr-patient-normal", "score": 85, "tier": "Stable", "computed_at": datetime.utcnow()})
        mock_db.hss_history.append({"id": "hss-high", "user_id": "usr-patient-highbp", "score": 60, "tier": "Moderate", "computed_at": datetime.utcnow()})

        res = self.client.get("/api/expert/cases")
        self.assertEqual(res.status_code, 200)
        
        case_user_ids = [c["user_id"] for c in res.json()]
        self.assertNotIn("usr-patient-normal", case_user_ids, "Patient with normal BP (115/75) and HSS >= 50 should NOT be in queue")
        self.assertIn("usr-patient-highbp", case_user_ids, "Patient with high BP (135/88) should be in reviewable queue")

    def test_case_state_lock(self):
        # Add an evaluation marked as "Archived"
        mock_db.expert_evaluations.clear()
        mock_db.expert_evaluations.append({
            "id": "CAL-9999",
            "user_id": "usr-patient-101",
            "case_id": "CASE-1001",
            "status": "Archived",
            "expert_hss_score": 80
        })

        payload = {
            "expert_hss_score": 75,
            "notes": "Attempting to overwrite locked case",
            "recommendation_feedback": "None"
        }
        res = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 409, "Locked evaluation should reject updates with 409 Conflict")

    def test_calibrations_collection_sync(self):
        mock_db.expert_evaluations.clear()
        mock_db.calibrations.clear()

        payload = {
            "expert_hss_score": 77,
            "notes": "Testing calibrations array sync",
            "recommendation_feedback": "Synced"
        }
        res = self.client.post("/api/expert/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)

        # Verify calibration record exists in both collections
        self.assertEqual(len(mock_db.expert_evaluations), 1)
        self.assertEqual(len(mock_db.calibrations), 1)
        self.assertEqual(mock_db.calibrations[0]["expert_hss_score"], 77)

if __name__ == "__main__":
    unittest.main()
