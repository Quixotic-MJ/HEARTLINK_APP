import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

# We need to mock get_current_user to bypass authentication
from app.utils.security import get_current_user

def override_get_current_user():
    return {"user_id": "test-user", "role": "patient"}

@pytest.fixture(autouse=True)
def mock_auth():
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def mock_repos():
    with patch("app.api.health_logs.health_logs.create_health_log", return_value={"id": "log-1", "logged_at": "2026-09-17T00:00:00Z"}) as mock_create, \
         patch("app.db.repositories.get_hss_repo") as mock_hss_repo, \
         patch("app.db.repositories.get_health_logs_repo") as mock_health_logs_repo:
        
        mock_hss = MagicMock()
        mock_hss_repo.return_value = mock_hss
        
        mock_alerts = MagicMock()
        mock_health_logs_repo.return_value = mock_alerts
        
        yield mock_create, mock_hss, mock_alerts

def test_normal_vitals_logging(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    payload = {
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "heart_rate_bpm": 70,
        "weight_kg": 75,
        "symptoms": ["None (Feeling fine)"],
        "context": "resting"
    }
    
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify health log creation
    mock_create.assert_called_once()
    
    # Verify HSS creation because BP was provided
    mock_hss.create_hss_record.assert_called_once()
    hss_args = mock_hss.create_hss_record.call_args[0]
    assert hss_args[0] == "test-user"
    assert hss_args[1]["contributing_factors"]["systolic"] == 120
    assert hss_args[1]["contributing_factors"]["diastolic"] == 80
    
    # Verify NO alerts created (normal BP, no severe symptoms)
    mock_alerts.create_alert.assert_not_called()


def test_incomplete_submission_no_bp(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    payload = {
        "weight_kg": 75,
        "symptoms": ["Fatigue / Weakness"],
        "severity_map": {"Fatigue / Weakness": 3}
    }
    
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    
    # Verify health log creation
    mock_create.assert_called_once()
    
    # Verify NO HSS creation because NO BP was provided
    mock_hss.create_hss_record.assert_not_called()
    
    # Verify NO alerts created
    mock_alerts.create_alert.assert_not_called()


def test_severe_symptom_emergency_trigger(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    # Scenario: Shortness of Breath while resting
    payload = {
        "symptoms": ["Shortness of Breath"],
        "context": "While resting"
    }
    
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    
    mock_alerts.create_alert.assert_called_once()
    alert_args = mock_alerts.create_alert.call_args[0][0]
    assert alert_args["user_id"] == "test-user"
    assert alert_args["alert_type"] == "Severe Symptoms"
    assert "Shortness of Breath at rest" in alert_args["details"]
    assert alert_args["severity"] == "critical"
    
    # Scenario: Severe Chest Pain (>= 7)
    mock_alerts.create_alert.reset_mock()
    payload = {
        "symptoms": ["Chest Discomfort / Tightness"],
        "severity_map": {"Chest Discomfort / Tightness": 8},
        "context": "after_exercise"
    }
    
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    mock_alerts.create_alert.assert_called_once()
    alert_args = mock_alerts.create_alert.call_args[0][0]
    assert "Severe Chest Discomfort (Level 8/10)" in alert_args["details"]


def test_clinical_validation_invalid_bp(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    # Scenario 1: Systolic <= Diastolic
    payload = {
        "systolic_bp": 110,
        "diastolic_bp": 120
    }
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 422
    assert "strictly greater than diastolic" in response.json()["detail"]
    
    # Scenario 2: Pulse Pressure < 15
    payload = {
        "systolic_bp": 120,
        "diastolic_bp": 110
    }
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 422
    assert "Pulse pressure" in response.json()["detail"]
    
    # Scenario 3: Only one BP component provided
    payload = {
        "systolic_bp": 120,
    }
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 422
    assert "include both systolic and diastolic" in response.json()["detail"]
    
    # Verify no logs or alerts were created due to validations failing
    mock_create.assert_not_called()
    mock_hss.create_hss_record.assert_not_called()
    mock_alerts.create_alert.assert_not_called()

def test_heart_rate_alerts(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    # Severe Tachycardia
    payload = {"heart_rate_bpm": 125}
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    mock_alerts.create_alert.assert_called_once()
    assert mock_alerts.create_alert.call_args[0][0]["alert_type"] == "Severe Tachycardia"
    
    mock_alerts.create_alert.reset_mock()
    
    # Severe Bradycardia
    payload = {"heart_rate_bpm": 45}
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    mock_alerts.create_alert.assert_called_once()
    assert mock_alerts.create_alert.call_args[0][0]["alert_type"] == "Severe Bradycardia"

def test_rapid_weight_gain_alert(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    
    mock_alerts.list_user_logs.return_value = [
        {"id": "log-day-2", "weight_kg": 70.5, "logged_at": (now - timedelta(days=1)).isoformat() + "Z"},
        {"id": "log-day-1", "weight_kg": 70.0, "logged_at": (now - timedelta(days=2)).isoformat() + "Z"}
    ]
    
    payload = {"weight_kg": 72.0}
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    
    mock_alerts.create_alert.assert_called_once()
    alert_args = mock_alerts.create_alert.call_args[0][0]
    assert alert_args["alert_type"] == "Rapid Weight Gain"
    assert "1.50 kg" in alert_args["details"]

def test_rapid_weight_gain_ignores_old_logs(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    
    mock_alerts.list_user_logs.return_value = [
        {"id": "log-day-1", "weight_kg": 70.0, "logged_at": (now - timedelta(days=4)).isoformat() + "Z"}
    ]
    
    payload = {"weight_kg": 72.0}
    response = client.post("/api/health-logs/test-user", json=payload)
    assert response.status_code == 200
    
    mock_alerts.create_alert.assert_not_called()

def test_clear_symptom_lock_endpoint(mock_repos):
    mock_create, mock_hss, mock_alerts = mock_repos
    
    response = client.post("/api/health-logs/test-user/clear-symptom-lock")
    assert response.status_code == 200
    
    mock_create.assert_called_once()
    assert mock_create.call_args[0][1]["context"] == "symptom_lock_cleared"
