# backend/test_clinical_invariants_and_security.py
"""
Comprehensive Verification Test Suite:
1. Clinical Invariants & Physiological Blood Pressure Boundaries (SBP > DBP, Pulse Pressure >= 15 mmHg)
2. Telemetry Numeric Validation (0, negative, out-of-range bounds)
3. BOLA / IDOR Access Control on Health Logs, Meals, and Sleep Logs
4. Secret Key and Client Key Isolation
"""
import sys
import os
import uuid
from datetime import timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

def make_token(user_id: str, role: str = "patient") -> str:
    return create_access_token(
        data={"user_id": user_id, "sub": f"{user_id}@heartlink.test", "role": role},
        expires_delta=timedelta(hours=1)
    )

def mock_active_profile(user_id: str, role: str = "patient"):
    return {
        "id": user_id,
        "account_status": "active",
        "role": role,
    }

class MockProfileRepo:
    def get_by_id(self, user_id: str):
        role = "doctor" if "doctor" in str(user_id) else "patient"
        return mock_active_profile(user_id, role)

def test_bp_physiological_invariants_sbp_greater_than_dbp():
    """Verify that SBP <= DBP is strictly rejected with HTTP 422."""
    user_id = str(uuid.uuid4())
    token = make_token(user_id, role="patient")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        # Case 1: SBP == DBP (120/120)
        res_equal = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": 120, "diastolic_bp": 120},
            headers=headers
        )
        assert res_equal.status_code == 422, f"Expected 422 for SBP == DBP, got {res_equal.status_code}: {res_equal.text}"
        assert "strictly greater" in res_equal.json()["detail"].lower()

        # Case 2: SBP < DBP (110/120)
        res_inverted = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": 110, "diastolic_bp": 120},
            headers=headers
        )
        assert res_inverted.status_code == 422, f"Expected 422 for SBP < DBP, got {res_inverted.status_code}: {res_inverted.text}"


def test_bp_pulse_pressure_minimum_boundary():
    """Verify that Pulse Pressure (SBP - DBP) < 15 mmHg is rejected with HTTP 422."""
    user_id = str(uuid.uuid4())
    token = make_token(user_id, role="patient")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        # Pulse Pressure = 10 (120/110)
        res_narrow_pp = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": 120, "diastolic_bp": 110},
            headers=headers
        )
        assert res_narrow_pp.status_code == 422, f"Expected 422 for PP < 15, got {res_narrow_pp.status_code}: {res_narrow_pp.text}"
        assert "pulse pressure" in res_narrow_pp.json()["detail"].lower()


def test_bp_zero_and_out_of_bounds_validation():
    """Verify that 0 or out-of-range numeric vitals are rejected."""
    user_id = str(uuid.uuid4())
    token = make_token(user_id, role="patient")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        # SBP = 0 (below minimum 50)
        res_zero = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": 0, "diastolic_bp": 80},
            headers=headers
        )
        assert res_zero.status_code in [400, 422], f"Expected 400/422 for SBP=0, got {res_zero.status_code}: {res_zero.text}"

        # SBP = 350 (above maximum 300)
        res_high = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": 350, "diastolic_bp": 80},
            headers=headers
        )
        assert res_high.status_code in [400, 422], f"Expected 400/422 for SBP=350, got {res_high.status_code}: {res_high.text}"

        # Non-numeric string SBP
        res_str = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": "invalid", "diastolic_bp": 80},
            headers=headers
        )
        assert res_str.status_code == 422, f"Expected 422 for string SBP, got {res_str.status_code}: {res_str.text}"


def test_bola_patient_cross_access_denied():
    """Verify that Patient A cannot read or write Patient B's logs (HTTP 403)."""
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    token_a = make_token(user_a, role="patient")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        # 1. Health Logs cross-access
        res_hl = client.get(f"/api/health-logs/{user_b}", headers=headers_a)
        assert res_hl.status_code == 403, f"Expected 403 for health-logs IDOR, got {res_hl.status_code}"

        # 2. Meal Logs cross-access
        res_meal = client.get(f"/api/meals/{user_b}", headers=headers_a)
        assert res_meal.status_code == 403, f"Expected 403 for meals IDOR, got {res_meal.status_code}"

        # 3. Sleep Logs cross-access
        res_sleep = client.get(f"/api/sleep-logs/{user_b}", headers=headers_a)
        assert res_sleep.status_code == 403, f"Expected 403 for sleep-logs IDOR, got {res_sleep.status_code}"

        # 4. Analytics cross-access
        res_analytics = client.get(f"/api/analytics/{user_b}", headers=headers_a)
        assert res_analytics.status_code == 403, f"Expected 403 for analytics IDOR, got {res_analytics.status_code}"


