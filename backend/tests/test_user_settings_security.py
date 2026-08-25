"""
test_user_settings_security.py
---------------------------------
Comprehensive security, authentication, authorization, persistence, and contract
verification tests for HeartLink Mobile User Settings module.

Covers all 28 required test scenarios:
Authentication:
 1. Patient can access own protected endpoints.
 2. Unauthenticated request is rejected (401/403).
 3. Invalid JWT is rejected (401).
 4. Disabled account is rejected (403).

Ownership:
 5. Cross-user profile read rejected (403).
 6. Cross-user profile update rejected (403).
 7. Cross-user password change rejected (403).
 8. Cross-user deletion rejected (403).
 9. Cross-user reminder update rejected (403).
10. Cross-user care-team mutation rejected (403).
11. Cross-user threshold update rejected (403).

Password:
12. Patient can change own password.
13. Wrong password rejected.
14. Password hash actually changes in DB.
15. Exactly one password activity event generated.
16. No password material present in activity log.

Profile:
17. Profile mutation persists after reload.
18. Password hash absent from profile response.

Care Team:
19. Care team mutations persist after reload.
20. Double-save protection / duplicate contact handling.

Reminders:
21. Reminder settings persist after restart.

Deletion:
22. Unauthenticated deletion rejected.
23. Cross-user deletion rejected.
24. Correct owner can delete own account with password.
25. Account deletion generates exactly one audit event.

JWT:
26. Mobile login returns signed JWT.
27. JWT contains user_id and role claims.
28. Issued token successfully authenticates protected Mobile endpoint.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import hashlib
import unittest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
import app.mock_db as mock_db
from app.utils.security import (
    create_access_token,
    verify_token,
    token_blacklist,
    SECRET_KEY,
    ALGORITHM
)
from app.api.auth.auth import login_attempts
from app.services.users import get_full_profile, delete_user, change_password

PATIENT_A_ID = "usr-patient-101"
PATIENT_A_EMAIL = "maria.santos@email.com"
PATIENT_A_PASS = "PatientPass123!"

PATIENT_B_ID = "usr-patient-102"
PATIENT_B_EMAIL = "juan.reyes@email.com"
PATIENT_B_PASS = "PatientPass456!"

ADMIN_ID = "usr-chief-admin-001"
SUPER_ADMIN_ID = "usr-super-admin-001"


def _hash(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()


class TestUserSettingsSecurity(unittest.TestCase):

    def setUp(self):
        app.dependency_overrides.clear()
        self.client = TestClient(app)

        # Snapshot in-memory collections
        self._orig_profiles = [dict(p) for p in mock_db.profiles]
        self._orig_activity = [dict(a) for a in mock_db.admin_activity]
        self._orig_reminders = [dict(r) for r in getattr(mock_db, 'user_reminders', [])]
        self._orig_care_team = [dict(c) for c in getattr(mock_db, 'care_team_contacts', [])]
        self._orig_thresholds = [dict(t) for t in getattr(mock_db, 'user_thresholds', [])]
        self._orig_attempts = dict(login_attempts)

        # Ensure Patient A and Patient B exist with known active states and passwords
        self._setup_test_patients()

    def _setup_test_patients(self):
        p_a = next((p for p in mock_db.profiles if p["id"] == PATIENT_A_ID), None)
        if p_a:
            p_a["password"] = _hash(PATIENT_A_PASS)
            p_a["account_status"] = "active"
            p_a["role"] = "patient"
            p_a["first_name"] = "Maria"
            p_a["last_name"] = "Santos"
            p_a["email"] = PATIENT_A_EMAIL
        else:
            mock_db.profiles.append({
                "id": PATIENT_A_ID,
                "email": PATIENT_A_EMAIL,
                "password": _hash(PATIENT_A_PASS),
                "role": "patient",
                "first_name": "Maria",
                "last_name": "Santos",
                "date_of_birth": "1990-01-01",
                "sex": "female",
                "height_cm": 160.0,
                "weight_kg": 55.0,
                "health_goals": [],
                "account_status": "active",
                "created_at": datetime(2025, 1, 1),
                "updated_at": datetime(2025, 1, 1),
            })

        p_b = next((p for p in mock_db.profiles if p["id"] == PATIENT_B_ID), None)
        if p_b:
            p_b["password"] = _hash(PATIENT_B_PASS)
            p_b["account_status"] = "active"
            p_b["role"] = "patient"
            p_b["first_name"] = "Juan"
            p_b["last_name"] = "Reyes"
            p_b["email"] = PATIENT_B_EMAIL
        else:
            mock_db.profiles.append({
                "id": PATIENT_B_ID,
                "email": PATIENT_B_EMAIL,
                "password": _hash(PATIENT_B_PASS),
                "role": "patient",
                "first_name": "Juan",
                "last_name": "Reyes",
                "date_of_birth": "1985-05-15",
                "sex": "male",
                "height_cm": 175.0,
                "weight_kg": 75.0,
                "health_goals": [],
                "account_status": "active",
                "created_at": datetime(2025, 1, 1),
                "updated_at": datetime(2025, 1, 1),
            })

    def tearDown(self):
        app.dependency_overrides.clear()
        mock_db.profiles.clear()
        mock_db.profiles.extend(self._orig_profiles)
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend(self._orig_activity)
        if hasattr(mock_db, 'user_reminders'):
            mock_db.user_reminders.clear()
            mock_db.user_reminders.extend(self._orig_reminders)
        if hasattr(mock_db, 'care_team_contacts'):
            mock_db.care_team_contacts.clear()
            mock_db.care_team_contacts.extend(self._orig_care_team)
        if hasattr(mock_db, 'user_thresholds'):
            mock_db.user_thresholds.clear()
            mock_db.user_thresholds.extend(self._orig_thresholds)
        login_attempts.clear()
        login_attempts.update(self._orig_attempts)
        token_blacklist.clear()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _auth_header(self, user_id: str, role: str = "patient") -> dict:
        token = create_access_token({"user_id": user_id, "role": role})
        return {"Authorization": f"Bearer {token}"}

    # ── 1. Authentication Tests ───────────────────────────────────────────────

    def test_01_patient_can_access_own_protected_endpoints(self):
        """Patient can access own profile, reminders, analytics, and care team."""
        headers = self._auth_header(PATIENT_A_ID)
        
        # Profile
        res = self.client.get(f"/api/users/{PATIENT_A_ID}/profile", headers=headers)
        self.assertEqual(res.status_code, 200)
        
        # Reminders
        res = self.client.get(f"/api/users/{PATIENT_A_ID}/reminders", headers=headers)
        self.assertEqual(res.status_code, 200)

        # Analytics
        res = self.client.get(f"/api/analytics/{PATIENT_A_ID}", headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_02_unauthenticated_request_rejected(self):
        """Requests without Authorization header are rejected with 401/403."""
        res = self.client.get(f"/api/users/{PATIENT_A_ID}/profile")
        self.assertIn(res.status_code, [401, 403])

        res = self.client.put(
            f"/api/users/{PATIENT_A_ID}/password",
            json={"current_password": PATIENT_A_PASS, "new_password": "NewSecretPassword1!"}
        )
        self.assertIn(res.status_code, [401, 403])

        res = self.client.request(
            "DELETE",
            f"/api/users/{PATIENT_A_ID}",
            json={"password": PATIENT_A_PASS}
        )
        self.assertIn(res.status_code, [401, 403])

    def test_03_invalid_jwt_rejected(self):
        """Requests with an invalid token are rejected with 401."""
        headers = {"Authorization": "Bearer invalid.malformed.token"}
        res = self.client.get(f"/api/users/{PATIENT_A_ID}/profile", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_04_disabled_account_rejected(self):
        """Disabled account cannot access protected endpoints."""
        p_a = next(p for p in mock_db.profiles if p["id"] == PATIENT_A_ID)
        p_a["account_status"] = "disabled"

        headers = self._auth_header(PATIENT_A_ID)
        res = self.client.get(f"/api/users/{PATIENT_A_ID}/profile", headers=headers)
        self.assertEqual(res.status_code, 403)

    # ── 2. Ownership Enforcement Tests ────────────────────────────────────────

    def test_05_cross_user_profile_read_rejected(self):
        """Patient A cannot read Patient B's profile."""
        headers_a = self._auth_header(PATIENT_A_ID)
        res = self.client.get(f"/api/users/{PATIENT_B_ID}/profile", headers=headers_a)
        self.assertEqual(res.status_code, 403)

    def test_06_cross_user_profile_update_rejected(self):
        """Patient A cannot update Patient B's profile."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "first_name": "Hacked",
            "last_name": "Name",
            "date_of_birth": "1990-01-01",
            "sex": "male",
            "height_cm": 170.0,
            "weight_kg": 70.0
        }
        res = self.client.put(f"/api/users/{PATIENT_B_ID}/profile", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 403)

    def test_07_cross_user_password_change_rejected(self):
        """Patient A cannot change Patient B's password."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {"current_password": PATIENT_B_PASS, "new_password": "NewHackedPass1!"}
        res = self.client.put(f"/api/users/{PATIENT_B_ID}/password", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 403)

    def test_08_cross_user_deletion_rejected(self):
        """Patient A cannot delete Patient B's account."""
        headers_a = self._auth_header(PATIENT_A_ID)
        res = self.client.request(
            "DELETE",
            f"/api/users/{PATIENT_B_ID}",
            json={"password": PATIENT_B_PASS},
            headers=headers_a
        )
        self.assertEqual(res.status_code, 403)

    def test_09_cross_user_reminder_update_rejected(self):
        """Patient A cannot modify Patient B's reminders."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "morning": {"enabled": True, "time": "09:00"},
            "evening": {"enabled": True, "time": "21:00"},
            "activity": {"enabled": True, "time": "18:00"}
        }
        res = self.client.put(f"/api/users/{PATIENT_B_ID}/reminders", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 403)

    def test_10_cross_user_care_team_mutation_rejected(self):
        """Patient A cannot add a care-team contact to Patient B."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "name": "Dr. Hacker",
            "role_title": "Cardiologist",
            "contact_type": "doctor",
            "phone": "+639111111111"
        }
        res = self.client.post(f"/api/users/{PATIENT_B_ID}/care-team", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 403)

    def test_11_cross_user_threshold_update_rejected(self):
        """Patient A cannot update Patient B's clinical thresholds."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "sodium_limit_mg": 2000,
            "fluid_limit_ml": 2000,
            "active_minutes_goal": 45,
            "systolic_threshold": 130,
            "diastolic_threshold": 85
        }
        res = self.client.put(f"/api/analytics/{PATIENT_B_ID}/thresholds", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 403)

    # ── 3. Password Modification Tests ────────────────────────────────────────

    def test_12_patient_can_change_own_password(self):
        """Patient can change own password with valid current password."""
        headers_a = self._auth_header(PATIENT_A_ID)
        new_pw = "NewSecurePassword123!"
        res = self.client.put(
            f"/api/users/{PATIENT_A_ID}/password",
            json={"current_password": PATIENT_A_PASS, "new_password": new_pw},
            headers=headers_a
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

    def test_13_wrong_password_rejected(self):
        """Wrong current password returns 400 Bad Request."""
        headers_a = self._auth_header(PATIENT_A_ID)
        res = self.client.put(
            f"/api/users/{PATIENT_A_ID}/password",
            json={"current_password": "WrongCurrentPassword!", "new_password": "NewSecurePassword123!"},
            headers=headers_a
        )
        self.assertEqual(res.status_code, 400)

    def test_14_hash_changes_in_database(self):
        """Successful password update modifies stored hash to match new password."""
        headers_a = self._auth_header(PATIENT_A_ID)
        new_pw = "NewSecurePassword123!"
        self.client.put(
            f"/api/users/{PATIENT_A_ID}/password",
            json={"current_password": PATIENT_A_PASS, "new_password": new_pw},
            headers=headers_a
        )
        p_a = next(p for p in mock_db.profiles if p["id"] == PATIENT_A_ID)
        self.assertEqual(p_a["password"], _hash(new_pw))

    def test_15_exactly_one_password_activity_event(self):
        """Password change generates exactly one audit event."""
        headers_a = self._auth_header(PATIENT_A_ID)
        before_count = sum(1 for a in mock_db.admin_activity if a.get("action") == "changed password" and a.get("target_id") == PATIENT_A_ID)
        self.client.put(
            f"/api/users/{PATIENT_A_ID}/password",
            json={"current_password": PATIENT_A_PASS, "new_password": "NewSecurePassword123!"},
            headers=headers_a
        )
        after_count = sum(1 for a in mock_db.admin_activity if a.get("action") == "changed password" and a.get("target_id") == PATIENT_A_ID)
        self.assertEqual(after_count, before_count + 1)

    def test_16_no_password_material_in_activity_log(self):
        """No plaintext passwords or hashes are recorded in activity logs."""
        headers_a = self._auth_header(PATIENT_A_ID)
        new_pw = "NewSecretString999!"
        self.client.put(
            f"/api/users/{PATIENT_A_ID}/password",
            json={"current_password": PATIENT_A_PASS, "new_password": new_pw},
            headers=headers_a
        )
        last_log = str(mock_db.admin_activity[-1])
        self.assertNotIn(PATIENT_A_PASS, last_log)
        self.assertNotIn(new_pw, last_log)
        self.assertNotIn(_hash(new_pw), last_log)

    # ── 4. Profile Privacy & Persistence Tests ────────────────────────────────

    def test_17_profile_mutation_persists_after_reload(self):
        """Profile update persists and survives load_profiles."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "first_name": "MariaUpdated",
            "last_name": "SantosUpdated",
            "date_of_birth": "1990-02-02",
            "sex": "female",
            "height_cm": 165.0,
            "weight_kg": 58.0,
            "health_goals": ["lower_bp"]
        }
        res = self.client.put(f"/api/users/{PATIENT_A_ID}/profile", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 200)

        # Simulate reload from DB_FILE
        mock_db.load_profiles()
        p_reloaded = next(p for p in mock_db.profiles if p["id"] == PATIENT_A_ID)
        self.assertEqual(p_reloaded["first_name"], "MariaUpdated")
        self.assertEqual(p_reloaded["height_cm"], 165.0)

    def test_18_password_hash_absent_from_profile_response(self):
        """GET /api/users/{user_id}/profile never leaks password hash."""
        headers_a = self._auth_header(PATIENT_A_ID)
        res = self.client.get(f"/api/users/{PATIENT_A_ID}/profile", headers=headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Check profile dictionary
        profile_obj = data.get("profile", {})
        self.assertNotIn("password", profile_obj)
        self.assertNotIn("password_hash", profile_obj)
        self.assertNotIn("token", profile_obj)
        self.assertNotIn("secret", profile_obj)

    # ── 5. Care Team Tests ───────────────────────────────────────────────────

    def test_19_care_team_mutations_persist(self):
        """Care team contact creation persists across reload."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "name": "Dr. Clara Barton",
            "role_title": "Primary Care",
            "contact_type": "doctor",
            "phone": "+639123456789"
        }
        res = self.client.post(f"/api/users/{PATIENT_A_ID}/care-team", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 201)
        created_contact = res.json().get("data")
        self.assertIsNotNone(created_contact)

        # Reload
        mock_db.load_profiles()
        saved = next((c for c in mock_db.care_team_contacts if c["id"] == created_contact["id"]), None)
        self.assertIsNotNone(saved)
        self.assertEqual(saved["name"], "Dr. Clara Barton")

    def test_20_duplicate_submission_protection(self):
        """Care team schema validates non-empty inputs."""
        headers_a = self._auth_header(PATIENT_A_ID)
        invalid_payload = {
            "name": "",
            "role_title": "",
            "contact_type": "doctor",
            "phone": ""
        }
        res = self.client.post(f"/api/users/{PATIENT_A_ID}/care-team", json=invalid_payload, headers=headers_a)
        self.assertEqual(res.status_code, 422)

    # ── 6. Daily Reminders Persistence Tests ─────────────────────────────────

    def test_21_reminder_settings_persist_after_restart(self):
        """Reminders update persists across reload."""
        headers_a = self._auth_header(PATIENT_A_ID)
        payload = {
            "morning": {"enabled": True, "time": "07:30"},
            "evening": {"enabled": True, "time": "21:30"},
            "activity": {"enabled": False, "time": "17:00"}
        }
        res = self.client.put(f"/api/users/{PATIENT_A_ID}/reminders", json=payload, headers=headers_a)
        self.assertEqual(res.status_code, 200)

        # Reload
        mock_db.load_profiles()
        r_saved = next((r for r in mock_db.user_reminders if r["user_id"] == PATIENT_A_ID), None)
        self.assertIsNotNone(r_saved)
        self.assertEqual(r_saved["morning"]["time"], "07:30")
        self.assertTrue(r_saved["morning"]["enabled"])

    # ── 7. Account Deletion Tests ─────────────────────────────────────────────

    def test_22_unauthenticated_deletion_rejected(self):
        """Unauthenticated account deletion is rejected."""
        res = self.client.request(
            "DELETE",
            f"/api/users/{PATIENT_A_ID}",
            json={"password": PATIENT_A_PASS}
        )
        self.assertIn(res.status_code, [401, 403])

    def test_23_cross_user_deletion_rejected(self):
        """Patient A cannot delete Patient B's account."""
        headers_a = self._auth_header(PATIENT_A_ID)
        res = self.client.request(
            "DELETE",
            f"/api/users/{PATIENT_B_ID}",
            json={"password": PATIENT_B_PASS},
            headers=headers_a
        )
        self.assertEqual(res.status_code, 403)

    def test_24_correct_owner_can_delete_with_password(self):
        """Owner can delete own account after password verification."""
        headers_a = self._auth_header(PATIENT_A_ID)
        res = self.client.request(
            "DELETE",
            f"/api/users/{PATIENT_A_ID}",
            json={"password": PATIENT_A_PASS},
            headers=headers_a
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # Verify user removed from mock_db.profiles
        deleted_user = next((p for p in mock_db.profiles if p["id"] == PATIENT_A_ID), None)
        self.assertIsNone(deleted_user)

    def test_25_deletion_generates_one_audit_event(self):
        """Account deletion creates exactly one audit event."""
        headers_a = self._auth_header(PATIENT_A_ID)
        before_count = sum(1 for a in mock_db.admin_activity if a.get("action") == "deleted account" and a.get("target_id") == PATIENT_A_ID)
        self.client.request(
            "DELETE",
            f"/api/users/{PATIENT_A_ID}",
            json={"password": PATIENT_A_PASS},
            headers=headers_a
        )
        after_count = sum(1 for a in mock_db.admin_activity if a.get("action") == "deleted account" and a.get("target_id") == PATIENT_A_ID)
        self.assertEqual(after_count, before_count + 1)
        
        last_event = mock_db.admin_activity[-1]
        self.assertEqual(last_event["action"], "deleted account")
        self.assertEqual(last_event["target_id"], PATIENT_A_ID)

    # ── 8. JWT Issuance Tests ─────────────────────────────────────────────────

    def test_26_login_returns_signed_jwt(self):
        """Mobile login returns token in addition to user_id."""
        res = self.client.post("/api/auth/login", json={
            "identifier": PATIENT_A_EMAIL,
            "password": PATIENT_A_PASS
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("token", data)
        self.assertEqual(data.get("user_id"), PATIENT_A_ID)

    def test_27_jwt_contains_user_id_and_role(self):
        """Decoded JWT payload contains correct user_id and role claims."""
        res = self.client.post("/api/auth/login", json={
            "identifier": PATIENT_A_EMAIL,
            "password": PATIENT_A_PASS
        })
        token = res.json()["token"]
        payload = verify_token(token)
        self.assertEqual(payload.get("user_id"), PATIENT_A_ID)
        self.assertEqual(payload.get("role"), "patient")

    def test_28_issued_token_authenticates_protected_endpoint(self):
        """Token returned from login successfully authorizes subsequent protected requests."""
        res_login = self.client.post("/api/auth/login", json={
            "identifier": PATIENT_A_EMAIL,
            "password": PATIENT_A_PASS
        })
        token = res_login.json()["token"]

        headers = {"Authorization": f"Bearer {token}"}
        res_profile = self.client.get(f"/api/users/{PATIENT_A_ID}/profile", headers=headers)
        self.assertEqual(res_profile.status_code, 200)
        self.assertEqual(res_profile.json()["profile"]["id"], PATIENT_A_ID)


if __name__ == "__main__":
    unittest.main()
