"""Database review 2026-10-14: exact email lookups and one stored phone format."""
import pytest

from app.db.repositories.profiles import SupabaseProfileRepository
from app.utils.phone import normalize_phone_for_storage


class FakeQuery:
    def __init__(self, table):
        self.table = table
        self.filters = []
        self.payload = None

    def select(self, *a):
        return self

    def eq(self, col, val):
        self.filters.append(("eq", col, val))
        return self

    def ilike(self, col, val):
        self.filters.append(("ilike", col, val))
        return self

    def insert(self, payload):
        self.payload = payload
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def execute(self):
        self.table.calls.append(self)
        rows = self.table.rows
        for op, col, val in self.filters:
            assert op == "eq", "lookups must be exact"
            rows = [r for r in rows if r.get(col) == val]
        data = [dict(self.payload)] if self.payload is not None else rows
        return type("Res", (), {"data": data})()


class FakeTable:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []


class FakeClient:
    def __init__(self, rows):
        self.profiles = FakeTable(rows)

    def table(self, name):
        assert name == "profiles"
        return FakeQuery(self.profiles)


@pytest.mark.parametrize("raw, stored", [
    ("09171234567", "+639171234567"),
    ("0917-123-4567", "+639171234567"),
    ("639171234567", "+639171234567"),
    ("+639171234567", "+639171234567"),
    ("+63 917 123 4567", "+639171234567"),
    ("No Phone", "No Phone"),
    ("", ""),
    (None, None),
])
def test_phone_storage_format(raw, stored):
    assert normalize_phone_for_storage(raw) == stored


def test_email_lookup_is_exact_not_a_pattern():
    repo = SupabaseProfileRepository(FakeClient([
        {"id": "a", "email": "axb@example.com", "phone": "+639170000001"},
        {"id": "b", "email": "a_b@example.com", "phone": "+639170000002"},
    ]))
    # "_" is a wildcard for ilike; with an exact match it only finds its own account
    assert repo.get_by_identifier("A_B@Example.com")["id"] == "b"
    assert repo.get_by_identifier("a%@example.com") is None


@pytest.mark.parametrize("typed", ["09171234567", "639171234567", "+639171234567", "0917 123 4567"])
def test_phone_lookup_finds_any_typed_format(typed):
    repo = SupabaseProfileRepository(FakeClient([{"id": "p", "email": None, "phone": "+639171234567"}]))
    assert repo.get_by_identifier(typed)["id"] == "p"


def test_create_and_update_store_one_format():
    client = FakeClient([])
    repo = SupabaseProfileRepository(client)

    repo.create({"id": "11111111-1111-1111-1111-111111111111", "email": " New@Example.COM ", "phone": "09171234567"})
    repo.update("11111111-1111-1111-1111-111111111111", {"phone": "639181234567", "email": "Other@Example.com"})
    repo.update("11111111-1111-1111-1111-111111111111", {"first_name": "Ana"})

    created, updated, untouched = (c.payload for c in client.profiles.calls)
    assert created["email"] == "new@example.com" and created["phone"] == "+639171234567"
    assert updated["email"] == "other@example.com" and updated["phone"] == "+639181234567"
    assert "phone" not in untouched and "email" not in untouched
