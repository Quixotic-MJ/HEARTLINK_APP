"""HL-171: barangay emergency contacts. Only checked numbers reach the app; admins add and check them."""
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.services import barangays


class Repo:
    def __init__(self, rows):
        self.rows = {r["id"]: dict(r) for r in rows}

    def list_all(self):
        return sorted(self.rows.values(), key=lambda r: r["name"])

    def get(self, rid):
        return self.rows.get(rid)

    def create(self, row):
        row = {"id": str(uuid.uuid4()), **row}
        self.rows[row["id"]] = row
        return row

    def update(self, rid, patch):
        self.rows[rid].update(patch)
        return self.rows[rid]


ROWS = [
    {"id": "lahug", "name": "Lahug", "city": "Cebu City", "latitude": 10.33, "longitude": 123.90, "location_kind": "hall",
     "hotline_1": "032 231 1234", "hotline_2": None, "numbers_checked": True, "active": True},
    {"id": "apas", "name": "Apas", "city": "Cebu City", "latitude": 10.34, "longitude": 123.91, "location_kind": "centre",
     "hotline_1": "032 000 0000", "numbers_checked": False, "active": True},
    {"id": "hidden", "name": "Hidden", "latitude": 10.3, "longitude": 123.9, "active": False},
    {"id": "nowhere", "name": "San Nicolas Central", "latitude": None, "longitude": None, "active": True},
]


@pytest.fixture
def repo(monkeypatch):
    r = Repo(ROWS)
    monkeypatch.setattr(barangays, "get_barangay_contacts_repo", lambda: r)
    return r


def test_the_app_only_gets_checked_numbers(repo):
    listed = {b["id"]: b for b in barangays.list_public()}
    assert set(listed) == {"lahug", "apas"}               # hidden and no-location barangays are left out
    assert listed["lahug"]["phones"] == ["032 231 1234"]
    assert listed["apas"]["phones"] == []                 # not checked yet: no Call button
    assert listed["apas"]["location_kind"] == "centre"


def test_changing_a_number_clears_the_check(repo):
    saved = barangays.update("lahug", {"hotline_1": "032 231 9999"}, "admin-1")
    assert saved["numbers_checked"] is False and saved["checked_at"] is None
    assert barangays.list_public()[1]["phones"] == []     # sorted: Apas, Lahug


def test_an_admin_confirms_a_number(repo):
    saved = barangays.update("apas", {"numbers_checked": True}, "admin-1")
    assert saved["numbers_checked"] is True and saved["checked_at"] and saved["checked_by"] == "admin-1"
    # a new number with the tick in the same save counts as checked
    again = barangays.update("lahug", {"hotline_1": "0917 123 4567", "numbers_checked": True}, "admin-2")
    assert again["numbers_checked"] is True and again["checked_by"] == "admin-2"


@pytest.mark.parametrize("payload, message", [
    ({"name": ""}, "name"),
    ({"name": "X", "latitude": "abc", "longitude": 123}, "map location"),
    ({"name": "X", "latitude": 95, "longitude": 123}, "map location"),
    ({"name": "X", "hotline_1": "call me"}, "digits"),
    ({"name": "X", "numbers_checked": True}, "Add a hotline"),
    ({"name": "X", "location_kind": "somewhere"}, "hall"),
])
def test_bad_inputs_are_refused(repo, payload, message):
    with pytest.raises(HTTPException) as exc:
        barangays.create(payload, "admin-1")
    assert exc.value.status_code == 400 and message in exc.value.detail


def test_adding_and_hiding(repo):
    row = barangays.create({"name": "Budlaan", "latitude": "10.378", "longitude": "123.886", "hotline_1": "161"}, "admin-1")
    assert row["source"] == "team" and row["city"] == "Cebu City" and row["numbers_checked"] is False
    barangays.update(row["id"], {"active": False}, "admin-1")
    assert row["id"] not in {b["id"] for b in barangays.list_public()}


@pytest.mark.parametrize("phone, ok", [("032 255 1234", True), ("0917-123-4567", True), ("+63 32 255 1234", True),
                                       ("(032) 255-1234", True), ("911", True), ("12", False), ("abc", False)])
def test_phone_format(phone, ok):
    assert barangays.valid_phone(phone) is ok


def test_only_admins_edit(repo, monkeypatch):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes

    class Profiles:
        def get_by_id(self, uid):
            return {"id": "e1", "role": "medical_expert", "account_status": "active"}

    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles())
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    try:
        client = TestClient(app)
        token = create_access_token({"user_id": "e1", "role": "medical_expert"})
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/admin/barangays", headers=headers).status_code == 403
        assert client.put("/api/admin/barangays/lahug", json={"hotline_1": "1"}, headers=headers).status_code == 403
        public = client.get("/api/barangays")                 # the app's list needs no sign-in
        assert public.status_code == 200 and {b["id"] for b in public.json()} == {"lahug", "apas"}
    finally:
        app.dependency_overrides.update(saved)
