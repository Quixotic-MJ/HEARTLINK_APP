"""General service notices: synthetic HTTP/repository checks, no actual delivery."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.db.repositories.notifications import SupabaseNotificationRepository
from app.utils.security import create_access_token, revoked_token_hashes


NOTICE = {"title": "Service update", "message": "Synthetic maintenance notice.", "type": "Maintenance", "targetAudience": "All Registered Accounts"}
BID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
UID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


@pytest.fixture
def api(monkeypatch):
    state = {"saved": [], "audits": [], "deleted": [], "result": {"id": BID}, "role": "admin"}
    profile = lambda uid: {"id": uid, "role": state["role"], "account_status": "active", "first_name": "Synthetic"}
    def save(payload):
        state["saved"].append(payload)
        return state["result"]
    repo = SimpleNamespace(create_broadcast=save, list_broadcasts=lambda: [{"id": BID, "title": "Service update", "message": "Synthetic", "publisher_id": "staff-private"}], delete_broadcast=lambda bid: state["deleted"].append(bid) or True)
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: SimpleNamespace(get_by_id=profile))
    monkeypatch.setattr("app.api.admin_api.admin_api.get_profile_repo", lambda: SimpleNamespace(get_by_id=profile))
    monkeypatch.setattr("app.api.admin_api.admin_api.get_notification_repo", lambda: repo)
    monkeypatch.setattr("app.api.notifications_api.notifications_api.get_notification_repo", lambda: repo)
    monkeypatch.setattr("app.api.admin_api.admin_api.record_admin_activity", lambda **kw: state["audits"].append(kw))
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    headers = lambda role="admin": {"Authorization": "Bearer " + create_access_token({"user_id": "synthetic-staff", "role": role})}
    yield TestClient(app), state, headers
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


@pytest.mark.parametrize("changes", [{"message": "x" * 256}, {"title": 42}, {"target_user_ids": [UID]}, {"targetAudience": "High risk"}, {"message": "   "}])
def test_invalid_or_targeted_announcements_never_reach_storage(api, changes):
    client, state, headers = api
    response = client.post("/api/admin/broadcasts", headers=headers(), json={**NOTICE, **changes})
    assert response.status_code == 422
    assert state["saved"] == []


def test_publish_needs_a_confirmed_record_and_never_fabricates_success(api):
    client, state, headers = api
    state["result"] = {}
    assert client.post("/api/admin/broadcasts", headers=headers(), json=NOTICE).status_code == 500
    assert state["audits"] == []


def test_published_notices_are_retained_not_falsely_recalled(api):
    client, state, headers = api
    assert client.delete(f"/api/admin/broadcasts/{BID}", headers=headers()).status_code == 410
    assert state["deleted"] == []


def test_mobile_broadcast_list_requires_auth_and_hides_staff_metadata(api):
    client, state, headers = api
    assert client.get("/api/notifications/broadcasts").status_code == 401
    state["role"] = "patient"
    response = client.get("/api/notifications/broadcasts", headers=headers("patient"))
    assert response.status_code == 200
    assert "publisher_id" not in response.json()[0]


class Query:
    def __init__(self, client, table):
        self.client, self.table = client, table
        self.start, self.end, self.payload = 0, 499, None
    def select(self, columns):
        self.client.projections.append((self.table, columns))
        return self
    def order(self, *args, **kwargs): return self
    def range(self, start, end):
        self.start, self.end = start, end
        return self
    def insert(self, payload):
        self.payload = payload
        return self
    def execute(self):
        if self.payload is None:
            if self.client.read_failure: raise RuntimeError("Synthetic read failure")
            return SimpleNamespace(data=self.client.rows[self.start:self.end + 1])
        self.client.writes.append((self.table, self.payload))
        if self.table == "system_broadcasts":
            return SimpleNamespace(data=[] if self.client.save_failure else [{**self.payload, "id": BID}])
        if self.client.fanout_failure: raise RuntimeError("Synthetic fanout failure")
        return SimpleNamespace(data=self.payload)


class Client:
    def __init__(self):
        self.rows = [{"id": UID, "role": "patient", "account_status": "active"}]
        self.writes, self.projections = [], []
        self.read_failure = self.save_failure = self.fanout_failure = False
    def table(self, table): return Query(self, table)


@pytest.fixture
def storage(monkeypatch):
    client, pushed = Client(), []
    monkeypatch.setattr("app.services.push.send_push", lambda *args, **kwargs: pushed.append(args))
    return client, SupabaseNotificationRepository(client), pushed


def test_recipient_selection_is_paginated_minimal_and_active_app_accounts_only(storage):
    client, repo, pushed = storage
    client.rows = [{"id": f"00000000-0000-0000-0000-{i:012d}", "role": "patient", "account_status": "active"} for i in range(1007)]
    client.rows += [{"id": BID, "role": "admin", "account_status": "active"}, {"id": BID, "role": "patient", "account_status": "disabled"}]
    result = repo.create_broadcast({"title": "Service update", "message": "Synthetic", "type": "General"})
    assert result["notifications_recorded"] == 1007
    assert all(columns == "id,role,account_status" for _, columns in client.projections)
    notifications = [row for table, rows in client.writes if table == "patient_notifications" for row in rows]
    assert len(notifications) == 1007
    assert not any(row["user_id"] == BID for row in notifications)
    assert result["notification_status"] == "recorded"
    assert result["push_delivery"] == "unverified"


@pytest.mark.parametrize("failure", ["read_failure", "save_failure"])
def test_failure_before_a_confirmed_save_never_pushes(storage, failure):
    client, repo, pushed = storage
    setattr(client, failure, True)
    with pytest.raises(HTTPException): repo.create_broadcast({"title": "Synthetic", "type": "General"})
    assert pushed == []
    if failure == "read_failure": assert client.writes == []


def test_partial_delivery_returns_saved_record_without_inviting_republish(storage):
    client, repo, pushed = storage
    client.fanout_failure = True
    result = repo.create_broadcast({"title": "Synthetic", "type": "General"})
    assert result["id"] == BID
    assert result["notification_status"] == "unconfirmed"
    assert result["notifications_recorded"] == 0
    assert pushed == []
