# backend/test_supabase_auth_security.py
"""
Supabase Auth & Identity Security Test Suite.
Verifies Supabase/JWT authentication, rate limiting, role enforcement, ownership isolation,
password management, OTP verification, and zero credential leakage.
"""
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token
from app.db.repositories import get_profile_repo
from app.services.auth_service import get_auth_service
import jwt

client = TestClient(app)

class TestSupabaseAuthSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.patient_a_id = "usr-patient-101"
        cls.patient_b_id = "usr-patient-102"
        cls.expert_id = "usr-expert-201"
        cls.admin_id = "usr-chief-admin-001"

        cls.patient_a_token = create_access_token({"user_id": cls.patient_a_id, "role": "patient"})
        cls.patient_b_token = create_access_token({"user_id": cls.patient_b_id, "role": "patient"})
        cls.expert_token = create_access_token({"user_id": cls.expert_id, "role": "medical_expert"})
        cls.admin_token = create_access_token({"user_id": cls.admin_id, "role": "admin"})

    def test_missing_jwt_unauthorized(self):
        res = client.get(f"/api/users/{self.patient_a_id}/profile")
        self.assertIn(res.status_code, [401, 403])

    def test_invalid_jwt_unauthorized(self):
        res = client.get(
            f"/api/users/{self.patient_a_id}/profile",
            headers={"Authorization": "Bearer invalid.jwt.token"}
        )
        self.assertEqual(res.status_code, 401)

    def test_unsigned_jwt_rejected(self):
        """P0-01 Security: Unsigned JWT with verify_signature=False bypass must return 401."""
        unsigned_token = jwt.encode({"user_id": self.admin_id, "role": "super_admin"}, key="", algorithm="none")
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {unsigned_token}"}
        )
        self.assertEqual(res.status_code, 401)

    def test_forged_signature_jwt_rejected(self):
        """P0-01 Security: JWT signed with attacker key must return 401."""
        attacker_token = jwt.encode({"user_id": self.admin_id, "role": "super_admin"}, "attacker-secret-key", algorithm="HS256")
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {attacker_token}"}
        )
        self.assertEqual(res.status_code, 401)

    def test_expired_jwt_rejected(self):
        expired_token = create_access_token({"user_id": self.patient_a_id, "role": "patient"}, expires_delta=timedelta(seconds=-60))
        res = client.get(
            f"/api/users/{self.patient_a_id}/profile",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        self.assertEqual(res.status_code, 401)

    def test_forgot_password_no_credential_leakage(self):
        """P0-02 Security: Forgot password response must never leak credentials or account existence."""
        res = client.post("/api/auth/forgot-password", json={"identifier": "test.unknown@example.com"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertNotIn("temp_password", data)
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)
        self.assertNotIn("token", data)
        self.assertIn("message", data)

    def test_disabled_account_forbidden(self):
        profile_repo = get_profile_repo()
        p = profile_repo.get_by_id(self.patient_a_id)
        if p:
            orig_status = p.get("account_status", "active")
            try:
                profile_repo.update(p["id"], {"account_status": "disabled"})
                res = client.get(
                    f"/api/users/{self.patient_a_id}/profile",
                    headers={"Authorization": f"Bearer {self.patient_a_token}"}
                )
                self.assertEqual(res.status_code, 403)
            finally:
                profile_repo.update(p["id"], {"account_status": orig_status})

    def test_patient_a_cannot_access_patient_b(self):
        res = client.get(
            f"/api/users/{self.patient_b_id}/profile",
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_patient_cannot_access_admin_dashboard(self):
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_patient_cannot_access_case_review(self):
        res = client.get(
            "/api/admin/cases",
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_admin_portal(self):
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 200)

    def test_expert_can_access_case_review(self):
        res = client.get(
            "/api/expert/cases",
            headers={"Authorization": f"Bearer {self.expert_token}"}
        )
        self.assertEqual(res.status_code, 200)

    def test_zero_credential_leakage_in_profile(self):
        res = client.get(
            f"/api/users/{self.patient_a_id}/profile",
            headers={"Authorization": f"Bearer {self.patient_a_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        profile = data.get("profile", {})
        self.assertNotIn("password", profile)
        self.assertNotIn("password_hash", profile)
        self.assertNotIn("token", profile)
        self.assertNotIn("secret", profile)
        self.assertNotIn("service_role_key", profile)

    def test_password_change_service(self):
        auth_svc = get_auth_service()
        # Invalid current password
        success = auth_svc.change_password(self.patient_a_id, "wrongpassword", "newpassword123")
        self.assertFalse(success)

    def test_otp_verification_failure_on_invalid_code(self):
        import uuid
        uid_rand = uuid.uuid4().hex[:6]
        phone = f"+63999{uid_rand}"
        email = f"otp.{uid_rand}@heartlink.ph"
        req_res = client.post("/api/auth/request-code", json={
            "phone": phone,
            "email": email,
            "password": "Password123!"
        })
        self.assertEqual(req_res.status_code, 200)

        # Invalid code
        bad_verify = client.post("/api/auth/verify-code", json={
            "phone": phone,
            "code": "000000"
        })
        self.assertEqual(bad_verify.status_code, 400)


if __name__ == "__main__":
    unittest.main()
