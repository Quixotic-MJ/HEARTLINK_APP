import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from app.services.dashboard import get_7_day_wrap_up_data
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

from app.utils.security import get_current_user
def override_get_current_user():
    return {"user_id": "test-user", "role": "patient"}

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture
def mock_dashboard_repos():
    with patch("app.services.dashboard.get_profile_repo") as mock_prof, \
         patch("app.services.dashboard.get_health_logs_repo") as mock_logs, \
         patch("app.services.dashboard.get_meals_repo") as mock_meals, \
         patch("app.services.dashboard.get_exercises_repo") as mock_ex, \
         patch("app.services.dashboard.get_sleep_repo") as mock_sleep, \
         patch("app.services.dashboard.get_hss_repo") as mock_hss, \
         patch("app.services.dashboard.get_content_repo") as mock_content, \
         patch("app.services.dashboard.get_baseline_repo") as mock_base, \
         patch("app.services.dashboard.get_notification_repo") as mock_notif:
         
         mock_prof.return_value.get_by_id.return_value = {"id": "test-user", "first_name": "Test", "last_name": "User"}
         mock_base.return_value.get_baseline.return_value = {}
         mock_base.return_value.get_thresholds.return_value = {}
         mock_hss.return_value.list_hss_history.return_value = []
         
         yield mock_logs


def test_symptom_lock_re_activates(mock_dashboard_repos):
    """
    Test Case 1: A user logs severe chest pain, then logs it again 
    (a NEW severe symptom) after already clearing the first lock 
    — confirm the lock re-activates.
    """
    mock_logs = mock_dashboard_repos
    now = datetime.utcnow()
    
    # Logs are returned in descending order (newest first)
    mock_logs.return_value.list_user_logs.return_value = [
        # NEW severe symptom 2 hours ago
        {"id": "log-3", "logged_at": (now - timedelta(hours=2)).isoformat() + "Z", "symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 8}, "context": "resting"},
        # Manual clear 5 hours ago
        {"id": "log-2", "logged_at": (now - timedelta(hours=5)).isoformat() + "Z", "context": "symptom_lock_cleared"},
        # OLD severe symptom 10 hours ago
        {"id": "log-1", "logged_at": (now - timedelta(hours=10)).isoformat() + "Z", "symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 8}, "context": "resting"}
    ]
    
    response = client.get("/api/dashboard/me")
    assert response.status_code == 200
    assert response.json()["has_recent_severe_symptom"] is True


def test_symptom_lock_auto_expires_24_hours(mock_dashboard_repos):
    """
    Test Case 2: A user logs a severe symptom and does nothing (no manual clear) 
    — confirm the lock still auto-expires after 24 hours.
    """
    mock_logs = mock_dashboard_repos
    now = datetime.utcnow()
    
    mock_logs.return_value.list_user_logs.return_value = [
        # Severe symptom exactly 25 hours ago
        {"id": "log-1", "logged_at": (now - timedelta(hours=25)).isoformat() + "Z", "symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 8}, "context": "resting"}
    ]
    
    response = client.get("/api/dashboard/me")
    assert response.status_code == 200
    assert response.json()["has_recent_severe_symptom"] is False
