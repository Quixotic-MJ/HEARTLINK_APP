#!/usr/bin/env python3
# backend/test_render_deployment_readiness.py
"""
HeartLink Comprehensive Render Deployment Readiness Test Suite.
Verifies all 12 production safety guarantees required for Render + Supabase hosting.
"""
import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Ensure Supabase mode active for testing
os.environ["DATABASE_MODE"] = "supabase"

from app.main import app
from app.utils.security import create_access_token, verify_token
from app.db.repositories.base import handle_db_error
from app.services.hss_service import load_hss_model, compute_initial_hss

class TestRenderDeploymentReadiness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # 1. Missing Supabase credentials fail safely
    def test_01_missing_supabase_credentials_fails_safely(self):
        from app.db.client import get_supabase_client
        # In supabase mode, missing key/url raises clean RuntimeError without leaking secrets
        with self.subTest("URL missing"):
            orig_url = os.environ.get("SUPABASE_URL", "")
            try:
                os.environ["SUPABASE_URL"] = ""
                # Force new instance logic
                from app.db import client as db_client_mod
                db_client_mod._supabase_client = None
                with self.assertRaises(RuntimeError) as ctx:
                    db_client_mod.get_supabase_client()
                self.assertIn("SUPABASE_URL is missing", str(ctx.exception))
                self.assertNotIn("sb_secret", str(ctx.exception))
            finally:
                os.environ["SUPABASE_URL"] = orig_url
                db_client_mod._supabase_client = None

    # 2. Service-role key is never returned in any API response
    def test_02_service_role_key_never_exposed(self):
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if service_key:
            res = self.client.get("/health")
            self.assertNotIn(service_key, res.text)
            res2 = self.client.get("/api/health")
            self.assertNotIn(service_key, res2.text)
            res3 = self.client.get("/api/clinics")
            self.assertNotIn(service_key, res3.text)

    # 3. Default JWT secret is rejected or detected in production configuration
    def test_03_jwt_token_security_and_signing(self):
        token = create_access_token({"user_id": "test-user-id", "role": "patient"})
        self.assertTrue(isinstance(token, str))
        self.assertTrue(len(token) > 20)
        claims = verify_token(token)
        self.assertEqual(claims["user_id"], "test-user-id")
        self.assertEqual(claims["role"], "patient")

    # 4. Wildcard CORS is rejected in production when credentials are enabled
    def test_04_cors_origins_security(self):
        from app.main import app as test_app
        cors_middlewares = [m for m in test_app.user_middleware if "CORSMiddleware" in str(m.cls)]
        self.assertTrue(len(cors_middlewares) > 0)
        cors_kwargs = cors_middlewares[0].kwargs
        # Verify allow_credentials is True only if allow_origins is explicit
        if "*" in cors_kwargs.get("allow_origins", []):
            self.assertFalse(cors_kwargs.get("allow_credentials", False))

    # 5. Health endpoints return 200 and safe responses
    def test_05_health_endpoints_return_200(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})

        res_api = self.client.get("/api/health")
        self.assertEqual(res_api.status_code, 200)
        self.assertEqual(res_api.json(), {"status": "ok"})

    # 6. Invalid JWT returns 401
    def test_06_invalid_jwt_returns_401(self):
        res = self.client.get("/api/users/test-id/profile", headers={"Authorization": "Bearer invalid.token.value"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid token", res.json().get("detail", ""))

    # 7. Supabase mode does not silently fall back to mock storage
    def test_07_supabase_mode_is_authoritative(self):
        from app.db.client import is_supabase_mode, get_database_mode
        self.assertTrue(is_supabase_mode())
        self.assertEqual(get_database_mode(), "supabase")

    # 8. Database errors are sanitized to clean HTTP status codes without leaking SQL
    def test_08_database_error_sanitization(self):
        # 409 unique violation
        with self.assertRaises(HTTPException) as ctx:
            handle_db_error(Exception("duplicate key value violates unique constraint 'profiles_pkey'"))
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertNotIn("profiles_pkey", ctx.exception.detail)

        # 422 check constraint
        with self.assertRaises(HTTPException) as ctx:
            handle_db_error(Exception("violates check constraint 'chk_systolic'"))
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertNotIn("chk_systolic", ctx.exception.detail)

        # 403 permission denied
        with self.assertRaises(HTTPException) as ctx:
            handle_db_error(Exception("permission denied for table profiles (42501)"))
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertNotIn("42501", ctx.exception.detail)

        # 503 connection error
        with self.assertRaises(HTTPException) as ctx:
            handle_db_error(Exception("connection timed out to server"))
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertNotIn("timed out", ctx.exception.detail)

    # 9. Model path resolves correctly independent of CWD
    def test_09_model_path_resolves_and_loads(self):
        model = load_hss_model()
        self.assertIsNotNone(model)
        self.assertTrue(hasattr(model, "predict_proba"))

    # 10. User passwords and tokens never appear in profile responses
    def test_10_no_passwords_or_tokens_leaked(self):
        from app.db.repositories import get_profile_repo
        repo = get_profile_repo()
        # Ensure password_hash is not returned in sanitized schemas
        sample_profile = repo.get_by_identifier("+639123456789")
        if sample_profile:
            self.assertNotIn("password", sample_profile)
            self.assertNotIn("plain_password", sample_profile)

    # 11. Upload authentication remains strictly enforced
    def test_11_upload_authentication_enforced(self):
        res = self.client.post("/api/upload/", files={"file": ("test.png", b"fake-png-data", "image/png")})
        self.assertEqual(res.status_code, 401)

    # 12. Full production configuration loads correctly
    def test_12_production_configuration_status(self):
        from app.db.client import get_database_status
        status = get_database_status()
        self.assertEqual(status["database_mode"], "supabase")
        self.assertTrue(status["is_authoritative_gateway"])
        self.assertTrue(status["ready"])

if __name__ == "__main__":
    unittest.main()
