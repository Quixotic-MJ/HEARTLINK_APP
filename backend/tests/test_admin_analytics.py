import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.utils.security import get_current_admin_user, get_current_user


@pytest.fixture(autouse=True)
def isolated_overrides():
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "mock-patient-id", "user_id": "mock-patient-id", "role": "patient"
    }
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)


def test_admin_dashboard_authorization_non_admin():
    client = TestClient(app)
    app.dependency_overrides[get_current_admin_user] = lambda: {"role": "patient"}
    assert client.get("/api/admin/dashboard").status_code == 403
    app.dependency_overrides.pop(get_current_admin_user)
    assert client.get("/api/admin/dashboard").status_code in (401, 403)


@patch("app.api.analytics_api.analytics_api.get_analytics")
def test_analytics_date_filtering(mock_get_analytics):
    # The consumer's own mobile analytics contract is separate from portal reporting.
    mock_get_analytics.return_value = {"history": [], "vitals": []}
    response = TestClient(app).get("/api/analytics/mock-patient-id?days=30")
    assert response.status_code == 200
    assert response.json() == {"history": [], "vitals": []}
    mock_get_analytics.assert_called_once_with("mock-patient-id", days=30)
