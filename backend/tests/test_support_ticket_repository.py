from types import SimpleNamespace

import pytest

from app.db.repositories.feedback import SupabaseFeedbackRepository

REVISION = "2026-11-08T01:00:00+00:00"
ROW = {"id": "44444444-4444-4444-4444-444444444444", "ticket_code": "FB-1001", "status": "Closed",
       "full_message": "Synthetic full issue, beyond the short preview.", "preview": "Synthetic preview",
       "admin_notes": "Internal only", "updated_at": REVISION, "created_at": "2026-11-07T20:00:00+00:00",
       "device_meta": {"os": "Synthetic OS", "model": {"unexpected": "object"}, "extra": "Excluded"},
       "debug_secret": "Excluded"}


@pytest.fixture
def tickets():
    class Database:
        def __init__(self):
            self.calls = []
            self.rows = [dict(ROW)]
            self.fail = False
        def table(self, table):
            assert table == "feedback_tickets"
            query = Query(self)
            self.calls.append(query)
            return query
    class Query:
        def __init__(self, database):
            self.database, self.filters, self.payload = database, {}, None
            self.start, self.end = 0, 999
        def select(self, columns):
            assert columns != "*", "Support responses use explicit fields"
            return self
        def order(self, *_args, **_kwargs):
            return self
        def eq(self, key, value):
            self.filters[key] = value
            return self
        def range(self, start, end):
            self.start, self.end = start, end
            return self
        def limit(self, count):
            self.end = count - 1
            return self
        def insert(self, payload):
            self.inserted = payload
            return self
        def update(self, payload):
            self.payload = payload
            return self
        def execute(self):
            if self.database.fail:
                return SimpleNamespace(data=None, error={"message": "Synthetic failure"})
            if hasattr(self, "inserted"):
                return SimpleNamespace(data=[{"id": "55555555-5555-5555-5555-555555555555", **self.inserted}], error=None)
            matching = [dict(row) for row in self.database.rows if all(row.get(key) == value for key, value in self.filters.items())]
            if self.payload:
                matching = [{**row, **self.payload} for row in matching]
            return SimpleNamespace(data=matching[self.start:self.end+1], error=None)
    database = Database()
    return SupabaseFeedbackRepository(database), database


def test_support_projection_preserves_full_message_and_maps_existing_closed_storage(tickets):
    repo, _ = tickets
    ticket = repo.list_tickets()[0]
    assert ticket["status"] == "Archived"
    assert ticket["fullMessage"] == "Synthetic full issue, beyond the short preview."
    assert ticket["date"] == "Nov 08, 2026"
    assert ticket["deviceMeta"] == {"os": "Synthetic OS"}
    assert "debug_secret" not in ticket


def test_ticket_compare_and_swap_uses_returned_row_without_fallback_or_reread(tickets):
    repo, database = tickets
    updated = repo.update_ticket(ROW["id"], {"status": "Archived", "adminNotes": "New internal note"}, REVISION)
    assert updated["status"] == "Archived"
    assert len(database.calls) == 1
    assert database.calls[0].filters == {"id": ROW["id"], "updated_at": REVISION}
    assert database.calls[0].payload["status"] == "Closed"


def test_stale_repository_ticket_update_does_not_fall_back_to_ticket_code(tickets):
    repo, database = tickets
    assert repo.update_ticket(ROW["id"], {"adminNotes": "Stale"}, "2026-11-07T01:00:00+00:00") is None
    assert len(database.calls) == 1


def test_support_list_reads_past_default_row_limit(tickets):
    repo, database = tickets
    database.rows = [{**ROW, "id": f"44444444-4444-4444-4444-{i:012d}"} for i in range(1007)]
    assert len(repo.list_tickets()) == 1007


def test_created_ticket_keeps_the_mobile_response_contract(tickets):
    repo, _ = tickets
    created = repo.create_ticket({"full_message": "Synthetic new issue", "device_meta": {"os": "Synthetic OS", "extra": "Excluded"}})
    assert created["ticketId"] == "FB-1002"
    assert created["fullMessage"] == "Synthetic new issue"
    assert created["status"] == "Open"
    assert created["adminNotes"] == ""
    assert created["deviceMeta"] == {"os": "Synthetic OS"}


@pytest.mark.parametrize("operation", ["create", "update"])
def test_failed_ticket_writes_do_not_return_fabricated_success_or_conflict(tickets, operation):
    from fastapi import HTTPException
    repo, database = tickets
    database.fail = True
    with pytest.raises(HTTPException) as error:
        if operation == "create":
            repo.create_ticket({"full_message": "Synthetic issue"})
        else:
            repo.update_ticket(ROW["id"], {"status": "Resolved"}, REVISION)
    assert error.value.status_code == 500
    if operation == "create":
        assert len(database.calls) == 1
