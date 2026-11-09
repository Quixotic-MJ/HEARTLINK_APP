from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api import feedback_api
from app.main import app
from app.utils import security

TICKET_ID = "44444444-4444-4444-4444-444444444444"
REVISION = "2026-11-08T01:00:00+00:00"


@pytest.fixture
def support(monkeypatch):
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    profile = {"id": "synthetic-admin", "role": "admin", "account_status": "active"}
    class Tickets:
        def __init__(self):
            self.row = {"id": TICKET_ID, "ticketId": "FB-1001", "status": "Open",
                        "adminNotes": "Initial internal note", "updated_at": REVISION}
            self.writes = []
            self.race = False
        def list_tickets(self):
            return [dict(self.row)]
        def get_ticket(self, _id):
            return dict(self.row)
        def update_ticket(self, ticket_id, data, expected_updated_at=None):
            self.writes.append((ticket_id, data, expected_updated_at))
            if self.race:
                return None
            self.row.update(data, updated_at="2026-11-08T02:00:00+00:00")
            return dict(self.row)
    tickets = Tickets()
    profiles = SimpleNamespace(get_by_id=lambda _uid: dict(profile))
    monkeypatch.setattr(security, "get_profile_repo", lambda: profiles)
    monkeypatch.setattr(feedback_api, "get_profile_repo", lambda: profiles)
    monkeypatch.setattr(feedback_api, "get_feedback_repo", lambda: tickets)
    recorded = []
    monkeypatch.setattr(feedback_api, "record_admin_activity", lambda **fields: recorded.append(fields))
    token = lambda role=None: security.create_access_token({"user_id": profile["id"], "role": role or profile["role"]})
    try:
        yield TestClient(app), token, profile, tickets, recorded
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)


def test_ticket_save_requires_the_opened_revision(support):
    client, token, _, tickets, _ = support
    response = client.put(f"/api/feedback/{TICKET_ID}", headers={"Authorization": "Bearer " + token()},
                          json={"status": "Resolved", "adminNotes": "Synthetic internal note"})
    assert response.status_code == 422
    assert tickets.writes == []


def test_ticket_update_uses_canonical_id_and_expected_revision(support):
    client, token, _, tickets, recorded = support
    response = client.put("/api/feedback/FB-1001", headers={"Authorization": "Bearer " + token()},
                          json={"status": "In Progress", "adminNotes": "Synthetic internal note", "expectedUpdatedAt": REVISION})
    assert response.status_code == 200
    assert tickets.writes == [(TICKET_ID, {"status": "In Progress", "adminNotes": "Synthetic internal note"}, REVISION)]
    assert "Synthetic internal note" not in str(recorded)


@pytest.mark.parametrize("race", [False, True])
def test_stale_or_racing_ticket_update_does_not_overwrite_notes(support, race):
    client, token, _, tickets, recorded = support
    tickets.race = race
    revision = REVISION if race else "2026-11-07T01:00:00+00:00"
    response = client.put(f"/api/feedback/{TICKET_ID}", headers={"Authorization": "Bearer " + token()},
                          json={"adminNotes": "Stale edit", "expectedUpdatedAt": revision})
    assert response.status_code == 409
    assert tickets.row["adminNotes"] == "Initial internal note"
    assert recorded == []


def test_cookie_ticket_write_requires_csrf(support):
    client, token, _, tickets, _ = support
    response = client.put(f"/api/feedback/{TICKET_ID}", headers={"Cookie": f"{security.AUTH_COOKIE_NAME}={token()}"},
                          json={"status": "Resolved", "expectedUpdatedAt": REVISION})
    assert response.status_code == 403
    assert tickets.writes == []


def test_status_only_update_retains_older_long_internal_notes(support):
    client, token, _, tickets, _ = support
    tickets.row["adminNotes"] = "Synthetic legacy note " * 250
    response = client.put(f"/api/feedback/{TICKET_ID}", headers={"Authorization": "Bearer " + token()},
                          json={"status": "Archived", "expectedUpdatedAt": REVISION})
    assert response.status_code == 200
    assert response.json()["adminNotes"] == "Synthetic legacy note " * 250
    assert tickets.writes[0][1] == {"status": "Archived"}


@pytest.mark.parametrize("state", ["temporary-password", "stale-role", "expert"])
def test_support_inbox_uses_current_staff_security_guards(support, state):
    client, token, profile, _, _ = support
    if state == "temporary-password":
        profile["must_change_password"] = True
    elif state == "expert":
        profile.update(role="medical_expert", expert_type="Dietitian")
    stale_role = "patient" if state == "stale-role" else None
    assert client.get("/api/feedback/", headers={"Authorization": "Bearer " + token(stale_role)}).status_code == 403
