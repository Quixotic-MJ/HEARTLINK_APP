"""HL-073: the reason an admin gives when disabling an account is saved, logged, and cleared on enable."""
import pytest
from fastapi.testclient import TestClient

from app.api.admin_api import admin_api
from app.main import app
from app.utils.security import get_current_admin_only

client = TestClient(app)


class FakeProfiles:
    def __init__(self):
        self.rows = {"p1": {"id": "p1", "role": "patient", "account_status": "active", "first_name": "Ana"}}

    def get_by_id(self, user_id):
        return dict(self.rows[user_id]) if user_id in self.rows else None

    def update_profile(self, user_id, data):
        self.rows[user_id].update(data)
        return self.rows[user_id]


@pytest.fixture
def profiles(monkeypatch):
    fake = FakeProfiles()
    logged = []
    monkeypatch.setattr(admin_api, "get_profile_repo", lambda: fake)
    monkeypatch.setattr(admin_api, "record_admin_activity", lambda **k: logged.append(k))
    app.dependency_overrides[get_current_admin_only] = lambda: {"user_id": "admin-1", "role": "admin"}
    yield fake, logged
    app.dependency_overrides.pop(get_current_admin_only, None)


def toggle(body=None):
    return client.put("/api/admin/users/p1/status", json=body)


def test_disabling_saves_and_logs_the_reason(profiles):
    fake, logged = profiles
    assert toggle({"reason": "  Policy violation  "}).status_code == 200
    assert fake.rows["p1"]["account_status"] == "disabled"
    assert fake.rows["p1"]["deactivation_reason"] == "Policy violation"
    assert logged[-1]["action"] == "disabled user account (reason: Policy violation)"


def test_enabling_clears_the_reason(profiles):
    fake, logged = profiles
    toggle({"reason": "User request"})
    assert toggle({"reason": "ignored on enable"}).status_code == 200
    assert fake.rows["p1"]["account_status"] == "active"
    assert fake.rows["p1"]["deactivation_reason"] is None
    assert logged[-1]["action"] == "activated user account"


def test_a_status_change_without_a_reason_still_works(profiles):
    fake, _ = profiles
    assert toggle().status_code == 200  # older callers (staff screens) send no body
    assert fake.rows["p1"]["account_status"] == "disabled"
    assert fake.rows["p1"]["deactivation_reason"] is None


def test_very_long_reasons_are_cut(profiles):
    fake, _ = profiles
    toggle({"reason": "x" * 500})
    assert len(fake.rows["p1"]["deactivation_reason"]) == admin_api.DEACTIVATION_REASON_MAX
