# backend/test_admin_activity.py
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import get_current_admin_user
import app.mock_db as mock_db
from datetime import datetime

client = TestClient(app)

# Helper to override dependency
def mock_admin():
    return {"user_id": "usr-chief-admin-001", "role": "admin"}

def mock_expert():
    return {"user_id": "usr-expert-201", "role": "medical_expert"}

def run_tests():
    # Override authentication dependency to simulate admin user
    app.dependency_overrides[get_current_admin_user] = mock_admin

    # Clear current admin activity
    mock_db.admin_activity.clear()
    mock_db.save_logs()

    print("--- Running Admin Activity Log Tests ---")

    # Test 1: Recipe Actions
    print("Testing recipe creation...")
    recipe_data = {
        "name": "Heart-Healthy Oatmeal",
        "category": "Breakfast",
        "hssTarget": "Stable",
        "sodium": 20,
        "calories": 200,
        "satFat": 0.2,
        "cholesterol": 0,
        "fiber": 5,
        "status": "published",
        "expertValidated": True,
        "mediaUrl": "https://storage.provider/oats.jpg",
        "instructions": "Boil oats in water.",
        "ingredients": ["Oats", "Water"]
    }
    r = client.post("/api/recipes/", json=recipe_data)
    assert r.status_code == 200, f"Failed: {r.text}"
    recipe_id = r.json()["id"]

    assert len(mock_db.admin_activity) == 1
    assert mock_db.admin_activity[-1]["action"] == "created"
    assert mock_db.admin_activity[-1]["target_type"] == "recipe"
    assert mock_db.admin_activity[-1]["target_name"] == "Heart-Healthy Oatmeal"
    print("Recipe creation test passed!")

    print("Testing recipe update...")
    # Override auth with Admin B (expert) to test multi-identity logging
    app.dependency_overrides[get_current_admin_user] = mock_expert

    update_data = {
        "name": "Oatmeal with Blueberries",
        "category": "Breakfast",
        "hssTarget": "Stable",
        "sodium": 20,
        "calories": 250,
        "satFat": 0.2,
        "cholesterol": 0,
        "fiber": 8,
        "status": "published",
        "expertValidated": True,
        "mediaUrl": "https://storage.provider/oats.jpg",
        "instructions": "Boil oats in water, top with berries.",
        "ingredients": ["Oats", "Water", "Blueberries"]
    }
    r = client.put(f"/api/recipes/{recipe_id}", json=update_data)
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 2
    assert mock_db.admin_activity[-1]["action"] == "updated"
    assert mock_db.admin_activity[-1]["target_name"] == "Oatmeal with Blueberries"
    assert mock_db.admin_activity[-1]["admin_user_id"] == "usr-expert-201"
    assert mock_db.admin_activity[-1]["admin_name"] == "Dr. Maria Santos"
    print("Recipe update test passed!")

    # Restore Admin A (chief admin) auth
    app.dependency_overrides[get_current_admin_user] = mock_admin

    print("Testing recipe deletion...")
    r = client.delete(f"/api/recipes/{recipe_id}")
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 3
    assert mock_db.admin_activity[-1]["action"] == "deleted"
    assert mock_db.admin_activity[-1]["target_name"] == "Oatmeal with Blueberries"
    print("Recipe deletion test passed!")

    # Test 2: Exercise Actions
    print("Testing exercise routine creation...")
    routine_data = {
        "name": "Morning Cardio Stretch",
        "description": "Light aerobic activity.",
        "duration": 15,
        "hssTarget": "Stable",
        "type": "Stretch",
        "intensity": "Low",
        "goal": "Warm up",
        "steps": [{"instruction": "Reach high", "duration_seconds": 60}],
        "status": "published",
        "expertValidated": True
    }
    r = client.post("/api/exercises/", json=routine_data)
    assert r.status_code == 200, f"Failed: {r.text}"
    routine_id = r.json()["id"]
    assert len(mock_db.admin_activity) == 4
    assert mock_db.admin_activity[-1]["action"] == "created"
    assert mock_db.admin_activity[-1]["target_type"] == "exercise"
    assert mock_db.admin_activity[-1]["target_name"] == "Morning Cardio Stretch"
    print("Exercise creation test passed!")

    print("Testing exercise routine update...")
    r = client.put(f"/api/exercises/{routine_id}", json={"name": "Evening Calm Stretch"})
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 5
    assert mock_db.admin_activity[-1]["action"] == "updated"
    assert mock_db.admin_activity[-1]["target_name"] == "Evening Calm Stretch"
    print("Exercise update test passed!")

    print("Testing exercise routine deletion...")
    r = client.delete(f"/api/exercises/{routine_id}")
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 6
    assert mock_db.admin_activity[-1]["action"] == "deleted"
    assert mock_db.admin_activity[-1]["target_name"] == "Evening Calm Stretch"
    print("Exercise deletion test passed!")

    # Test 3: Broadcast Actions
    print("Testing broadcast publishing...")
    broadcast_data = {
        "message": "Exercise regularly!",
        "type": "Weekly Tip",
        "targetAudience": "All Registered Accounts"
    }
    r = client.post("/api/admin/broadcasts", json=broadcast_data)
    assert r.status_code == 200, f"Failed: {r.text}"
    broadcast_id = r.json()["data"]["id"]
    assert len(mock_db.admin_activity) == 7
    assert mock_db.admin_activity[-1]["action"] == "published"
    assert mock_db.admin_activity[-1]["target_type"] == "broadcast"
    assert mock_db.admin_activity[-1]["target_name"] == "Weekly Tip"
    print("Broadcast publishing test passed!")

    print("Testing broadcast deletion...")
    r = client.delete(f"/api/admin/broadcasts/{broadcast_id}")
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 8
    assert mock_db.admin_activity[-1]["action"] == "deleted"
    assert mock_db.admin_activity[-1]["target_type"] == "broadcast"
    assert mock_db.admin_activity[-1]["target_name"] == "Weekly Tip"
    print("Broadcast deletion test passed!")

    # Test 4: Case Evaluations
    print("Testing case evaluation...")
    app.dependency_overrides[get_current_admin_user] = mock_expert
    eval_payload = {
        "expert_hss_score": 85,
        "notes": "Doing well.",
        "recommendation_feedback": "Looks good."
    }
    patient_id = "usr-patient-101"
    # Ensure there isn't an existing evaluation to test "evaluated"
    mock_db.expert_evaluations = [e for e in mock_db.expert_evaluations if e["user_id"] != patient_id]
    r = client.post(f"/api/admin/cases/{patient_id}/evaluate", json=eval_payload)
    assert r.status_code == 200, f"Failed: {r.text}"
    eval_obj = r.json()["evaluation"]
    eval_id = eval_obj["id"]
    assert len(mock_db.admin_activity) == 9
    assert mock_db.admin_activity[-1]["action"] == "evaluated"
    assert mock_db.admin_activity[-1]["target_type"] == "case"
    assert mock_db.admin_activity[-1]["target_name"].startswith("CASE-")
    print("Case evaluation creation test passed!")

    print("Testing case evaluation update...")
    # Update evaluation
    eval_payload["expert_hss_score"] = 80
    r = client.post(f"/api/admin/cases/{patient_id}/evaluate", json=eval_payload)
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 10
    assert mock_db.admin_activity[-1]["action"] == "updated"
    print("Case evaluation update test passed!")

    print("Testing evaluation archive...")
    r = client.put(f"/api/admin/evaluations/{eval_id}/archive")
    assert r.status_code == 200, f"Failed: {r.text}"
    assert len(mock_db.admin_activity) == 11
    assert mock_db.admin_activity[-1]["action"] == "archived"
    print("Case evaluation archive test passed!")

    # Test 5: Unauthorized Access
    print("Testing unauthorized mutations...")
    def mock_unauthorized():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access Denied")

    app.dependency_overrides[get_current_admin_user] = mock_unauthorized
    # Try deleting a non-existent recipe - should fail with 403 before logging anything
    r = client.delete("/api/recipes/some-id")
    assert r.status_code == 403
    # Verify no new activity was logged
    assert len(mock_db.admin_activity) == 11
    print("Unauthorized access protection test passed!")

    # Restore admin auth override
    app.dependency_overrides[get_current_admin_user] = mock_admin

    # Test 6: Dashboard API Ordering
    print("Testing dashboard activity format and ordering...")
    r = client.get("/api/admin/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "recent_activity" in data
    recent = data["recent_activity"]
    assert len(recent) <= 10
    # First item should be the newest (which is archived CASE evaluation)
    assert recent[0]["action"] == "archived"
    assert recent[0]["target_type"] == "case"
    # Verify presence of admin_name and admin_user_id
    assert "admin_name" in recent[0]
    assert "admin_user_id" in recent[0]
    assert recent[0]["admin_user_id"] == "usr-chief-admin-001"
    assert recent[0]["admin_name"] == "System Admin"
    print("Dashboard activity integration and ordering test passed!")

    # Test 7: Persistence Reload
    print("Testing persistence save/load...")
    mock_db.save_logs()
    # Clear the global list and call load_logs
    mock_db.admin_activity.clear()
    assert len(mock_db.admin_activity) == 0
    mock_db.load_logs()
    # It should have loaded our logs back
    assert len(mock_db.admin_activity) == 11
    assert mock_db.admin_activity[-1]["action"] == "archived"
    print("Persistence load/save test passed!")

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
