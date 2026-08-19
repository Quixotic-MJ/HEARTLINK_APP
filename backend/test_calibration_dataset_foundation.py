# backend/test_calibration_dataset_foundation.py
import os
import sys
import unittest
import numpy as np
from datetime import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.utils.security import get_current_admin_user
import app.mock_db as mock_db
from app.api.admin_api.case_review_api import is_evaluation_eligible
from offline_training_utility import train_candidate_model

def mock_admin():
    return {"user_id": "usr-expert-201", "role": "medical_expert", "name": "Expert Reviewer"}

class TestCalibrationDatasetFoundation(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_current_admin_user] = mock_admin
        self.client = TestClient(app)
        
        # Backup DB
        self.original_evaluations = list(mock_db.expert_evaluations)
        self.original_calibrations = list(mock_db.calibrations)
        self.original_datasets = list(mock_db.datasets)
        self.original_activity = list(mock_db.admin_activity)
        self.original_models = list(mock_db.candidate_models)

    def tearDown(self):
        # Restore DB
        mock_db.expert_evaluations.clear()
        mock_db.expert_evaluations.extend(self.original_evaluations)
        mock_db.calibrations.clear()
        mock_db.calibrations.extend(self.original_calibrations)
        mock_db.datasets.clear()
        mock_db.datasets.extend(self.original_datasets)
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend(self.original_activity)
        mock_db.candidate_models.clear()
        mock_db.candidate_models.extend(self.original_models)
        mock_db.save_logs()
        mock_db.save_logs()
        
        # Cleanup candidates
        for f in os.listdir("."):
            if f.startswith("heartlink_model_candidate_") and f.endswith(".pkl"):
                try:
                    os.remove(f)
                except OSError:
                    pass

    def test_snapshot_validation_empty_features(self):
        # Trigger evaluation payload with invalid non-numeric onboarding to force failed transform
        payload = {
            "expert_hss_score": 80,
            "notes": "Valid notes detailing high blood pressure patterns.",
            "adjustment_reasons": ["model_consistent"],
            "reviewer_confidence": "medium"
        }
        # Set invalid non-numeric sleep hours to trigger ValueError in transform
        original_onboarding = [dict(ob) for ob in mock_db.baseline_onboarding]
        for ob in mock_db.baseline_onboarding:
            if ob["user_id"] == "usr-patient-101":
                ob["sleep_hours"] = "invalid_sleep_hours"
        
        try:
            res = self.client.post("/api/admin/cases/usr-patient-101/evaluate", json=payload)
            self.assertEqual(res.status_code, 400)
            self.assertIn("Feature transformation failed", res.json()["detail"])
        finally:
            mock_db.baseline_onboarding.clear()
            mock_db.baseline_onboarding.extend(original_onboarding)

    def test_dataset_eligibility(self):
        # Archived evaluation is ineligible
        archived_eval = {
            "id": "CAL-991",
            "user_id": "usr-patient-101",
            "case_id": "CASE-1001",
            "expert_hss_score": 80,
            "expert_hss_tier": "Stable",
            "ml_predicted_hss": 82,
            "ml_predicted_tier": "Stable",
            "absolute_error": 2,
            "tier_agreement": True,
            "notes": "Notes notes notes.",
            "reviewer_id": "usr-expert-201",
            "created_at": datetime.utcnow(),
            "input_snapshot": {"model_features": {"RIDAGEYR": 45}},
            "model_metadata": {"model_hash": "abc"},
            "status": "Archived"
        }
        is_ok, reason = is_evaluation_eligible(archived_eval)
        self.assertFalse(is_ok)
        self.assertEqual(reason, "Evaluation is archived.")

        # Incomplete evaluation (missing features snapshot)
        incomplete_eval = dict(archived_eval)
        incomplete_eval["status"] = "Logged"
        incomplete_eval["input_snapshot"] = {}
        is_ok, reason = is_evaluation_eligible(incomplete_eval)
        self.assertFalse(is_ok)
        self.assertEqual(reason, "input_snapshot.model_features is empty or missing.")

        # Valid evaluation is eligible
        valid_eval = dict(archived_eval)
        valid_eval["status"] = "Logged"
        is_ok, reason = is_evaluation_eligible(valid_eval)
        self.assertTrue(is_ok)

    def test_dataset_versioning_and_reproducibility(self):
        # Seed two valid evaluations
        mock_db.expert_evaluations.clear()
        base_eval = {
            "id": "CAL-001",
            "user_id": "usr-patient-101",
            "case_id": "CASE-1111",
            "expert_hss_score": 75,
            "expert_hss_tier": "Moderate",
            "ml_predicted_hss": 85,
            "ml_predicted_tier": "Stable",
            "absolute_error": 10,
            "tier_agreement": False,
            "notes": "Valid clinical notes text.",
            "reviewer_id": "usr-expert-201",
            "created_at": datetime.utcnow(),
            "input_snapshot": {"model_features": {"RIDAGEYR": 50, "RIAGENDR": 1.0}},
            "model_metadata": {"model_hash": "hash_v1", "feature_pipeline_version": "v1.0"},
            "status": "Logged"
        }
        mock_db.expert_evaluations.append(base_eval)
        
        # Generate dataset
        res = self.client.post("/api/admin/datasets/generate", json={"allow_mixed_models": True})
        self.assertEqual(res.status_code, 200)
        ds1 = res.json()["dataset"]
        self.assertTrue(ds1["dataset_id"].startswith("dataset-"))
        self.assertEqual(ds1["record_count"], 1)

        # Generate a second dataset from same evaluations - should have incremented version
        res2 = self.client.post("/api/admin/datasets/generate", json={"allow_mixed_models": True})
        self.assertEqual(res2.status_code, 200)
        ds2 = res2.json()["dataset"]
        self.assertNotEqual(ds1["dataset_id"], ds2["dataset_id"])
        self.assertEqual(ds1["rows"], ds2["rows"]) # Reproducible content

    def test_mixed_model_hashes_detection(self):
        mock_db.expert_evaluations.clear()
        eval1 = {
            "id": "CAL-001", "user_id": "u1", "case_id": "C1",
            "expert_hss_score": 80, "expert_hss_tier": "Stable",
            "ml_predicted_hss": 80, "ml_predicted_tier": "Stable",
            "absolute_error": 0, "tier_agreement": True, "notes": "Notes notes notes.",
            "reviewer_id": "r1", "created_at": datetime.utcnow(),
            "input_snapshot": {"model_features": {"RIDAGEYR": 45}},
            "model_metadata": {"model_hash": "hash_a"}, "status": "Logged"
        }
        eval2 = dict(eval1)
        eval2["id"] = "CAL-002"
        eval2["user_id"] = "u2"
        eval2["model_metadata"] = {"model_hash": "hash_b"}

        mock_db.expert_evaluations.extend([eval1, eval2])

        # Reject mixed hashes by default
        res = self.client.post("/api/admin/datasets/generate", json={"allow_mixed_models": False})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Multiple model versions detected", res.json()["detail"])

        # Pass single-model filter
        res2 = self.client.post("/api/admin/datasets/generate", json={"model_hash": "hash_a"})
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["dataset"]["record_count"], 1)

    def test_calibration_metrics(self):
        mock_db.expert_evaluations.clear()
        eval1 = {
            "id": "CAL-001", "user_id": "u1", "case_id": "C1",
            "expert_hss_score": 80, "expert_hss_tier": "Stable",
            "ml_predicted_hss": 90, "ml_predicted_tier": "Stable",
            "absolute_error": 10, "tier_agreement": True, "notes": "Notes notes notes.",
            "reviewer_id": "r1", "created_at": datetime.utcnow(),
            "input_snapshot": {"model_features": {"RIDAGEYR": 45}},
            "model_metadata": {"model_hash": "hash_a"}, "status": "Logged"
        }
        eval2 = {
            "id": "CAL-002", "user_id": "u2", "case_id": "C2",
            "expert_hss_score": 60, "expert_hss_tier": "Moderate",
            "ml_predicted_hss": 80, "ml_predicted_tier": "Stable",
            "absolute_error": 20, "tier_agreement": False, "notes": "Notes notes notes.",
            "reviewer_id": "r1", "created_at": datetime.utcnow(),
            "input_snapshot": {"model_features": {"RIDAGEYR": 45}},
            "model_metadata": {"model_hash": "hash_a"}, "status": "Logged"
        }
        mock_db.expert_evaluations.extend([eval1, eval2])

        res = self.client.get("/api/admin/calibration/metrics")
        self.assertEqual(res.status_code, 200)
        metrics = res.json()
        self.assertEqual(metrics["total_eligible_evaluations"], 2)
        self.assertEqual(metrics["mae"], 15.0)
        self.assertEqual(metrics["tier_agreement_rate"], 50.0)

    def test_privacy_pii_exclusion(self):
        mock_db.expert_evaluations.clear()
        base_eval = {
            "id": "CAL-001",
            "user_id": "usr-patient-101",
            "case_id": "CASE-1111",
            "expert_hss_score": 75,
            "expert_hss_tier": "Moderate",
            "ml_predicted_hss": 85,
            "ml_predicted_tier": "Stable",
            "absolute_error": 10,
            "tier_agreement": False,
            "notes": "Valid clinical notes text.",
            "reviewer_id": "usr-expert-201",
            "created_at": datetime.utcnow(),
            "input_snapshot": {"model_features": {"RIDAGEYR": 50, "RIAGENDR": 1.0}},
            "model_metadata": {"model_hash": "hash_v1", "feature_pipeline_version": "v1.0"},
            "status": "Logged"
        }
        mock_db.expert_evaluations.append(base_eval)

        res = self.client.post("/api/admin/datasets/generate")
        self.assertEqual(res.status_code, 200)
        rows = res.json()["dataset"]["rows"]
        
        # Verify no direct patient PII exists in dataset rows
        for row in rows:
            self.assertNotIn("name", row)
            self.assertNotIn("first_name", row)
            self.assertNotIn("last_name", row)
            self.assertNotIn("phone", row)
            self.assertNotIn("email", row)
            self.assertNotIn("address", row)

    def test_offline_training_script_execution(self):
        # Mock dataset payload containing required features
        dummy_dataset = {
            "dataset_id": "test-dataset-001",
            "rows": [
                {
                    "evaluation_id": "CAL-01",
                    "case_id": "CASE-01",
                    "model_hash": "hash_a",
                    "expert_hss_score": 85.0,
                    "expert_hss_tier": "Stable",
                    "model_features": {
                        'RIDAGEYR': 45, 'RIAGENDR': 1.0, 'PAQ605': 1.0, 'PAQ610': 3.0, 'PAD615': 30.0,
                        'PAQ620': 1.0, 'PAQ625': 2.0, 'PAD630': 45.0, 'PAQ635': 2.0, 'PAQ640': None,
                        'PAD645': None, 'PAQ650': 1.0, 'PAQ655': 3.0, 'PAD660': 30.0, 'PAQ665': 1.0,
                        'PAQ670': 2.0, 'PAD675': 45.0, 'PAD680': 180.0, 'SLD012': 7.0, 'SMQ020': 2.0,
                        'SMQ040': 3.0, 'ALQ111': 2.0, 'ALQ121': 0.0, 'ALQ130': None, 'ALQ142': 0.0,
                        'DR1TKCAL': 1750.0, 'DR1TPROT': 72.0, 'DR1TCARB': 224.0, 'DR1TSUGR': 90.0,
                        'DR1TFIBE': 15.0, 'DR1TTFAT': 70.0, 'DR1TSFAT': 23.0, 'DR1TMFAT': 25.0,
                        'DR1TPFAT': 17.0, 'DR1TCHOL': 270.0, 'DR1TSODI': 3000.0, 'DR1TPOTA': 2400.0
                    }
                },
                {
                    "evaluation_id": "CAL-02",
                    "case_id": "CASE-02",
                    "model_hash": "hash_a",
                    "expert_hss_score": 55.0,
                    "expert_hss_tier": "Elevated Risk",
                    "model_features": {
                        'RIDAGEYR': 60, 'RIAGENDR': 2.0, 'PAQ605': 2.0, 'PAQ610': None, 'PAD615': None,
                        'PAQ620': 2.0, 'PAQ625': None, 'PAD630': None, 'PAQ635': 2.0, 'PAQ640': None,
                        'PAD645': None, 'PAQ650': 2.0, 'PAQ655': None, 'PAD660': None, 'PAQ665': 2.0,
                        'PAQ670': None, 'PAD675': None, 'PAD680': 300.0, 'SLD012': 6.0, 'SMQ020': 1.0,
                        'SMQ040': 1.0, 'ALQ111': 1.0, 'ALQ121': 3.0, 'ALQ130': 2.0, 'ALQ142': 1.0,
                        'DR1TKCAL': 2250.0, 'DR1TPROT': 90.0, 'DR1TCARB': 280.0, 'DR1TSUGR': 110.0,
                        'DR1TFIBE': 18.0, 'DR1TTFAT': 90.0, 'DR1TSFAT': 30.0, 'DR1TMFAT': 32.0,
                        'DR1TPFAT': 20.0, 'DR1TCHOL': 340.0, 'DR1TSODI': 3800.0, 'DR1TPOTA': 2800.0
                    }
                }
            ]
        }
        
        result = train_candidate_model(dummy_dataset, save_dir=".")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["dataset_size"], 2)
        
        # Verify candidate file was saved separately from current model
        candidate_filename = result["artifact_filename"]
        self.assertTrue(os.path.exists(candidate_filename))
        self.assertNotEqual(candidate_filename, "heartlink_model.pkl")

if __name__ == "__main__":
    unittest.main()
