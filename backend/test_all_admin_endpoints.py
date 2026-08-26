# backend/test_all_admin_endpoints.py
"""
Complete Web Admin, Medical Expert, and Feedback test suite against live Supabase backend.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("TESTING ALL ADMIN, EXPERT & FEEDBACK ENDPOINTS (LIVE SUPABASE)")
    print("=" * 60)

    # Valid users in Supabase
    super_admin_id = "bb2cdcda-abb7-56ed-ab86-f82c93e6555e"
    admin_id = "c584cc4a-7abc-5f4b-aad4-dea99799ef00"
    expert_id = "7e848bb9-5182-573a-b764-ed0e382e21bd"
    patient_id = "5b79eae7-bb6d-4ced-aa25-168eed400094"

    super_admin_token = create_access_token(data={"user_id": super_admin_id, "role": "super_admin"})
    super_admin_headers = {"Authorization": f"Bearer {super_admin_token}"}

    expert_token = create_access_token(data={"user_id": expert_id, "role": "medical_expert"})
    expert_headers = {"Authorization": f"Bearer {expert_token}"}

    patient_token = create_access_token(data={"user_id": patient_id, "role": "patient"})
    patient_headers = {"Authorization": f"Bearer {patient_token}"}

    endpoints = [
        ("GET", "/api/admin/dashboard", super_admin_headers),
        ("GET", "/api/admin/analytics", super_admin_headers),
        ("GET", "/api/admin/staff", super_admin_headers),
        ("GET", "/api/admin/activity", super_admin_headers),
        ("GET", "/api/admin/broadcasts", super_admin_headers),
        ("GET", "/api/admin/notifications", super_admin_headers),
        ("GET", "/api/feedback/", super_admin_headers),
        ("GET", "/api/admin/cases", super_admin_headers),
        ("GET", "/api/admin/evaluations", super_admin_headers),
        ("GET", "/api/admin/calibration/metrics", super_admin_headers),
        ("GET", "/api/admin/datasets", super_admin_headers),
        ("GET", "/api/admin/models", super_admin_headers),
        ("GET", "/api/expert/cases", expert_headers),
        ("GET", "/api/expert/evaluations", expert_headers),
        ("GET", "/api/expert/calibration/metrics", expert_headers),
        ("GET", "/api/expert/datasets", expert_headers),
        ("GET", "/api/expert/models", expert_headers),
    ]

    all_passed = True
    for method, path, headers in endpoints:
        resp = client.get(path, headers=headers)
        if resp.status_code == 200:
            print(f"[OK]   {method} {path} (200 OK)")
        else:
            print(f"[FAIL] {method} {path} ({resp.status_code}): {resp.text}")
            all_passed = False

    # Test submitting feedback as patient
    fb_payload = {
        "category": "Bug Report",
        "fullMessage": "Supabase live migration feedback test ticket.",
        "deviceMeta": {"os": "Android 14", "model": "Pixel 8", "appVersion": "1.0.0"},
        "userId": patient_id
    }
    fb_resp = client.post("/api/feedback/", json=fb_payload, headers=patient_headers)
    if fb_resp.status_code == 200:
        print("[OK]   POST /api/feedback/ (200 OK)")
    else:
        print(f"[FAIL] POST /api/feedback/ ({fb_resp.status_code}): {fb_resp.text}")
        all_passed = False

    print("=" * 60)
    if all_passed:
        print("ALL WEB ADMIN, EXPERT & FEEDBACK ENDPOINTS PASSED SUCCESSFULLY!")
    else:
        print("SOME ADMIN ENDPOINTS FAILED.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
