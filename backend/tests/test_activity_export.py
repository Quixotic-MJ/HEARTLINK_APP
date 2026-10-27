"""HL-080: exporting the activity log, and reading all of it (past Supabase's 1,000-row limit)."""
import pytest
from fastapi.testclient import TestClient

from app.db.repositories.admin import SupabaseAdminRepository

LOGS = [
    {"id": "1", "admin_user_id": "boss", "admin_name": "Ada", "action": "gave Premium for 30 days", "target_type": "user",
     "target_id": "pat", "target_name": "Ana Cruz", "created_at": "2026-10-27T01:00:00+00:00", "details": {"secret": "x"}},
    {"id": "2", "admin_user_id": "boss", "admin_name": "Ada", "action": "published an announcement", "target_type": "broadcast",
     "target_id": "b1", "target_name": "Clinic hours", "created_at": "2026-10-26T01:00:00+00:00"},
]


class Admin:
    def __init__(self):
        self.calls = []

    def list_activity(self, **filters):
        self.calls.append(filters)
        return [l for l in LOGS if not filters.get("target_type") or l["target_type"] == filters["target_type"]]


class Profiles:
    def get_by_id(self, uid):
        return {"id": uid, "role": {"boss": "admin", "doc": "medical_expert"}[uid], "account_status": "active"}


@pytest.fixture
def api(monkeypatch):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes
    admin = Admin()
    recorded = []
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles())
    monkeypatch.setattr("app.api.admin_api.admin_api.get_admin_repo", lambda: admin)
    monkeypatch.setattr("app.api.admin_api.admin_api.record_admin_activity", lambda **k: recorded.append(k))
    # Other test files override the admin check on the shared app; this one needs the real check
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    as_user = lambda uid, role: {"Authorization": f"Bearer {create_access_token({'user_id': uid, 'role': role})}"}
    yield TestClient(app), as_user, admin, recorded
    app.dependency_overrides.update(saved)


def test_the_export_has_every_matching_entry_and_only_the_log_fields(api):
    client, as_user, admin, recorded = api
    body = client.get("/api/admin/activity/export?target_type=user&search=ana", headers=as_user("boss", "admin")).json()
    assert admin.calls[-1] == {"target_type": "user", "search": "ana"}
    assert body["count"] == 1
    assert body["items"] == [{"created_at": "2026-10-27T01:00:00+00:00", "admin_name": "Ada", "action": "gave Premium for 30 days",
                              "target_type": "user", "target_name": "Ana Cruz", "target_id": "pat"}]
    assert "exported the activity log (1 entries" in recorded[-1]["action"]


def test_only_admins_can_export(api):
    client, as_user, _, _ = api
    assert client.get("/api/admin/activity/export", headers=as_user("doc", "medical_expert")).status_code == 403


class Query:
    """Stands in for a Supabase query on a table of `total` rows."""

    def __init__(self, total, log):
        self.total, self.log, self.start, self.end = total, log, 0, 0

    def select(self, *_):
        return self

    def eq(self, *_):
        return self

    def order(self, *_, **__):
        return self

    def range(self, start, end):
        self.start, self.end = start, end
        return self

    def execute(self):
        self.log.append((self.start, self.end))
        rows = [{"id": str(i), "admin_name": "Ada", "target_name": f"t{i}"} for i in range(self.start, min(self.end + 1, self.total))]
        return type("Res", (), {"data": rows})()


class Client:
    def __init__(self, total):
        self.total, self.log = total, []

    def table(self, _):
        return Query(self.total, self.log)


def test_the_whole_log_is_read_past_1000_rows():
    client = Client(2503)
    items = SupabaseAdminRepository(client).list_activity()
    assert len(items) == 2503
    assert client.log == [(0, 999), (1000, 1999), (2000, 2999)]


def test_a_limit_stops_early():
    client = Client(5000)
    assert len(SupabaseAdminRepository(client).list_activity(limit=10)) == 10
    assert client.log == [(0, 999)]