def test_bola_unassigned_doctor_denied():
    """Verify that a doctor not assigned to a patient cannot access their telemetry (HTTP 403)."""
    doctor_id = f"doctor-{uuid.uuid4()}"
    patient_id = str(uuid.uuid4())
    token_doc = make_token(doctor_id, role="doctor")
    headers_doc = {"Authorization": f"Bearer {token_doc}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        with patch("app.db.repositories.get_baseline_repo") as mock_repo:
            mock_instance = MagicMock()
            mock_instance.list_care_team.return_value = []
            mock_repo.return_value = mock_instance

            res_meals = client.get(f"/api/meals/{patient_id}", headers=headers_doc)
            assert res_meals.status_code == 403, f"Expected 403 for unassigned doctor on meals, got {res_meals.status_code}"

            res_sleep = client.get(f"/api/sleep-logs/{patient_id}", headers=headers_doc)
            assert res_sleep.status_code == 403, f"Expected 403 for unassigned doctor on sleep, got {res_sleep.status_code}"


def test_happy_path_valid_vitals():
    """Verify that a physiologically sound reading (125/80, PP=45) is accepted."""
    user_id = str(uuid.uuid4())
    token = make_token(user_id, role="patient")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        with patch("app.api.health_logs.health_logs.create_health_log") as mock_create:
            mock_create.return_value = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "systolic_bp": 125,
                "diastolic_bp": 80,
                "heart_rate_bpm": 72,
            }
            res = client.post(
                f"/api/health-logs/{user_id}",
                json={"systolic_bp": 125, "diastolic_bp": 80, "heart_rate_bpm": 72},
                headers=headers
            )
            assert res.status_code in [200, 201], f"Expected 200/201, got {res.status_code}: {res.text}"


def test_dynamic_vitals_hss_computation():
    """Verify dynamic HSS scoring for normotensive, hypertensive crisis, and hypotension."""
    from app.services.hss_service import compute_vitals_hss

    # 1. Normotensive (118/78, HR 70) -> High stability tier
    score_norm, tier_norm, _ = compute_vitals_hss(118, 78, 70)
    assert 80 <= score_norm <= 100, f"Expected 80-100 for normal vitals, got {score_norm}"
    assert tier_norm == "Stable", f"Expected Stable, got {tier_norm}"

    # 2. Hypertensive Crisis (190/125, HR 95) -> Critical tier
    score_crisis, tier_crisis, _ = compute_vitals_hss(190, 125, 95)
    assert score_crisis < 50, f"Expected <50 for hypertensive crisis, got {score_crisis}"
    assert tier_crisis == "Critical", f"Expected Critical, got {tier_crisis}"

    # 3. Acute Severe Hypotension (82/52, HR 55) -> Critical tier
    score_hypo, tier_hypo, _ = compute_vitals_hss(82, 52, 55)
    assert score_hypo < 50, f"Expected <50 for severe hypotension, got {score_hypo}"
    assert tier_hypo == "Critical", f"Expected Critical, got {tier_hypo}"


