# backend/test_rbac_security.py
import unittest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import jwt

from app.main import app
import app.mock_db as mock_db
from app.utils.security import SECRET_KEY, ALGORITHM, create_access_token, token_blacklist

class TestRbacSecurity(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides.clear()
        self.client = TestClient(app)
        # Store original profiles & active statuses
        self.original_profiles = [dict(p) for p in mock_db.profiles]
        
    def tearDown(self):
        app.dependency_overrides.clear()
        # Restore mock_db state
        mock_db.profiles.clear()
        mock_db.profiles.extend(self.original_profiles)
        token_blacklist.clear()

    # 1. Admin login works
    def test_admin_login_works(self):
        payload = {
            "identifier": "admin@heartlink.ph",
            "password": "password123"
        }
        res = self.client.post("/api/auth/web-login", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["requires_2fa"])

    # 2. Medical expert login works
    def test_medical_expert_login_works(self):
        payload = {
            "identifier": "clinical.expert@heartlink.com",
            "password": "password123"
        }
        res = self.client.post("/api/auth/web-login", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["requires_2fa"])

    # 3. Super admin login works
    def test_super_admin_login_works(self):
        payload = {
            "identifier": "super.admin@heartlink.ph",
            "password": "TempPass2026!"
        }
        res = self.client.post("/api/auth/web-login", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["requires_2fa"])

    # 4. Patient cannot use web-admin login
    def test_patient_cannot_use_web_login(self):
        payload = {
            "identifier": "user101@example.com",
            "password": "password123"
        }
        res = self.client.post("/api/auth/web-login", json=payload)
        self.assertEqual(res.status_code, 403)

    # Helper to build headers
    def _headers(self, user_id, role):
        token = create_access_token({"user_id": user_id, "role": role})
        return {"Authorization": f"Bearer {token}"}

    # 5. Patient cannot access admin dependency
    def test_patient_cannot_access_admin_dependency(self):
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 6. Admin cannot access super_admin dependency
    def test_admin_cannot_access_super_admin_dependency(self):
        headers = self._headers("usr-chief-admin-001", "admin")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 7. Medical expert cannot access super_admin dependency
    def test_medical_expert_cannot_access_super_admin_dependency(self):
        headers = self._headers("usr-expert-201", "medical_expert")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 8. Active super_admin can access protected endpoint
    def test_active_super_admin_can_access_protected_endpoint(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 200)

    # 9. Disabled admin token is rejected
    def test_disabled_admin_token_is_rejected(self):
        # Disable admin
        for p in mock_db.profiles:
            if p["id"] == "usr-chief-admin-001":
                p["account_status"] = "disabled"
        headers = self._headers("usr-chief-admin-001", "admin")
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 10. Disabled medical expert token is rejected
    def test_disabled_medical_expert_token_is_rejected(self):
        # Disable medical expert
        for p in mock_db.profiles:
            if p["id"] == "usr-expert-201":
                p["account_status"] = "disabled"
        headers = self._headers("usr-expert-201", "medical_expert")
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 11. Disabled super_admin token is rejected
    def test_disabled_super_admin_token_is_rejected(self):
        # Disable super admin
        for p in mock_db.profiles:
            if p["id"] == "usr-super-admin-001":
                p["account_status"] = "disabled"
        headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 12. Token role / database role mismatch is rejected
    def test_token_role_database_role_mismatch_is_rejected(self):
        headers = self._headers("usr-chief-admin-001", "super_admin") # Database is "admin"
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 13. Missing user is rejected
    def test_missing_user_is_rejected(self):
        headers = self._headers("nonexistent-user-id", "admin")
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 401)

    # 14. Invalid token is rejected
    def test_invalid_token_is_rejected(self):
        headers = {"Authorization": "Bearer invalidtoken12345"}
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 401)

    # 15. Logout still invalidates token
    def test_logout_invalidates_token(self):
        token = create_access_token({"user_id": "usr-chief-admin-001", "role": "admin"})
        headers = {"Authorization": f"Bearer {token}"}
        
        # Access works
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)
        
        # Logout
        logout_res = self.client.post("/api/auth/logout", headers=headers)
        self.assertEqual(logout_res.status_code, 200)
        
        # Access fails
        res2 = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res2.status_code, 401)

    # 16. Existing admin endpoints remain functional (dashboard)
    def test_existing_admin_endpoints_remain_functional(self):
        headers = self._headers("usr-chief-admin-001", "admin")
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)

    # 17. Existing medical expert endpoints remain functional (dashboard)
    def test_existing_medical_expert_endpoints_remain_functional(self):
        headers = self._headers("usr-expert-201", "medical_expert")
        res = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
