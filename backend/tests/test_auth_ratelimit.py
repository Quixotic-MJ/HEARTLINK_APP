import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_rate_limit():
    endpoint = "/api/auth/login"
    payload = {"identifier": "testuser", "password": "wrongpassword"}
    
    # 5 attempts should go through (even if they fail auth, they are processed)
    for _ in range(5):
        response = client.post(endpoint, json=payload)
        # Authentication should fail, returning 400 or 401, not 429
        assert response.status_code != 429

    # The 6th attempt must be rate-limited
    response = client.post(endpoint, json=payload)
    assert response.status_code == 429
    assert "Retry-After" in response.headers
    
    # Ensure no internal data is leaked
    assert "error" in response.json() or "detail" in response.json()

def test_request_code_rate_limit():
    endpoint = "/api/auth/request-code"
    payload = {"phone": "+1234567890", "email": "test@test.com", "password": "wrongpassword"}
    
    # 3 attempts should be allowed
    for _ in range(3):
        response = client.post(endpoint, json=payload)
        assert response.status_code != 429
        
    # The 4th attempt must be rate-limited
    response = client.post(endpoint, json=payload)
    assert response.status_code == 429
    assert "Retry-After" in response.headers

def test_verify_code_rate_limit():
    endpoint = "/api/auth/verify-code"
    payload = {"phone": "+1234567890", "code": "000000"}
    
    # 3 attempts should be allowed
    for _ in range(3):
        response = client.post(endpoint, json=payload)
        assert response.status_code != 429
        
    # The 4th attempt must be rate-limited
    response = client.post(endpoint, json=payload)
    assert response.status_code == 429
    assert "Retry-After" in response.headers
