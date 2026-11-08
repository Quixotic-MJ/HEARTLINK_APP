from types import SimpleNamespace

import pytest

from app.db.repositories.notifications import SupabaseNotificationRepository

NOTIFICATION = "33333333-3333-3333-3333-333333333333"
OWNER = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def notification_repo(monkeypatch):
    updates = []
    class Query:
        def update(self, _values):
            self.filters = {}
            updates.append(self.filters)
            return self
        def eq(self, key, value):
            self.filters[key] = value
            return self
        def execute(self):
            return SimpleNamespace(data=[{"id": NOTIFICATION}])
    monkeypatch.setattr("app.db.repositories.get_profile_repo", lambda: SimpleNamespace(get_by_id=lambda _uid: None))
    return SupabaseNotificationRepository(SimpleNamespace(table=lambda _table: Query())), updates


@pytest.mark.parametrize("user_id", [None, "unresolved-legacy-account"])
def test_notification_update_never_drops_an_unresolved_owner_filter(notification_repo, user_id):
    repo, updates = notification_repo
    assert repo.mark_read(NOTIFICATION, user_id=user_id) is False
    assert updates == []


def test_notification_update_includes_both_notification_and_owner(notification_repo):
    repo, updates = notification_repo
    assert repo.mark_read(NOTIFICATION, user_id=OWNER) is True
    assert updates == [{"id": NOTIFICATION, "user_id": OWNER}]
