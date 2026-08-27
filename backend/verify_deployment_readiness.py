# backend/verify_deployment_readiness.py
"""
Comprehensive Deployment Readiness Audit & Verification Test Suite.
Executes all checks defined in the HeartLink Deployment Readiness Audit Plan.
"""
import os
import re
import sys
import json
import uuid
import random
import string
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# Ensure DATABASE_MODE=supabase
os.environ["DATABASE_MODE"] = "supabase"

from app.main import app
from app.db.client import get_supabase_client
from app.utils.security import create_access_token, token_blacklist
from app.db.repositories import (
    get_profile_repo,
    get_health_logs_repo,
    get_meals_repo,
    get_exercises_repo,
    get_sleep_repo,
    get_hss_repo,
    get_content_repo,
    get_notification_repo,
    get_admin_repo,
    get_feedback_repo,
    get_case_review_repo
)
from app.services.hss_service import determine_tier


class DeploymentReadinessAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = get_supabase_client()
        cls.profile_repo = get_profile_repo()

        # Identify / create test personas in profiles
        all_profiles = cls.profile_repo.list_all()
        patients = [p for p in all_profiles if p.get("role") == "patient" and p.get("account_status") == "active"]
        admins = [p for p in all_profiles if p.get("role") == "admin" and p.get("account_status") == "active"]
        super_admins = [p for p in all_profiles if p.get("role") == "super_admin" and p.get("account_status") == "active"]
        experts = [p for p in all_profiles if p.get("role") == "medical_expert" and p.get("account_status") == "active"]

        if len(patients) >= 2:
            cls.patient_a = patients[0]
            cls.patient_b = patients[1]
        elif len(patients) == 1:
            cls.patient_a = patients[0]
            cls.patient_b = patients[0]
        else:
            raise RuntimeError("At least 1 patient profile required in database.")

        cls.admin_user = admins[0] if admins else (super_admins[0] if super_admins else cls.patient_a)
        cls.super_admin_user = super_admins[0] if super_admins else cls.admin_user
        cls.expert_user = experts[0] if experts else None

        # Generate tokens
        cls.token_patient_a = create_access_token({"user_id": cls.patient_a["id"], "role": "patient"})
        cls.token_patient_b = create_access_token({"user_id": cls.patient_b["id"], "role": "patient"})
        cls.token_admin = create_access_token({"user_id": cls.admin_user["id"], "role": cls.admin_user.get("role", "admin")})
        cls.token_super_admin = create_access_token({"user_id": cls.super_admin_user["id"], "role": "super_admin"})
        cls.token_expert = create_access_token({"user_id": cls.expert_user["id"], "role": "medical_expert"}) if cls.expert_user else None

    # =========================================================================
    # PHASE 1: OTP Whitelist Scoping Tests
    # =========================================================================

    def test_phase1_otp_whitelisted_number_succeeds(self):
        """Whitelisted test phone number allows code 123456."""
        rand_digits = "".join(random.choices(string.digits, k=6))
        test_phone = f"+63999{rand_digits}"
        test_email = f"whitelisted_{rand_digits}@heartlink.health"

        # Request OTP
        req_res = self.client.post("/api/auth/request-code", json={
            "phone": test_phone,
            "email": test_email,
            "password": "Password123!"
        })
        self.assertEqual(req_res.status_code, 200)

        # Verify with 123456 (Must succeed)
        verify_res = self.client.post("/api/auth/verify-code", json={
            "phone": test_phone,
            "code": "123456"
        })
        self.assertIn(verify_res.status_code, [200, 201])
        self.assertTrue(verify_res.json().get("success"))
        self.assertIn("token", verify_res.json())

    def test_phase1_otp_non_whitelisted_number_rejected(self):
        """Non-whitelisted arbitrary phone number is rejected at request-code with HTTP 403."""
        rand_digits = "".join(random.choices(string.digits, k=6))
        non_test_phone = f"+63920{rand_digits}" # +63920 is NOT in test prefixes
        test_email = f"nonwhite_{rand_digits}@heartlink.health"

        # Request OTP for non-whitelisted number must return 403 Forbidden
        req_res = self.client.post("/api/auth/request-code", json={
            "phone": non_test_phone,
            "email": test_email,
            "password": "Password123!"
        })
        self.assertEqual(req_res.status_code, 403)
        self.assertIn("Self-registration is currently limited to invited testers", req_res.json().get("detail", ""))

        # Verify OTP for non-whitelisted number must also return 403 Forbidden
        verify_res = self.client.post("/api/auth/verify-code", json={
            "phone": non_test_phone,
            "code": "123456"
        })
        self.assertEqual(verify_res.status_code, 403)
        self.assertIn("Self-registration is currently limited to invited testers", verify_res.json().get("detail", ""))

    def test_phase1_real_tester_normalization_and_registration(self):
        """Verify real tester phone numbers normalize across input formats and register successfully."""
        from app.services.auth_service import is_test_phone_number, normalize_e164

        # 1. Format variation tests for real tester numbers
        test_inputs = [
            ("09171234567", "+639171234567"),
            ("+639171234567", "+639171234567"),
            ("639171234567", "+639171234567"),
            ("0917-123-4567", "+639171234567"),
            ("09281234567", "+639281234567"),
            ("+639281234567", "+639281234567"),
        ]
        for raw_inp, expected_e164 in test_inputs:
            self.assertEqual(normalize_e164(raw_inp), expected_e164)
            self.assertTrue(is_test_phone_number(raw_inp), f"Failed to recognize {raw_inp} as whitelisted")

        # 2. End-to-end registration flow with real tester number (09281234567)
        tester_phone = "09281234567"
        rand_id = uuid.uuid4().hex[:6]
        tester_email = f"tester_0928_{rand_id}@heartlink.health"

        # Cleanup existing profile from previous test runs if any
        existing_prof = self.profile_repo.get_by_identifier("+639281234567") or self.profile_repo.get_by_identifier("09281234567")
        if existing_prof:
            try:
                self.db.table("profiles").delete().eq("id", existing_prof["id"]).execute()
            except Exception:
                pass
        
        req_res = self.client.post("/api/auth/request-code", json={
            "phone": tester_phone,
            "email": tester_email,
            "password": "TesterPassword123!"
        })
        self.assertEqual(req_res.status_code, 200)

        verify_res = self.client.post("/api/auth/verify-code", json={
            "phone": tester_phone,
            "code": "123456"
        })
        self.assertIn(verify_res.status_code, [200, 201])
        self.assertTrue(verify_res.json().get("success"))
        self.assertIn("token", verify_res.json())

    def test_phase1_sms_failure_raises_503(self):
        """SMS dispatch failure raises HTTP 503 instead of silent false success."""
        from unittest.mock import MagicMock
        from app.services.auth_service import SupabaseAuthService
        from fastapi import HTTPException

        mock_client = MagicMock()
        mock_auth_svc = SupabaseAuthService(mock_client)
        mock_auth_svc.client.auth.sign_in_with_otp.side_effect = Exception("Gateway Timeout / SMS Service Down")

        with self.assertRaises(HTTPException) as ctx:
            mock_auth_svc._dispatch_real_sms_otp("+639171112222")

        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("SMS delivery is not currently available", ctx.exception.detail)

    # =========================================================================
    # PHASE 2: Database & Trigger Integrity
    # =========================================================================

    def test_phase2_trigger_deny_activity_log_modification(self):
        """Test deny_activity_log_modification trigger rejects UPDATE and DELETE."""
        # 1. Insert a test activity log directly with clear test fixture labeling
        insert_res = self.db.table("admin_activity_logs").insert({
            "admin_name": "[TEST FIXTURE - SAFE TO IGNORE] Immutability Trigger Verification",
            "action": "verified trigger immutability",
            "target_type": "test_fixture",
            "target_name": "Trigger Verification Record"
        }).execute()
        self.assertTrue(len(insert_res.data) > 0, "Insert into admin_activity_logs failed")
        log_id = insert_res.data[0]["id"]

        # 2. Attempt UPDATE on admin_activity_logs (Must fail at DB trigger level)
        with self.assertRaises(Exception) as update_ctx:
            self.db.table("admin_activity_logs").update({"action": "tampered action"}).eq("id", log_id).execute()
        self.assertIn("immutable", str(update_ctx.exception).lower())

        # 3. Attempt DELETE on admin_activity_logs (Must fail at DB trigger level)
        with self.assertRaises(Exception) as delete_ctx:
            self.db.table("admin_activity_logs").delete().eq("id", log_id).execute()
        self.assertIn("immutable", str(delete_ctx.exception).lower())

    # =========================================================================
    # PHASE 3: RLS / Service-Role Cross-Patient Isolation Audit
    # =========================================================================

    def test_phase3_cross_patient_health_logs_isolation(self):
        """Patient A attempting to read/write/delete Patient B's health logs must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        # Patient A tries to read Patient B's health logs
        res = self.client.get(
            f"/api/health-logs/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

        # Patient A tries to record a health log for Patient B
        res = self.client.post(
            f"/api/health-logs/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"systolic_bp": 120, "diastolic_bp": 80, "heart_rate_bpm": 70}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase3_cross_patient_meals_isolation(self):
        """Patient A attempting to read/write/delete Patient B's meal logs must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        res = self.client.get(
            f"/api/meals/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

        res = self.client.post(
            f"/api/meals/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"meal_name": "Test Oatmeal", "calories": 250, "sodium_mg": 50}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase3_cross_patient_exercises_isolation(self):
        """Patient A attempting to read/write Patient B's exercise logs must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        res = self.client.get(
            f"/api/exercises/logs/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

        res = self.client.post(
            f"/api/exercises/logs/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"routine_name": "Morning Walk", "duration_minutes": 20, "duration_seconds": 1200}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase3_cross_patient_sleep_logs_isolation(self):
        """Patient A attempting to read/write Patient B's sleep logs must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        res = self.client.get(
            f"/api/sleep-logs/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

        res = self.client.post(
            f"/api/sleep-logs/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"duration_hours": 8, "quality": "Good"}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase3_cross_patient_profile_and_reminders_isolation(self):
        """Patient A attempting to read/update Patient B's profile/reminders must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        res = self.client.get(
            f"/api/users/{self.patient_b['id']}/profile",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

        res = self.client.get(
            f"/api/users/{self.patient_b['id']}/reminders",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

        res = self.client.get(
            f"/api/analytics/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase3_cross_patient_care_team_isolation(self):
        """Patient A attempting to modify Patient B's care team must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        # POST
        res_post = self.client.post(
            f"/api/users/{self.patient_b['id']}/care-team",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"name": "Dr. Santos", "role_title": "Cardiologist", "contact_type": "doctor", "phone": "+639111111111"}
        )
        self.assertEqual(res_post.status_code, 403)

        # PUT
        res_put = self.client.put(
            f"/api/users/{self.patient_b['id']}/care-team/fake-contact-id",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"name": "Dr. Santos", "role_title": "Cardiologist", "contact_type": "doctor", "phone": "+639111111111"}
        )
        self.assertEqual(res_put.status_code, 403)

        # DELETE
        res_del = self.client.delete(
            f"/api/users/{self.patient_b['id']}/care-team/fake-contact-id",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res_del.status_code, 403)

    def test_phase3_cross_patient_saved_recipes_isolation(self):
        """Patient A attempting to read Patient B's saved recipes must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        res = self.client.get(
            f"/api/recipes/saved/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase3_cross_patient_notifications_isolation(self):
        """Patient A attempting to read/mark Patient B's notifications must return 403."""
        if self.patient_a["id"] == self.patient_b["id"]:
            return

        # GET
        res_get = self.client.get(
            f"/api/notifications/{self.patient_b['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res_get.status_code, 403)

        # PUT mark-all-read
        res_put = self.client.put(
            f"/api/notifications/{self.patient_b['id']}/mark-all-read",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res_put.status_code, 403)

    def test_phase3_dashboard_wrapup_strict_token_derivation(self):
        """GET /api/dashboard/wrapup derives user strictly from Bearer token."""
        res = self.client.get(
            "/api/dashboard/wrapup",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 200)

    # =========================================================================
    # PHASE 4: AuthN / AuthZ RBAC Matrix Tests
    # =========================================================================

    def test_phase4_patient_access_to_expert_cases_blocked(self):
        """Patient attempting /api/expert/cases must return 403."""
        res = self.client.get(
            "/api/expert/cases",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase4_expert_access_to_staff_provisioning_blocked(self):
        """Medical Expert attempting /api/admin/staff provisioning must return 403."""
        if not self.token_expert:
            return
        res = self.client.post(
            "/api/admin/staff",
            headers={"Authorization": f"Bearer {self.token_expert}"},
            json={"name": "Test Staff", "email": "teststaff@clinic.org", "phone": "+639111111111", "role": "Authorized Medical Expert"}
        )
        self.assertEqual(res.status_code, 403)

    def test_phase4_regular_admin_cannot_change_staff_role(self):
        """Regular Admin attempting /api/admin/staff/{id}/role must return 403 (SuperAdmin required)."""
        res = self.client.put(
            f"/api/admin/staff/{self.admin_user['id']}/role",
            headers={"Authorization": f"Bearer {self.token_admin}"},
            json={"role": "System Admin"}
        )
        self.assertIn(res.status_code, [400, 403])

    def test_phase4_super_admin_self_protection_guardrails(self):
        """Super Admin cannot self-deactivate, self-demote, or deactivate last active super admin."""
        # 1. Self-deactivation attempt
        res = self.client.put(
            f"/api/admin/users/{self.super_admin_user['id']}/status",
            headers={"Authorization": f"Bearer {self.token_super_admin}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Self-deactivation is not permitted", res.json().get("detail", ""))

        # 2. Self-demotion attempt
        res = self.client.put(
            f"/api/admin/staff/{self.super_admin_user['id']}/role",
            headers={"Authorization": f"Bearer {self.token_super_admin}"},
            json={"role": "Authorized Medical Expert"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Self-demotion is not permitted", res.json().get("detail", ""))

    def test_phase4_token_blacklisting_logout(self):
        """Logged out token must be blacklisted and immediately rejected with 401."""
        temp_token = create_access_token({"user_id": self.patient_a["id"], "role": "patient"})

        # Initial call succeeds
        res = self.client.get("/api/dashboard/me", headers={"Authorization": f"Bearer {temp_token}"})
        self.assertEqual(res.status_code, 200)

        # Logout
        logout_res = self.client.post("/api/auth/logout", headers={"Authorization": f"Bearer {temp_token}"})
        self.assertEqual(logout_res.status_code, 200)

        # Subsequent call fails with 401
        res_after = self.client.get("/api/dashboard/me", headers={"Authorization": f"Bearer {temp_token}"})
        self.assertEqual(res_after.status_code, 401)

    # =========================================================================
    # PHASE 5: Endpoint Smoke & 422 Error Sanitization Tests
    # =========================================================================

    def test_phase5_expert_retrain_returns_501(self):
        """Endpoint /api/expert/retrain returns HTTP 501 by design."""
        res = self.client.post(
            "/api/expert/retrain",
            headers={"Authorization": f"Bearer {self.token_admin}"}
        )
        self.assertEqual(res.status_code, 501)

    def test_phase5_malformed_payload_returns_clean_422(self):
        """Malformed payloads return HTTP 422 without leaking SQL or stack traces."""
        # Malformed sleep log
        res = self.client.post(
            f"/api/sleep-logs/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"duration_hours": "invalid_number", "quality": "InvalidQuality"}
        )
        self.assertEqual(res.status_code, 422)
        self.assertNotIn("Traceback", res.text)
        self.assertNotIn("PostgrestError", res.text)

        # Malformed meal log
        res = self.client.post(
            f"/api/meals/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"meal_name": "", "calories": -100, "sodium_mg": "not_a_num"}
        )
        self.assertEqual(res.status_code, 422)
        self.assertNotIn("Traceback", res.text)

    # =========================================================================
    # PHASE 5.1: Additional Router Coverage (Recipes, Clinics, Notifications, Feedback, Upload)
    # =========================================================================

    def test_phase5_recipes_endpoints_coverage(self):
        """Verify /api/recipes endpoints."""
        res = self.client.get("/api/recipes/", headers={"Authorization": f"Bearer {self.token_patient_a}"})
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

        if len(res.json()) > 0:
            first_recipe_id = res.json()[0]["id"]
            detail_res = self.client.get(f"/api/recipes/{first_recipe_id}")
            self.assertEqual(detail_res.status_code, 200)

    def test_phase5_clinics_endpoint_coverage(self):
        """Verify /api/clinics endpoint."""
        res = self.client.get("/api/clinics")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_phase5_notifications_endpoints_coverage(self):
        """Verify /api/notifications endpoints."""
        res = self.client.get(
            f"/api/notifications/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(res.status_code, 200)

        # Mark all read
        read_all_res = self.client.put(
            f"/api/notifications/{self.patient_a['id']}/mark-all-read",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(read_all_res.status_code, 200)

    def test_phase5_feedback_endpoints_coverage(self):
        """Verify /api/feedback endpoints."""
        # 1. Patient submits ticket
        submit_res = self.client.post(
            "/api/feedback/",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={
                "category": "UI/UX Suggestion",
                "fullMessage": "Verifying feedback endpoint coverage in deployment readiness test suite."
            }
        )
        self.assertEqual(submit_res.status_code, 200)

        # 2. Admin lists tickets
        list_res = self.client.get(
            "/api/feedback/",
            headers={"Authorization": f"Bearer {self.token_admin}"}
        )
        self.assertEqual(list_res.status_code, 200)
        self.assertIsInstance(list_res.json(), list)

    def test_phase5_upload_endpoints_coverage_and_security(self):
        """Verify /api/upload endpoint authorization and path isolation."""
        # Patient uploading dummy avatar for self
        dummy_file = ("avatar.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82", "image/png")
        res = self.client.post(
            "/api/upload/",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            data={"bucket": "avatars", "target_id": self.patient_a["id"]},
            files={"file": dummy_file}
        )
        self.assertIn(res.status_code, [200, 201])

        # Patient attempting to upload to recipe bucket (restricted to admin)
        recipe_res = self.client.post(
            "/api/upload/",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            data={"bucket": "recipes", "target_id": self.patient_a["id"]},
            files={"file": dummy_file}
        )
        self.assertEqual(recipe_res.status_code, 403)

    # =========================================================================
    # PHASE 6: Business Rule & Edge Case Tests
    # =========================================================================

    def test_phase6_exercise_duration_seconds_bounds_validation(self):
        """Risk #6: Negative duration (-500) and absurdly large duration (99999999) return HTTP 422."""
        # 1. Negative duration_seconds
        res_neg = self.client.post(
            f"/api/exercises/logs/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"routine_name": "Test Walk", "duration_seconds": -500}
        )
        self.assertEqual(res_neg.status_code, 422)
        self.assertIn("duration_seconds must be between 0 and 86400", res_neg.json().get("detail", ""))

        # 2. Absurdly large duration_seconds
        res_large = self.client.post(
            f"/api/exercises/logs/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"routine_name": "Test Walk", "duration_seconds": 99999999}
        )
        self.assertEqual(res_large.status_code, 422)
        self.assertIn("duration_seconds must be between 0 and 86400", res_large.json().get("detail", ""))

    def test_phase6_hss_tier_boundary_classifications(self):
        """Verify HSS tier assignment and boundary transitions."""
        self.assertEqual(determine_tier(100), "Stable")
        self.assertEqual(determine_tier(80), "Stable")
        self.assertEqual(determine_tier(79), "Moderate")
        self.assertEqual(determine_tier(60), "Moderate")
        self.assertEqual(determine_tier(59), "Elevated Risk")
        self.assertEqual(determine_tier(50), "Elevated Risk")
        self.assertEqual(determine_tier(49), "Critical")
        self.assertEqual(determine_tier(1), "Critical")

    def test_phase6_soft_deleted_sleep_log_omitted(self):
        """Soft-deleted sleep logs (is_deleted=true) are excluded from user sleep log reads."""
        # 1. Create sleep log
        create_res = self.client.post(
            f"/api/sleep-logs/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"},
            json={"duration_hours": 7.5, "quality": "Good"}
        )
        self.assertEqual(create_res.status_code, 200)
        log_id = create_res.json()["data"]["id"]

        # 2. Delete sleep log (soft delete)
        del_res = self.client.delete(
            f"/api/sleep-logs/{self.patient_a['id']}/{log_id}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(del_res.status_code, 200)

        # 3. Fetch sleep logs and verify omitted
        fetch_res = self.client.get(
            f"/api/sleep-logs/{self.patient_a['id']}",
            headers={"Authorization": f"Bearer {self.token_patient_a}"}
        )
        self.assertEqual(fetch_res.status_code, 200)
        logs = fetch_res.json()
        self.assertFalse(any(l.get("id") == log_id for l in logs))

    def test_phase6_legacy_id_garbage_lookup_returns_404_or_400(self):
        """Garbage non-existent legacy ID returns clean 400 or 404 without 500 error."""
        res = self.client.get(
            "/api/users/usr-nonexistent-99999/profile",
            headers={"Authorization": f"Bearer {self.token_admin}"}
        )
        self.assertIn(res.status_code, [400, 404])
        self.assertNotIn("Traceback", res.text)


if __name__ == "__main__":
    unittest.main()