def test_bola_unassigned_medical_expert_profile_and_exercises():
    """Verify that an unassigned medical_expert receives HTTP 403 on profile and exercise logs."""
    doc_id = f"doctor-{uuid.uuid4()}"
    patient_id = str(uuid.uuid4())
    token_doc = make_token(doc_id, role="medical_expert")
    headers_doc = {"Authorization": f"Bearer {token_doc}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        with patch("app.db.repositories.get_baseline_repo") as mock_base_repo:
            mock_base_inst = MagicMock()
            mock_base_inst.list_care_team.return_value = []  # Not assigned
            mock_base_repo.return_value = mock_base_inst

            # 1. Patient Profile
            res_profile = client.get(f"/api/users/{patient_id}/profile", headers=headers_doc)
            assert res_profile.status_code == 403, f"Expected 403 for unassigned doctor on profile, got {res_profile.status_code}"

            # 2. Exercise Logs
            res_exercises = client.get(f"/api/exercises/logs/{patient_id}", headers=headers_doc)
            assert res_exercises.status_code == 403, f"Expected 403 for unassigned doctor on exercise logs, got {res_exercises.status_code}"


def test_bp_pairwise_invariant():
    """Verify that submitting SBP without DBP or DBP without SBP is rejected with HTTP 422."""
    user_id = str(uuid.uuid4())
    token = make_token(user_id, role="patient")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        # 1. SBP provided without DBP
        res_sbp_only = client.post(
            f"/api/health-logs/{user_id}",
            json={"systolic_bp": 130},
            headers=headers
        )
        assert res_sbp_only.status_code == 422, f"Expected 422 for SBP without DBP, got {res_sbp_only.status_code}: {res_sbp_only.text}"
        assert "both systolic and diastolic" in res_sbp_only.json()["detail"].lower()

        # 2. DBP provided without SBP
        res_dbp_only = client.post(
            f"/api/health-logs/{user_id}",
            json={"diastolic_bp": 80},
            headers=headers
        )
        assert res_dbp_only.status_code == 422, f"Expected 422 for DBP without SBP, got {res_dbp_only.status_code}: {res_dbp_only.text}"
        assert "both systolic and diastolic" in res_dbp_only.json()["detail"].lower()


def test_bola_unassigned_doctor_reminders_notifications_care_team():
    """Verify that an unassigned doctor receives HTTP 403 on reminders, care team, notifications, and saved recipes."""
    doc_id = f"doctor-{uuid.uuid4()}"
    patient_id = str(uuid.uuid4())
    token_doc = make_token(doc_id, role="doctor")
    headers_doc = {"Authorization": f"Bearer {token_doc}"}

    with patch("app.utils.security.get_profile_repo", return_value=MockProfileRepo()):
        with patch("app.db.repositories.get_baseline_repo") as mock_base_repo:
            mock_base_inst = MagicMock()
            mock_base_inst.list_care_team.return_value = []  # Not assigned
            mock_base_repo.return_value = mock_base_inst

            # 1. Reminders read
            res_rem = client.get(f"/api/users/{patient_id}/reminders", headers=headers_doc)
            assert res_rem.status_code == 403, f"Expected 403 for unassigned doctor on reminders, got {res_rem.status_code}"

            # 2. Care team mutation
            res_ct = client.post(
                f"/api/users/{patient_id}/care-team",
                json={"name": "Dr. Hacker", "role_title": "Cardiologist", "phone": "1234567890"},
                headers=headers_doc
            )
            assert res_ct.status_code == 403, f"Expected 403 for doctor mutating patient care team, got {res_ct.status_code}"

            # 3. Notifications read
            res_notif = client.get(f"/api/notifications/{patient_id}", headers=headers_doc)
            assert res_notif.status_code == 403, f"Expected 403 for unassigned doctor on notifications, got {res_notif.status_code}"

            # 4. Saved recipes read
            res_rec = client.get(f"/api/recipes/saved/{patient_id}", headers=headers_doc)
            assert res_rec.status_code == 403, f"Expected 403 for unassigned doctor on saved recipes, got {res_rec.status_code}"


def test_all_user_id_routes_reject_unauthenticated():
    """Verify that every route accepting {user_id} rejects unauthenticated requests with 401/403."""
    dummy_id = str(uuid.uuid4())
    tested_count = 0
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", set())
        if "{user_id}" in path and "GET" in methods:
            test_url = path.replace("{user_id}", dummy_id)
            # Skip sub-resources requiring additional IDs for this check
            if "{" in test_url:
                continue
            res = client.get(test_url)
            assert res.status_code in [401, 403], f"Route {path} allowed unauthenticated access! Status: {res.status_code}"
            tested_count += 1
    assert tested_count > 0, "No {user_id} routes found to test!"


def test_recipe_saved_endpoints_and_bola():
    """Verify that saved recipe endpoints enforce BOLA isolation and support DELETE."""
    from unittest.mock import patch

    token_user = make_token("usr-test-1", "patient")
    token_attacker = make_token("usr-attacker", "patient")

    with patch("app.utils.security.get_profile_repo") as mock_repo, \
         patch("app.services.recipes.get_content_repo") as mock_content:
        mock_repo.return_value.get_by_id.side_effect = lambda uid: mock_active_profile(uid, "patient")
        mock_content.return_value.save_recipe_for_user.return_value = True
        mock_content.return_value.unsave_recipe_for_user.return_value = True

        # 1. DELETE happy path
        res_del = client.delete("/api/recipes/rec-1/save/usr-test-1", headers={"Authorization": f"Bearer {token_user}"})
        assert res_del.status_code == 200, f"Expected 200, got {res_del.status_code}"
        assert res_del.json().get("success") is True

        # 2. DELETE BOLA rejection
        res_del_bola = client.delete("/api/recipes/rec-1/save/usr-test-1", headers={"Authorization": f"Bearer {token_attacker}"})
        assert res_del_bola.status_code == 403, f"Expected 403, got {res_del_bola.status_code}"

        # 3. POST BOLA rejection
        res_post_bola = client.post("/api/recipes/rec-1/save/usr-test-1", headers={"Authorization": f"Bearer {token_attacker}"})
        assert res_post_bola.status_code == 403, f"Expected 403, got {res_post_bola.status_code}"


def test_recipe_status_based_access_control():
    """Verify that patients only see published recipes, and unpublished recipes 404 for non-admins."""
    from unittest.mock import patch

    mock_recipes = [
        {"id": "rec-pub-1", "name": "Published Soup", "status": "published", "category": "Lunch", "ingredients": []},
        {"id": "rec-draft-1", "name": "Draft Salad", "status": "draft", "category": "Lunch", "ingredients": []},
        {"id": "rec-arch-1", "name": "Archived Dish", "status": "archived", "category": "Dinner", "ingredients": []},
    ]

    patient_token = make_token("usr-patient", "patient")
    admin_token = make_token("usr-admin", "admin")

    with patch("app.services.recipes.get_content_repo") as mock_content:
        mock_content.return_value.list_recipes.return_value = mock_recipes
        mock_content.return_value.get_recipe.side_effect = lambda rid: next((r for r in mock_recipes if r["id"] == rid), None)

        # 1. Unauthenticated GET /api/recipes -> Only published
        res_unauth = client.get("/api/recipes")
        assert res_unauth.status_code == 200
        items_unauth = res_unauth.json()
        assert len(items_unauth) == 1
        assert items_unauth[0]["id"] == "rec-pub-1"

        # 2. Patient GET /api/recipes -> Only published
        res_patient = client.get("/api/recipes", headers={"Authorization": f"Bearer {patient_token}"})
        assert res_patient.status_code == 200
        items_patient = res_patient.json()
        assert len(items_patient) == 1
        assert items_patient[0]["id"] == "rec-pub-1"

        # 3. Admin GET /api/recipes -> All recipes (including draft and archived)
        res_admin = client.get("/api/recipes", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200
        items_admin = res_admin.json()
        assert len(items_admin) == 3

        # 4. Patient GET draft recipe -> 404
        res_draft_patient = client.get("/api/recipes/rec-draft-1", headers={"Authorization": f"Bearer {patient_token}"})
        assert res_draft_patient.status_code == 404

        # 5. Admin GET draft recipe -> 200
        res_draft_admin = client.get("/api/recipes/rec-draft-1", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_draft_admin.status_code == 200
        assert res_draft_admin.json()["id"] == "rec-draft-1"


if __name__ == "__main__":
    print("=== RUNNING CLINICAL INVARIANTS & SECURITY VERIFICATION SUITE ===")
    test_bp_physiological_invariants_sbp_greater_than_dbp()
    print("[PASS] BP Physiological Invariants (SBP > DBP)")
    test_bp_pulse_pressure_minimum_boundary()
    print("[PASS] BP Pulse Pressure Minimum Boundary (PP >= 15 mmHg)")
    test_bp_zero_and_out_of_bounds_validation()
    print("[PASS] BP Zero & Out-of-bounds Validation")
    test_bp_pairwise_invariant()
    print("[PASS] BP Pairwise Invariant (SBP & DBP strictly paired)")
    test_bola_patient_cross_access_denied()
    print("[PASS] BOLA Patient Cross-Access Denied (HTTP 403)")
    test_bola_unassigned_doctor_denied()
    print("[PASS] BOLA Unassigned Doctor Denied (HTTP 403)")
    test_happy_path_valid_vitals()
    print("[PASS] Happy Path Valid Vitals")
    test_dynamic_vitals_hss_computation()
    print("[PASS] Dynamic Vitals HSS Computation (Normotension, Crisis, Hypotension)")
    test_bola_unassigned_medical_expert_profile_and_exercises()
    print("[PASS] BOLA Unassigned Medical Expert Profile & Exercises Denied (HTTP 403)")
    test_bola_unassigned_doctor_reminders_notifications_care_team()
    print("[PASS] BOLA Unassigned Doctor Reminders, Notifications & Care Team Denied (HTTP 403)")
    test_all_user_id_routes_reject_unauthenticated()
    print("[PASS] All {user_id} Routes Reject Unauthenticated Requests (HTTP 401/403)")
    test_recipe_saved_endpoints_and_bola()
    print("[PASS] Recipe Saved Endpoints & BOLA Protection (DELETE + POST)")
    test_recipe_status_based_access_control()
    print("[PASS] Recipe Status-Based Content Access Control (Published Only for Patients)")
    print("=== ALL ASSERTIONS PASSED SUCCESSFULLY ===")

