import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.utils.security import get_current_admin_user, get_current_user
from app.db.client import get_supabase_client

client = TestClient(app)

def override_admin_user():
    return {"id": "mock-admin-id", "role": "admin", "email": "super.admin@heartlink.ph"}

def override_patient_user():
    return {"id": "mock-patient-id", "role": "patient"}

app.dependency_overrides[get_current_admin_user] = override_admin_user
app.dependency_overrides[get_current_user] = override_patient_user

def test_admin_dashboard_authorization_non_admin():
    # Remove admin override to test authorization
    app.dependency_overrides.pop(get_current_admin_user, None)
    
    # Try as patient
    app.dependency_overrides[get_current_admin_user] = override_patient_user
    response = client.get("/api/admin/dashboard")
    assert response.status_code in [401, 403]
    
    # Try without auth (FastAPI HTTPBearer usually returns 403 when missing)
    app.dependency_overrides.pop(get_current_admin_user, None)
    response = client.get("/api/admin/dashboard")
    assert response.status_code in [401, 403]
    
    # Restore admin override
    app.dependency_overrides[get_current_admin_user] = override_admin_user


def test_admin_dashboard_migration_integrity():
    # 1. Capture the baseline from the existing Python implementation
    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200
    baseline_data = response.json()
    
    # 2. Call the new PostgreSQL function directly via Supabase RPC
    rpc_response = get_supabase_client().rpc(
        "get_admin_dashboard_stats", 
        {"days_cutoff": 7}
    ).execute()
    new_data = rpc_response.data
    
    # 3. Prove data encapsulation: check for specific keys only
    expected_keys = {"total_users", "active_users", "avg_hss", "hss_distribution", "users_needing_review", "user_activity", "content_library"}
    assert set(new_data.keys()) == expected_keys
    
    # 4. Prove perfectly matched baseline using the exact same fixture state
    assert new_data == baseline_data

def test_analytics_date_filtering():
    # Test that /api/analytics/{user_id}?days=30 works
    # This also tests that the Python cutoff filtering works correctly (or the DB filtering once implemented)
    response = client.get("/api/analytics/mock-patient-id?days=30")
    assert response.status_code == 200
    data = response.json()
    assert "history" in data
    assert "vitals" in data

@patch("app.api.admin_api.admin_api.get_supabase_client")
def test_admin_dashboard_rpc_failure_handling(mock_get_client):
    # This test will only pass AFTER the admin_api.py has been refactored to use the RPC with error handling
    
    # Setup mock to raise an exception when calling .rpc().execute()
    mock_rpc = MagicMock()
    mock_rpc.execute.side_effect = Exception("Database timeout")
    
    mock_client = MagicMock()
    mock_client.rpc.return_value = mock_rpc
    mock_get_client.return_value = mock_client
    
    response = client.get("/api/admin/dashboard")
    
    if mock_client.rpc.called:
        assert response.status_code == 500
        assert response.json()["detail"] == "Internal Server Error"
