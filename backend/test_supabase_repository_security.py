# backend/test_supabase_repository_security.py
"""
Supabase Repository Security & Authorization Boundary Tests.
Verifies JWT authentication, account status enforcement, role-based access control (RBAC),
ownership isolation, and sensitive credential leakage prevention.
"""
import unittest
from fastapi.testclient import TestClient
from app.main import app
import app.mock_db as mock_db
from app.utils.security import create_access_token

client = TestClient(app)

class TestSupabaseRepositorySecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create tokens for test roles using authentic profile IDs
        cls.patient_a_token = create_access_token({"user_id": "usr-patient-101", "role": "patient"})
        cls.patient_b_token = create_access_token({"user_id": "usr-patient-102", "role": "patient"})
        cls.expert_token = create_access_token({"user_id": "usr-expert-201", "role": "medical_expert"})
        cls.admin_token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})

    def test_missing_token_unauthorized(self):
        res = client.get("/api/users/usr-patient-101/profile")
        self.assertIn(res.status_code, [401, 403])

    def test_invalid_token_unauthorized(self):
        res = client.get("/api/users/usr-patient-101/profile", headers={"Authorization": "Bearer invalid.jwt.token"})
        self.assertEqual(res.status_code, 401)

    def test_disabled_account_forbidden(self):
        p = next((p for p in mock_db.profiles if p["id"] == "usr-patient-101"), None)
        self.assertIsNotNone(p)
        orig_status = p.get("account_status", "active")
        try:
            p["account_status"] = "disabled"
            res = client.get("/api/users/usr-patient-101/profile", headers={"Authorization": f"Bearer {self.patient_a_token}"})
            self.assertEqual(res.status_code, 403)
        finally:
            p["account_status"] = orig_status

    def test_profile_response_no_credential_leakage(self):
        res = client.get("/api/users/usr-patient-101/profile", headers={"Authorization": f"Bearer {self.patient_a_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        profile = data.get("profile", {})
        self.assertNotIn("password", profile)
        self.assertNotIn("password_hash", profile)
        self.assertNotIn("token", profile)
        self.assertNotIn("secret", profile)
        self.assertNotIn("service_role_key", profile)

    def test_patient_cannot_access_other_patient_profile(self):
        res = client.get("/api/users/usr-patient-102/profile", headers={"Authorization": f"Bearer {self.patient_a_token}"})
        self.assertEqual(res.status_code, 403)

    def test_patient_cannot_access_admin_portal(self):
        res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {self.patient_a_token}"})
        self.assertEqual(res.status_code, 403)

    def test_patient_cannot_access_case_review(self):
        res = client.get("/api/admin/cases", headers={"Authorization": f"Bearer {self.patient_a_token}"})
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_admin_dashboard(self):
        res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)

    def test_expert_can_access_case_review(self):
        res = client.get("/api/expert/cases", headers={"Authorization": f"Bearer {self.expert_token}"})
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
