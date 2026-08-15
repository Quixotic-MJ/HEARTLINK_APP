# backend/test_staff_management.py
import unittest
from fastapi.testclient import TestClient
import app.mock_db as mock_db
from app.main import app
from app.utils.security import create_access_token, token_blacklist, get_current_admin_user

class TestStaffManagement(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides.clear()
        self.client = TestClient(app)
        self.original_profiles = [dict(p) for p in mock_db.profiles]
        self.original_activity = [dict(a) for a in mock_db.admin_activity]
        
    def tearDown(self):
        app.dependency_overrides.clear()
        mock_db.profiles.clear()
        mock_db.profiles.extend(self.original_profiles)
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend(self.original_activity)
        token_blacklist.clear()

    def _headers(self, user_id, role):
        token = create_access_token({"user_id": user_id, "role": role})
        return {"Authorization": f"Bearer {token}"}

    # 1. super_admin can list staff
    def test_super_admin_can_list_staff(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        # Ensure only staff accounts returned
        for s in res.json():
            self.assertIn(s["role"], ["System Admin", "Authorized Medical Expert", "Super Admin"])

    # 2. admin receives 403 on staff list
    def test_admin_receives_403_on_staff_list(self):
        headers = self._headers("usr-chief-admin-001", "admin")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 3. medical_expert receives 403
    def test_medical_expert_receives_403_on_staff_list(self):
        headers = self._headers("usr-expert-201", "medical_expert")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 4. patient receives 403
    def test_patient_receives_403_on_staff_list(self):
        headers = self._headers("usr-patient-101", "patient")
        res = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 5. super_admin can create admin
    def test_super_admin_can_create_admin(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        payload = {
            "name": "New Admin User",
            "email": "newadmin@heartlink.ph",
            "phone": "+63 900 000 0055",
            "role": "System Admin"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")
        
        # Verify persisted
        created_id = res.json()["id"]
        created_user = next((p for p in mock_db.profiles if p["id"] == created_id), None)
        self.assertIsNotNone(created_user)
        self.assertEqual(created_user["role"], "admin")

    # 6. super_admin can create medical_expert
    def test_super_admin_can_create_medical_expert(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        payload = {
            "name": "New Expert User",
            "email": "newexpert@heartlink.ph",
            "phone": "+63 900 000 0066",
            "role": "Authorized Medical Expert"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        
        # Verify persisted
        created_id = res.json()["id"]
        created_user = next((p for p in mock_db.profiles if p["id"] == created_id), None)
        self.assertIsNotNone(created_user)
        self.assertEqual(created_user["role"], "medical_expert")

    # 7. admin cannot create staff
    def test_admin_cannot_create_staff(self):
        headers = self._headers("usr-chief-admin-001", "admin")
        payload = {
            "name": "Failed Admin",
            "email": "failedadmin@heartlink.ph",
            "phone": "+63 900 000 0077",
            "role": "System Admin"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 403)

    # 8. medical_expert cannot create staff
    def test_medical_expert_cannot_create_staff(self):
        headers = self._headers("usr-expert-201", "medical_expert")
        payload = {
            "name": "Failed Expert",
            "email": "failedexpert@heartlink.ph",
            "phone": "+63 900 000 0077",
            "role": "Authorized Medical Expert"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 403)

    # 9. patient cannot create staff
    def test_patient_cannot_create_staff(self):
        headers = self._headers("usr-patient-101", "patient")
        payload = {
            "name": "Failed Patient Staff",
            "email": "failedpatient@heartlink.ph",
            "phone": "+63 900 000 0077",
            "role": "System Admin"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 403)

    # 10. duplicate email returns 409
    def test_duplicate_email_returns_409(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        payload = {
            "name": "Duplicate Admin",
            "email": "admin@heartlink.ph", # Already exists
            "phone": "+63 900 000 0088",
            "role": "System Admin"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 409)

    # 11. invalid role returns 400
    def test_invalid_role_returns_400(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        payload = {
            "name": "Invalid Role Admin",
            "email": "invalidrole@heartlink.ph",
            "phone": "+63 900 000 0099",
            "role": "super_admin" # Not allowed
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=headers)
        self.assertEqual(res.status_code, 400)

    # 12. self-disable is rejected
    def test_self_disable_is_rejected(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.put("/api/admin/users/usr-super-admin-001/status", headers=headers)
        self.assertEqual(res.status_code, 400)

    # 13. self-demotion is rejected
    def test_self_demotion_is_rejected(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.put("/api/admin/staff/usr-super-admin-001/role", json={"role": "System Admin"}, headers=headers)
        self.assertEqual(res.status_code, 400)

    # 14. last active super_admin cannot be disabled
    def test_last_active_super_admin_cannot_be_disabled(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        # Find another super_admin to disable or make sure it's the last one
        res = self.client.put("/api/admin/users/usr-super-admin-001/status", headers=headers)
        self.assertEqual(res.status_code, 400) # Self-disable takes priority, but let's test last super admin by having a second super admin disable the first
        
        # Add a temporary second super admin
        second_super = {
            "id": "usr-super-admin-002",
            "role": "super_admin",
            "account_status": "active"
        }
        mock_db.profiles.append(second_super)
        
        # Now usr-super-admin-002 disables usr-super-admin-001 (allowed because not self)
        headers2 = self._headers("usr-super-admin-002", "super_admin")
        res2 = self.client.put("/api/admin/users/usr-super-admin-001/status", headers=headers2)
        self.assertEqual(res2.status_code, 200)
        
        # Now usr-super-admin-001 is disabled, leaving usr-super-admin-002 as the last active super_admin.
        # If usr-super-admin-002 is disabled (by anyone - wait, only super_admin but he cannot self-disable), 
        # let's provision a third super_admin who is active, then disable it.
        # Let's ensure disabling the last active super_admin is rejected.
        third_active = {
            "id": "usr-super-admin-003",
            "role": "super_admin",
            "account_status": "active"
        }
        mock_db.profiles.append(third_active)
        
        # Disable third_active (currently 2 active super admins: 002 and 003) -> Should succeed
        res3 = self.client.put("/api/admin/users/usr-super-admin-003/status", headers=headers2)
        self.assertEqual(res3.status_code, 200)
        
        # Now only usr-super-admin-002 is active. Trying to disable it via headers of disabled super admin (should fail 403 because disabled).
        # What if we use a different active admin? Regular admins cannot disable staff anyway.
        # What if we make usr-super-admin-003 active again and have it try to disable usr-super-admin-002?
        # Let's activate 003 first.
        mock_db.profiles[-1]["account_status"] = "active"
        # Disable 002 using 003's headers. Now 003 is the last active super_admin.
        headers3 = self._headers("usr-super-admin-003", "super_admin")
        res4 = self.client.put("/api/admin/users/usr-super-admin-002/status", headers=headers3)
        self.assertEqual(res4.status_code, 200)
        
        # Now ONLY usr-super-admin-003 is active.
        # Let's create an active super_admin 004, disable it, then check if 003 can be disabled.
        # Trying to disable 003 using 004 (if active):
        fourth_super = {
            "id": "usr-super-admin-004",
            "role": "super_admin",
            "account_status": "active"
        }
        mock_db.profiles.append(fourth_super)
        headers4 = self._headers("usr-super-admin-004", "super_admin")
        
        # usr-super-admin-004 tries to disable usr-super-admin-003 (which is active).
        # This leaves usr-super-admin-004 as the only active super_admin. This should succeed!
        res5 = self.client.put("/api/admin/users/usr-super-admin-003/status", headers=headers4)
        self.assertEqual(res5.status_code, 200)
        
        # Now only usr-super-admin-004 is active.
        # Try disabling usr-super-admin-004 using a disabled super_admin's headers -> should fail with 403 due to disabled state.
        # Wait, the best test for "last active super_admin cannot be disabled" is:
        # If there is only one active super_admin left in mock_db.profiles, and a mock endpoint or bypass tries to disable it:
        # Let's clear other super admins and leave only usr-super-admin-004 active.
        # Since self-disable is always rejected anyway, the last super admin cannot disable itself.
        # If we temporarily override the self-disable check or bypass the API, let's verify the logic:
        # The logic evaluates active_super_admins. Let's make sure it raises 400.
        # We can simulate this by having 04 disable 03 when 03 is the ONLY active super_admin (which should be rejected!).
        # Let's assert it:
        mock_db.profiles.clear()
        mock_db.profiles.extend(self.original_profiles) # Restore original which has only 1 super admin (usr-super-admin-001)
        # Let's add an active second super admin to disable it, but then disable the second one so only 001 is active.
        # Wait, if there is only 1 active super admin (usr-super-admin-001), any attempt to disable it by another super admin (e.g. 002)
        # should fail with 400 because it's the last active super admin!
        second_super = {
            "id": "usr-super-admin-002",
            "role": "super_admin",
            "account_status": "active"
        }
        mock_db.profiles.append(second_super)
        # Now disable usr-super-admin-002 (so 001 is the last active).
        mock_db.profiles[-1]["account_status"] = "disabled"
        # Now try to disable usr-super-admin-001 using usr-super-admin-002's token (wait, 002 is disabled, so its token will be rejected with 403!).
        # So we temporarily make 002 active, then disable 001?
        # Yes! 002 is active, 001 is active. 002 disables 001 -> leaves 002 as the last active. This works.
        # Then, if 001 (now disabled) is activated again -> 2 active.
        # What if 002 tries to disable 001 when 001 is the last active? But if 001 is the last active, 002 is disabled!
        # So 002 cannot make any calls!
        # This is a fascinating logical invariant: if there's only one active super admin, no other super admin is active to make an API call to disable it!
        # But we still test the endpoint logic:
        # If we temporarily override `get_current_admin_user` to return a mock active super admin 002, and try to disable 001 when 001 is the last active:
        def mock_super_admin_active():
            return {"user_id": "usr-super-admin-002", "role": "super_admin"}
        app.dependency_overrides[get_current_admin_user] = mock_super_admin_active
        # Ensure usr-super-admin-001 is the only active super_admin in profiles (002 is disabled in profiles)
        for p in mock_db.profiles:
            if p["id"] == "usr-super-admin-002":
                p["account_status"] = "disabled"
            if p["id"] == "usr-super-admin-001":
                p["account_status"] = "active"
        
        # Call toggle status on 001. It should fail with 400 because 001 is the last active super_admin!
        res_last = self.client.put("/api/admin/users/usr-super-admin-001/status")
        self.assertEqual(res_last.status_code, 400)
        self.assertIn("last active Super Admin", res_last.json()["detail"])

    # 15. last active super_admin cannot be demoted
    def test_last_active_super_admin_cannot_be_demoted(self):
        # Using the same mock override where 002 is active for the API, but in the database 001 is the only active super_admin.
        def mock_super_admin_active():
            return {"user_id": "usr-super-admin-002", "role": "super_admin"}
        app.dependency_overrides[get_current_admin_user] = mock_super_admin_active
        
        # Verify that demoting 001 is rejected since it's the last super admin.
        # Actually, in our change_staff_role implementation, we blocked modifying a super_admin's role entirely!
        # So demoting any super_admin is rejected. This satisfies the invariant!
        res = self.client.put("/api/admin/staff/usr-super-admin-001/role", json={"role": "System Admin"})
        self.assertEqual(res.status_code, 400)

    # 16. admin cannot modify privileged staff
    def test_admin_cannot_modify_privileged_staff(self):
        headers = self._headers("usr-chief-admin-001", "admin")
        # Try disabling a medical expert
        res = self.client.put("/api/admin/users/usr-expert-201/status", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 17. medical_expert cannot modify staff
    def test_medical_expert_cannot_modify_staff(self):
        headers = self._headers("usr-expert-201", "medical_expert")
        # Try disabling an admin
        res = self.client.put("/api/admin/users/usr-chief-admin-001/status", headers=headers)
        self.assertEqual(res.status_code, 403)

    # 18. super_admin can disable staff
    def test_super_admin_can_disable_staff(self):
        headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.put("/api/admin/users/usr-expert-201/status", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["new_status"], "disabled")
        
        # Verify database
        expert = next((p for p in mock_db.profiles if p["id"] == "usr-expert-201"), None)
        self.assertEqual(expert["account_status"], "disabled")

    # 19. disabled staff token becomes unauthorized
    def test_disabled_staff_token_becomes_unauthorized(self):
        # Get active token for expert
        expert_headers = self._headers("usr-expert-201", "medical_expert")
        res_before = self.client.get("/api/admin/dashboard", headers=expert_headers)
        self.assertEqual(res_before.status_code, 200)
        
        # Disable expert
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        self.client.put("/api/admin/users/usr-expert-201/status", headers=super_headers)
        
        # Call with expert token again
        res_after = self.client.get("/api/admin/dashboard", headers=expert_headers)
        self.assertEqual(res_after.status_code, 403)

    # 20. super_admin can re-enable staff
    def test_super_admin_can_re_enable_staff(self):
        # First disable it
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        self.client.put("/api/admin/users/usr-expert-201/status", headers=super_headers)
        
        # Re-enable it
        res = self.client.put("/api/admin/users/usr-expert-201/status", headers=super_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["new_status"], "active")

    # 21. admin -> medical_expert role change works
    def test_admin_to_medical_expert_role_change_works(self):
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        # Change role of usr-chief-admin-001 from admin to medical_expert
        res = self.client.put("/api/admin/staff/usr-chief-admin-001/role", json={"role": "Authorized Medical Expert"}, headers=super_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["new_role"], "medical_expert")
        
        # Verify db
        admin_user = next((p for p in mock_db.profiles if p["id"] == "usr-chief-admin-001"), None)
        self.assertEqual(admin_user["role"], "medical_expert")

    # 22. medical_expert -> admin role change works
    def test_medical_expert_to_admin_role_change_works(self):
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        # Change role of usr-expert-201 from medical_expert to admin
        res = self.client.put("/api/admin/staff/usr-expert-201/role", json={"role": "System Admin"}, headers=super_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["new_role"], "admin")
        
        # Verify db
        expert_user = next((p for p in mock_db.profiles if p["id"] == "usr-expert-201"), None)
        self.assertEqual(expert_user["role"], "admin")

    # 23. role change to super_admin is rejected
    def test_role_change_to_super_admin_is_rejected(self):
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        res = self.client.put("/api/admin/staff/usr-expert-201/role", json={"role": "super_admin"}, headers=super_headers)
        self.assertEqual(res.status_code, 400)

    # 24. exactly one admin_activity event is written per successful mutation
    def test_exactly_one_activity_event_written_per_success(self):
        mock_db.admin_activity.clear()
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        
        payload = {
            "name": "Activity Test Admin",
            "email": "activitytest@heartlink.ph",
            "phone": "+63 900 000 0111",
            "role": "System Admin"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=super_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mock_db.admin_activity), 1)
        self.assertEqual(mock_db.admin_activity[0]["action"], "Created admin account")
        self.assertEqual(mock_db.admin_activity[0]["target_type"], "staff")

    # 25. failed mutations create zero admin_activity events
    def test_failed_mutations_create_zero_activity_events(self):
        mock_db.admin_activity.clear()
        super_headers = self._headers("usr-super-admin-001", "super_admin")
        
        # Try duplicate email (failed mutation)
        payload = {
            "name": "Activity Test Admin",
            "email": "admin@heartlink.ph", # Duplicate
            "phone": "+63 900 000 0111",
            "role": "System Admin"
        }
        res = self.client.post("/api/admin/staff", json=payload, headers=super_headers)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(len(mock_db.admin_activity), 0)

if __name__ == "__main__":
    unittest.main()
