# backend/test_calibration_ux_pass.py
import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.utils.security import get_current_admin_user
import app.mock_db as mock_db

def mock_admin():
    return {"user_id": "usr-chief-admin-001", "role": "admin", "name": "Chief Admin"}

class TestCalibrationUXPass(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        self.client = TestClient(app)
        
        # Save original collections
        self.original_evaluations = list(mock_db.expert_evaluations)
        self.original_activity = list(mock_db.admin_activity)

    def tearDown(self):
        # Restore mock DB state
        mock_db.expert_evaluations.clear()
        mock_db.expert_evaluations.extend(self.original_evaluations)
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend(self.original_activity)
        mock_db.save_logs()

    def test_notes_validation(self):
        # 1. Reject empty notes
        payload = {
            "expert_hss_score": 80,
            "notes": "",
            "adjustment_reasons": ["model_consistent"],
            "reviewer_confidence": "medium"
        }
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Risk interpretation notes are required", res.json()["detail"])

        # 2. Reject whitespace-only notes
        payload["notes"] = "        "
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 400)

        # 3. Reject notes < 10 characters
        payload["notes"] = "Too short"
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("must contain at least 10 non-whitespace characters", res.json()["detail"])

        # 4. Accept valid notes (>= 10 characters)
        payload["notes"] = "Valid clinical notes detailing blood pressure."
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)

    def test_adjustment_reasons_validation(self):
        # 1. Invalid reason code is rejected
        payload = {
            "expert_hss_score": 75,
            "notes": "Valid risk justification notes long enough.",
            "adjustment_reasons": ["invalid_reason_code"],
            "reviewer_confidence": "medium"
        }
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 400)

        # 2. Valid multiple adjustment reasons save successfully
        payload["adjustment_reasons"] = ["blood_pressure_pattern", "symptoms"]
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        saved = res.json()["evaluation"]
        self.assertEqual(saved["adjustment_reasons"], ["blood_pressure_pattern", "symptoms"])

        # 3. model_consistent + another reason is rejected
        payload["adjustment_reasons"] = ["model_consistent", "symptoms"]
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot select both", res.json()["detail"])

        # 4. model_consistent alone is accepted
        payload["adjustment_reasons"] = ["model_consistent"]
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)

    def test_reviewer_confidence_validation(self):
        # 1. Invalid confidence level rejected
        payload = {
            "expert_hss_score": 80,
            "notes": "Valid clinical notes detailing blood pressure.",
            "adjustment_reasons": ["model_consistent"],
            "reviewer_confidence": "extremely_confident"
        }
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 400)

        # 2. Valid confidence saved correctly
        for conf in ["low", "medium", "high"]:
            payload["reviewer_confidence"] = conf
            res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()["evaluation"]["reviewer_confidence"], conf)

    def test_recommendation_structured_feedback(self):
        payload = {
            "expert_hss_score": 80,
            "notes": "Valid clinical notes detailing blood pressure.",
            "adjustment_reasons": ["model_consistent"],
            "reviewer_confidence": "medium",
            "exercise_feedback": {
                "status": "needs_review",
                "notes": "Intensity is too high for this BP level."
            },
            "recipe_feedback": {
                "status": "appropriate",
                "notes": "Sodium levels look fine."
            }
        }
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        saved = res.json()["evaluation"]
        self.assertEqual(saved["exercise_feedback"]["status"], "needs_review")
        self.assertEqual(saved["recipe_feedback"]["status"], "appropriate")

    def test_backward_compatibility_old_evaluations(self):
        # Add an old evaluation missing the new fields directly to mock DB
        old_eval = {
            "id": "CAL-9999",
            "user_id": "usr-patient-101",
            "case_id": "CASE-1723",
            "expert_hss_score": 80,
            "expert_hss_tier": "Stable",
            "notes": "Old notes.",
            "reviewer_id": "usr-chief-admin-001",
            "reviewer_name": "Expert",
            "ml_predicted_hss": 89,
            "ml_predicted_tier": "Stable",
            "absolute_error": 9,
            "tier_agreement": True,
            "status": "Logged"
        }
        mock_db.expert_evaluations.append(old_eval)

        # Fetch detail via /evaluations/{eval_id} and assert safe defaults
        res = self.client.get("/api/admin/evaluations/CAL-9999")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["adjustment_reasons"], [])
        self.assertIsNone(data["reviewer_confidence"])
        self.assertEqual(data["exercise_feedback"], {"status": None, "notes": ""})
        self.assertEqual(data["recipe_feedback"], {"status": None, "notes": ""})

    def test_admin_activity_logging(self):
        payload = {
            "expert_hss_score": 80,
            "notes": "Valid clinical notes detailing blood pressure.",
            "adjustment_reasons": ["model_consistent"],
            "reviewer_confidence": "medium"
        }
        initial_activity_count = len(mock_db.admin_activity)
        res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        
        # Verify activity was recorded
        self.assertEqual(len(mock_db.admin_activity), initial_activity_count + 1)
        latest_act = mock_db.admin_activity[-1]
        self.assertEqual(latest_act["target_type"], "case")

if __name__ == "__main__":
    unittest.main()
