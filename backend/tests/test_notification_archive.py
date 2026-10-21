"""HL-019: notifications archive 72 hours after they're sent."""
from datetime import timedelta

from app.services import notification_archive as archive
from app.utils.time import utc_now


def ago(hours):
    return (utc_now() - timedelta(hours=hours)).isoformat()


def test_a_notification_is_archived_after_72_hours_or_once_marked():
    assert not archive.is_archived({"created_at": ago(71)})
    assert archive.is_archived({"created_at": ago(73)})  # even before the hourly job has run
    assert archive.is_archived({"created_at": ago(1), "archived_at": ago(0)})


def test_default_lists_leave_archived_out_but_they_can_still_be_listed():
    rows = [{"id": "new", "created_at": ago(2)}, {"id": "old", "created_at": ago(100)}]
    assert [n["id"] for n in archive.keep_active(rows)] == ["new"]
    both = archive.keep_active(rows, include_archived=True)
    assert [(n["id"], n["archived"]) for n in both] == [("new", False), ("old", True)]


class FakeQuery:
    def __init__(self, calls, table):
        self.calls, self.table = calls, table

    def update(self, data):
        self.calls.append((self.table, "update", sorted(data)))
        return self

    def is_(self, column, value):
        self.calls.append((self.table, "is", column, value))
        return self

    def lt(self, column, value):
        self.calls.append((self.table, "lt", column))
        return self

    def execute(self):
        return type("Res", (), {"data": [{"id": 1}, {"id": 2}] if self.table == "admin_notifications" else []})()


class FakeClient:
    def __init__(self):
        self.calls = []

    def table(self, name):
        return FakeQuery(self.calls, name)


def test_the_job_archives_only_active_notifications_older_than_72_hours_in_both_tables():
    client = FakeClient()
    assert archive.archive_old_notifications(client) == {"patient_notifications": 0, "admin_notifications": 2}
    for table in archive.TABLES:
        assert (table, "update", ["archived_at"]) in client.calls
        assert (table, "is", "archived_at", "null") in client.calls
        assert (table, "lt", "created_at") in client.calls
