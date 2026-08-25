# backend/tests/test_production_security_pass1.py
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import jwt

from app.main import app
import app.mock_db as mock_db
from app.utils.security import SECRET_KEY, ALGORITHM, create_access_token, token_blacklist

class TestProductionSecurityPass1(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides.clear()
        self.client = TestClient(app)
        
        # Deep snapshots of mock_db collections
        self.orig_profiles = [dict(p) for p in mock_db.profiles]
        self.orig_health_logs = [dict(l) for l in mock_db.daily_health_logs]
        self.orig_meals = [dict(m) for m in mock_db.meal_logs]
        self.orig_exercise_logs = [dict(e) for e in mock_db.exercise_logs]
        self.orig_sleep_logs = [dict(s) for s in mock_db.sleep_logs]
        self.orig_saved_recipes = [dict(r) for r in getattr(mock_db, "saved_recipes", [])]
        self.orig_feedback_tickets = [dict(f) for f in mock_db.feedback_tickets]
        self.orig_temp_profiles = [dict(t) for t in mock_db.temp_profiles]
        
        token_blacklist.clear()

    def tearDown(self):
        app.dependency_overrides.clear()
        mock_db.profiles.clear()
        mock_db.profiles.extend(self.orig_profiles)
        
        mock_db.daily_health_logs.clear()
        mock_db.daily_health_logs.extend(self.orig_health_logs)
        
        mock_db.meal_logs.clear()
        mock_db.meal_logs.extend(self.orig_meals)
        
        mock_db.exercise_logs.clear()
        mock_db.exercise_logs.extend(self.orig_exercise_logs)
        
        mock_db.sleep_logs.clear()
        mock_db.sleep_logs.extend(self.orig_sleep_logs)
        
        if hasattr(mock_db, "saved_recipes"):
            mock_db.saved_recipes.clear()
            mock_db.saved_recipes.extend(self.orig_saved_recipes)
            
        mock_db.feedback_tickets.clear()
        mock_db.feedback_tickets.extend(self.orig_feedback_tickets)
        
        mock_db.temp_profiles.clear()
        mock_db.temp_profiles.extend(self.orig_temp_profiles)
        
        token_blacklist.clear()

    def _headers(self, user_id: str, role: str = "patient") -> dict:
        token = create_access_token({"user_id": user_id, "role": role})
        return {"Authorization": f"Bearer {token}"}

    # =========================================================================
    # 1. AUTHENTICATION TESTS (Tests 1 - 7)
    # =========================================================================

    def test_01_valid_patient_jwt_succeeds(self):
        """1. Valid patient JWT succeeds on protected patient endpoint."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_02_missing_bearer_token_fails(self):
        """2. Missing Bearer token fails with 401 or 403."""
        res = self.client.get("/api/health-logs/usr-patient-101")
        self.assertIn(res.status_code, [401, 403])

    def test_03_invalid_jwt_fails(self):
        """3. Invalid/tampered JWT fails with 401."""
        headers = {"Authorization": "Bearer invalid.jwt.token.string"}
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_04_expired_jwt_fails(self):
        """4. Expired JWT fails with 401."""
        exp = datetime.utcnow() - timedelta(minutes=10)
        token = jwt.encode({"user_id": "usr-patient-101", "role": "patient", "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)
        headers = {"Authorization": f"Bearer {token}"}
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_05_blacklisted_jwt_fails(self):
        """5. Blacklisted/revoked JWT fails with 401."""
        token = create_access_token({"user_id": "usr-patient-101", "role": "patient"})
        token_blacklist.add(token)
        headers = {"Authorization": f"Bearer {token}"}
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_06_raw_user_id_as_bearer_credential_fails(self):
        """6. Raw patient user ID used as Bearer credential fails with 401."""
        headers = {"Authorization": "Bearer usr-patient-101"}
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_07_disabled_account_fails(self):
        """7. Disabled account fails with 403."""
        for p in mock_db.profiles:
            if p["id"] == "usr-patient-101":
                p["account_status"] = "disabled"
                break
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 403)

    # =========================================================================
    # 2. HEALTH LOGS TESTS (Tests 8 - 12)
    # =========================================================================

    def test_08_patient_can_read_own_health_logs(self):
        """8. Patient can read own logs."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_09_patient_cannot_read_other_patient_health_logs(self):
        """9. Patient cannot read another patient's logs."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/health-logs/usr-patient-102", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_10_patient_can_create_own_health_log(self):
        """10. Patient can create own log and data integrity is verified."""
        init_count = len(mock_db.daily_health_logs)
        headers = self._headers("usr-patient-101", "patient")
        payload = {
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "heart_rate_bpm": 72,
            "weight_kg": 70.5,
            "medication_taken": True,
            "symptoms": ["Fatigue"],
            "severity_map": {"Fatigue": 2}
        }
        res = self.client.post("/api/health-logs/usr-patient-101", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))
        self.assertEqual(len(mock_db.daily_health_logs), init_count + 1)
        created = mock_db.daily_health_logs[-1]
        self.assertEqual(created["user_id"], "usr-patient-101")
        self.assertEqual(created["systolic_bp"], 120)

    def test_11_patient_cannot_create_other_patient_health_log(self):
        """11. Patient cannot create another patient's log; state unchanged."""
        init_count = len(mock_db.daily_health_logs)
        headers = self._headers("usr-patient-101", "patient")
        payload = {
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "heart_rate_bpm": 72
        }
        res = self.client.post("/api/health-logs/usr-patient-102", json=payload, headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(len(mock_db.daily_health_logs), init_count)

    def test_12_patient_cannot_delete_other_patient_health_log(self):
        """12. Patient cannot delete another patient's log; state unchanged."""
        mock_db.daily_health_logs.append({
            "id": "hl-victim-999",
            "user_id": "usr-patient-102",
            "systolic_bp": 130,
            "diastolic_bp": 85,
            "heart_rate_bpm": 75,
            "logged_at": datetime.utcnow().isoformat()
        })
        init_count = len(mock_db.daily_health_logs)
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.delete("/api/health-logs/usr-patient-102/hl-victim-999", headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(len(mock_db.daily_health_logs), init_count)
        self.assertTrue(any(l["id"] == "hl-victim-999" for l in mock_db.daily_health_logs))

    # =========================================================================
    # 3. MEALS TESTS (Tests 13 - 16)
    # =========================================================================

    def test_13_own_meal_access_succeeds(self):
        """13. Own meal access succeeds."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/meals/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_14_cross_user_meal_access_fails(self):
        """14. Cross-user meal access fails with 403."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/meals/usr-patient-102", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_15_cross_user_meal_creation_fails(self):
        """15. Cross-user meal creation fails with 403; database unmodified."""
        init_count = len(mock_db.meal_logs)
        headers = self._headers("usr-patient-101", "patient")
        payload = {
            "meal_name": "Grilled Salmon",
            "portion": 1,
            "calories": 350,
            "sodium_mg": 180,
            "saturated_fat_g": 1.5,
            "fiber_g": 2.0
        }
        res = self.client.post("/api/meals/usr-patient-102", json=payload, headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(len(mock_db.meal_logs), init_count)

    def test_16_cross_user_meal_deletion_fails(self):
        """16. Cross-user meal deletion fails with 403; database unmodified."""
        mock_db.meal_logs.append({
            "id": "meal-victim-999",
            "user_id": "usr-patient-102",
            "meal_name": "Sinigang",
            "calories": 400,
            "sodium_mg": 500,
            "saturated_fat_g": 2.0,
            "fiber_g": 3.0,
            "logged_at": datetime.utcnow().isoformat()
        })
        init_count = len(mock_db.meal_logs)
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.delete("/api/meals/usr-patient-102/meal-victim-999", headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(len(mock_db.meal_logs), init_count)

    # =========================================================================
    # 4. EXERCISE TESTS (Tests 17 - 20)
    # =========================================================================

    def test_17_own_exercise_access_succeeds(self):
        """17. Own exercise access succeeds."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/exercises/logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_18_cross_user_exercise_access_fails(self):
        """18. Cross-user exercise access fails with 403."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/exercises/logs/usr-patient-102", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_19_cross_user_exercise_creation_fails(self):
        """19. Cross-user exercise creation fails with 403; state unmodified."""
        init_count = len(mock_db.exercise_logs)
        headers = self._headers("usr-patient-101", "patient")
        payload = {
            "routine_name": "Brisk Walk",
            "duration_minutes": 30,
            "duration_seconds": 1800,
            "status": "completed"
        }
        res = self.client.post("/api/exercises/logs/usr-patient-102", json=payload, headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(len(mock_db.exercise_logs), init_count)

    def test_20_cross_user_exercise_deletion_fails(self):
        """20. Cross-user exercise deletion fails with 403; state unmodified."""
        mock_db.exercise_logs.append({
            "id": "ex-victim-999",
            "user_id": "usr-patient-102",
            "routine_name": "Light Yoga",
            "duration_minutes": 15,
            "status": "completed",
            "logged_at": datetime.utcnow().isoformat()
        })
        init_count = len(mock_db.exercise_logs)
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.delete("/api/exercises/logs/usr-patient-102/ex-victim-999", headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(len(mock_db.exercise_logs), init_count)

    # =========================================================================
    # 5. SLEEP TESTS (Tests 21 - 23)
    # =========================================================================

    def test_21_own_sleep_access_succeeds(self):
        """21. Own sleep access succeeds."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/sleep-logs/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_22_cross_user_sleep_access_fails(self):
        """22. Cross-user sleep access fails with 403."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/sleep-logs/usr-patient-102", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_23_unauthenticated_sleep_access_fails(self):
        """23. Unauthenticated sleep access fails with 401/403."""
        res = self.client.get("/api/sleep-logs/usr-patient-101")
        self.assertIn(res.status_code, [401, 403])
        res_post = self.client.post("/api/sleep-logs/usr-patient-101", json={"duration_hours": 7.5, "quality": "Good"})
        self.assertIn(res_post.status_code, [401, 403])

    # =========================================================================
    # 6. SAVED RECIPES TESTS (Tests 24 - 26)
    # =========================================================================

    def test_24_own_saved_recipes_succeed(self):
        """24. Own saved recipes succeed."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/recipes/saved/usr-patient-101", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_25_cross_user_saved_recipes_fail(self):
        """25. Cross-user saved recipes fail with 403."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/recipes/saved/usr-patient-102", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_26_cross_user_save_operation_fails(self):
        """26. Cross-user save recipe operation fails with 403."""
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.post("/api/recipes/rec-001/save/usr-patient-102", headers=headers)
        self.assertEqual(res.status_code, 403)

    # =========================================================================
    # 7. OTP CONTRACT & AUTH TESTS (Tests 27 - 29)
    # =========================================================================

    def test_27_successful_otp_verification_returns_jwt(self):
        """27. Successful OTP verification returns JWT and user_id."""
        mock_db.temp_profiles.append({
            "phone": "+639991234567",
            "email": "new.otp.user@example.com",
            "password": "hashedpassword123",
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        })
        res = self.client.post("/api/auth/verify-code", json={"phone": "+639991234567", "code": "123456"})
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("user_id", data)
        self.assertIn("token", data)
        self.assertTrue(len(data["token"]) > 20)

    def test_28_returned_otp_jwt_authenticates_protected_endpoint(self):
        """28. Returned JWT from OTP verification authenticates protected endpoints."""
        mock_db.temp_profiles.append({
            "phone": "+639997654321",
            "email": "new.otp.auth@example.com",
            "password": "hashedpassword123",
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        })
        res = self.client.post("/api/auth/verify-code", json={"phone": "+639997654321", "code": "123456"})
        self.assertEqual(res.status_code, 201)
        data = res.json()
        new_uid = data["user_id"]
        token = data["token"]

        headers = {"Authorization": f"Bearer {token}"}
        hl_res = self.client.get(f"/api/health-logs/{new_uid}", headers=headers)
        self.assertEqual(hl_res.status_code, 200)

    def test_29_invalid_otp_code_fails(self):
        """29. Invalid OTP code fails with 400 and issues no token."""
        mock_db.temp_profiles.append({
            "phone": "+639990001122",
            "email": "invalid.otp@example.com",
            "password": "hashedpassword123",
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        })
        res = self.client.post("/api/auth/verify-code", json={"phone": "+639990001122", "code": "000000"})
        self.assertEqual(res.status_code, 400)

    # =========================================================================
    # 8. SYNC / TELEMETRY CONTRACT TESTS (Tests 30 - 32)
    # =========================================================================

    def test_30_raw_user_id_rejected_on_all_telemetry_routes(self):
        """30. Raw user ID fails on health-logs, meals, exercises, and sleep-logs."""
        headers = {"Authorization": "Bearer usr-patient-101"}
        res_hl = self.client.get("/api/health-logs/usr-patient-101", headers=headers)
        self.assertEqual(res_hl.status_code, 401)
        res_m = self.client.get("/api/meals/usr-patient-101", headers=headers)
        self.assertEqual(res_m.status_code, 401)
        res_ex = self.client.get("/api/exercises/logs/usr-patient-101", headers=headers)
        self.assertEqual(res_ex.status_code, 401)
        res_sl = self.client.get("/api/sleep-logs/usr-patient-101", headers=headers)
        self.assertEqual(res_sl.status_code, 401)

    def test_31_valid_jwt_sync_telemetry_succeeds(self):
        """31. Authenticated sync with valid JWT succeeds on telemetry endpoints."""
        headers = self._headers("usr-patient-101", "patient")
        # Meal sync
        res_m = self.client.post("/api/meals/usr-patient-101", json={"meal_name": "Tinolang Manok", "portion": 1, "calories": 250, "sodium_mg": 300}, headers=headers)
        self.assertEqual(res_m.status_code, 200)
        # Exercise sync
        res_ex = self.client.post("/api/exercises/logs/usr-patient-101", json={"routine_name": "Walking", "duration_minutes": 20}, headers=headers)
        self.assertEqual(res_ex.status_code, 200)
        # Sleep sync
        res_sl = self.client.post("/api/sleep-logs/usr-patient-101", json={"duration_hours": 8.0, "quality": "Excellent"}, headers=headers)
        self.assertEqual(res_sl.status_code, 200)

    def test_32_unauthenticated_sync_fails(self):
        """32. Unauthenticated sync calls fail with 401/403."""
        res_m = self.client.post("/api/meals/usr-patient-101", json={"meal_name": "Snack", "portion": 1})
        self.assertIn(res_m.status_code, [401, 403])
        res_ex = self.client.post("/api/exercises/logs/usr-patient-101", json={"routine_name": "Walking"})
        self.assertIn(res_ex.status_code, [401, 403])
        res_sl = self.client.post("/api/sleep-logs/usr-patient-101", json={"duration_hours": 6.5})
        self.assertIn(res_sl.status_code, [401, 403])

    # =========================================================================
    # 9. FEEDBACK SECURITY TESTS (Tests 33 - 35)
    # =========================================================================

    def test_33_raw_user_id_cannot_authenticate_feedback(self):
        """33. Raw user ID cannot authenticate feedback requests."""
        headers = {"Authorization": "Bearer usr-patient-101"}
        payload = {
            "category": "Bug Report",
            "fullMessage": "Testing feedback",
            "user": "Patient Test",
            "userEmail": "patient@example.com",
            "userId": "usr-patient-101"
        }
        res = self.client.post("/api/feedback", json=payload, headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_34_patient_can_submit_own_feedback(self):
        """34. Patient can submit feedback with valid JWT."""
        init_count = len(mock_db.feedback_tickets)
        headers = self._headers("usr-patient-101", "patient")
        payload = {
            "category": "UI/UX Suggestion",
            "fullMessage": "Add more dark mode contrast",
            "user": "Patient User",
            "userEmail": "patient@example.com",
            "userId": "usr-patient-101"
        }
        res = self.client.post("/api/feedback", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mock_db.feedback_tickets), init_count + 1)
        created = mock_db.feedback_tickets[0]
        self.assertEqual(created["userId"], "usr-patient-101")

    def test_35_tampered_token_feedback_rejected(self):
        """35. Tampered or fake token on feedback route fails with 401; no ticket created."""
        init_count = len(mock_db.feedback_tickets)
        headers = {"Authorization": "Bearer fake.tampered.token"}
        payload = {
            "category": "Bug Report",
            "fullMessage": "Tampered ticket injection attempt",
            "userId": "usr-patient-102"
        }
        res = self.client.post("/api/feedback", json=payload, headers=headers)
        self.assertEqual(res.status_code, 401)
        self.assertEqual(len(mock_db.feedback_tickets), init_count)

if __name__ == "__main__":
    unittest.main()
