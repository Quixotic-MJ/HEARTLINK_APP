from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import repositories
from app.utils.security import get_current_admin_user, get_current_user


@pytest.fixture
def portal(monkeypatch):
    saved = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_admin_user] = lambda: {"user_id": "synthetic-admin", "role": "admin"}
    app.dependency_overrides[get_current_user] = lambda: app.dependency_overrides[get_current_admin_user]()
    tables = {
        "profiles": [{"role": "patient", "account_status": "active"},
                     {"role": "patient", "account_status": "disabled"},
                     {"role": "admin", "account_status": "active"},
                     {"role": "medical_expert", "account_status": "archived"},
                     {"role": "legacy", "account_status": None}],
        "recipes": [{"status": "draft", "expert_validated": False},
                    {"status": "published", "expert_validated": True, "reviewed_by": "reviewer", "reviewed_at": "2026-11-07"},
                    {"status": "published", "expert_validated": True},
                    {"status": "archived"}],
        "exercise_routines": [{"status": "draft", "review_note": "Revise the instructions"}],
    }

    class Query:
        def __init__(self, table):
            self.rows = tables[table]

        def select(self, columns):
            assert columns != "*", "The overview must not fetch full profiles or content"
            self.columns = columns.split(",")
            return self

        def order(self, *_args, **_kwargs):
            return self

        def range(self, start, end):
            self.start, self.end = start, end
            return self

        def execute(self):
            return SimpleNamespace(data=[{k: row.get(k) for k in self.columns}
                                         for row in self.rows[self.start:self.end + 1]], error=None)

    client = SimpleNamespace(table=Query)
    monkeypatch.setattr(repositories, "get_supabase_client", lambda: client)
    monkeypatch.setattr(repositories, "_profile_repo", None)
    monkeypatch.setattr(repositories, "_content_repo", None)
    try:
        yield TestClient(app), tables
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)


def test_overview_reports_only_operational_counts(portal):
    client, _ = portal
    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data.pop("generated_at").endswith("+00:00")
    assert data == {
        "accounts": {"consumers": 2, "staff": 2, "unknown_role": 1,
                     "active": 2, "disabled": 1, "archived": 1, "unknown_status": 1},
        "content": {
            "recipes": {"total": 4, "draft": 1, "published": 2, "archived": 1, "unknown_status": 0,
                        "approval_recorded": 1, "awaiting_review": 1, "changes_requested": 0,
                        "published_without_review": 1},
            "exercises": {"total": 1, "draft": 1, "published": 0, "archived": 0, "unknown_status": 0,
                          "approval_recorded": 0, "awaiting_review": 0, "changes_requested": 1,
                          "published_without_review": 0},
        },
    }


def test_overview_counts_beyond_default_database_page_limit(portal):
    client, tables = portal
    tables["profiles"] = [{"role": "patient", "account_status": "active"}] * 1207
    tables["recipes"] = [{"status": "draft"}] * 1000 + [{"status": "unexpected"}]
    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200
    assert response.json()["accounts"]["consumers"] == 1207
    assert response.json()["content"]["recipes"]["total"] == 1001
    assert response.json()["content"]["recipes"]["unknown_status"] == 1


def test_overview_failure_is_not_reported_as_zero_counts(portal):
    client, tables = portal
    del tables["exercise_routines"]
    response = client.get("/api/admin/dashboard")
    assert response.status_code == 500
    assert response.json() == {"detail": "Operational overview unavailable"}


@pytest.mark.parametrize("path", ["/api/admin/dashboard", "/api/admin/analytics"])
def test_overview_and_analytics_require_admin(portal, path):
    client, _ = portal
    app.dependency_overrides[get_current_admin_user] = lambda: {"role": "medical_expert"}
    assert client.get(path).status_code == 403


def test_analytics_is_explicitly_unavailable_without_reading_records(portal):
    client, tables = portal
    tables.clear()
    response = client.get("/api/admin/analytics?period=6months")
    assert response.status_code == 200
    assert response.json()["status"] == "unavailable"
    assert set(response.json()) == {"status", "message"}


def test_retired_admin_timeline_cannot_read_consumer_health(portal):
    client, tables = portal
    tables.clear()
    assert client.get("/api/admin/users/synthetic-consumer/timeline").status_code == 404


def test_account_directory_returns_only_support_metadata(portal):
    client, tables = portal
    tables["profiles"] = [{"id": "synthetic-consumer", "role": "patient", "first_name": "Synthetic",
                           "last_name": "Account", "phone": "", "account_status": "active",
                           "created_at": "2026-11-07", "deactivation_reason": None,
                           "plan": "free", "premium_until": None, "premium_source": None,
                           "hss_score": 99, "diagnosis": "Synthetic excluded field", "password_hash": "excluded"}]
    response = client.get("/api/users/")
    assert response.status_code == 200
    assert response.json() == [{"id": "synthetic-consumer", "role": "patient", "first_name": "Synthetic",
                                "last_name": "Account", "phone": "", "account_status": "active",
                                "created_at": "2026-11-07", "deactivation_reason": None,
                                "plan": "free", "premium_until": None, "premium_source": None}]


def test_experts_cannot_browse_consumer_accounts(portal):
    client, _ = portal
    app.dependency_overrides[get_current_admin_user] = lambda: {"role": "medical_expert"}
    assert client.get("/api/users/").status_code == 403


def test_staff_directory_does_not_advertise_clinical_permissions(portal):
    client, tables = portal
    tables["profiles"] = [{"id": "synthetic-dietitian", "role": "medical_expert", "expert_type": "Dietitian",
                           "account_status": "active", "first_name": "Synthetic", "last_name": "Reviewer",
                           "diagnosis": "Excluded", "password_hash": "excluded"}]
    response = client.get("/api/admin/staff")
    assert response.status_code == 200
    assert response.json()[0]["permissions"] == ["Review recipes"]
    assert "diagnosis" not in response.text


def test_failed_rest_response_is_not_an_empty_overview(portal, monkeypatch):
    client, _ = portal
    class FailedQuery:
        def __getattr__(self, _name):
            return lambda *_args, **_kwargs: self
        def execute(self):
            return SimpleNamespace(data=None, error={"message": "Synthetic failure"})
    monkeypatch.setattr(repositories, "get_supabase_client", lambda: SimpleNamespace(table=lambda _table: FailedQuery()))
    assert client.get("/api/admin/dashboard").status_code == 500


def test_rest_fallback_uses_inclusive_page_boundaries():
    from app.db.rest_client import PostgrestQueryBuilder
    query = PostgrestQueryBuilder("https://synthetic.example.test", {}, "profiles").range(500, 999)
    assert query.params == {"offset": "500", "limit": "500"}
