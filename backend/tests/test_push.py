"""HL-018: push notifications: phone tokens, sending through Expo, and notifications that trigger them."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import push
from app.services.push import send_push as real_send_push  # kept before the autouse fixture swaps it out
from app.utils.security import get_current_user

T1, T2 = "ExponentPushToken[aaa111]", "ExponentPushToken[bbb222]"


class FakeTokens:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.saved, self.disabled, self.removed = [], [], []

    def save(self, user_id, token, platform):
        self.saved.append((user_id, token, platform))

    def disable(self, tokens):
        self.disabled += list(tokens)

    def disable_for_user(self, user_id, token):
        self.removed.append((user_id, token))

    def list_active(self, user_ids):
        return [r for r in self.rows if r["user_id"] in set(user_ids)]


class FakeResponse:
    def __init__(self, tickets, status_code=200):
        self.status_code = status_code
        self._tickets = tickets

    def json(self):
        return {"data": self._tickets}


@pytest.fixture
def tokens(monkeypatch):
    fake = FakeTokens()
    monkeypatch.setattr(push, "get_push_token_repo", lambda: fake)
    return fake


@pytest.fixture
def expo(monkeypatch):
    calls = []
    replies = []

    def fake_post(url, json=None, timeout=None, headers=None):
        calls.append(json)
        return replies.pop(0) if replies else FakeResponse([{"status": "ok"} for _ in json])

    monkeypatch.setattr(push.httpx, "post", fake_post)
    return calls, replies


def test_each_phone_of_each_patient_gets_the_message(tokens, expo):
    calls, _ = expo
    tokens.rows = [{"user_id": "p1", "token": T1}, {"user_id": "p1", "token": T2}, {"user_id": "p2", "token": "not-a-token"}]
    assert push.deliver(["p1", "p2"], "Clinic closed Monday", "Holiday hours", {"screen": "notifications"}) == 2
    sent = calls[0]
    assert [m["to"] for m in sent] == [T1, T2]
    assert sent[0]["title"] == "Clinic closed Monday" and sent[0]["data"] == {"screen": "notifications"}
    assert sent[0]["channelId"] == "default"


def test_messages_go_in_batches_of_100(tokens, expo):
    calls, _ = expo
    tokens.rows = [{"user_id": f"p{i}", "token": f"ExponentPushToken[{i}]"} for i in range(250)]
    push.deliver([f"p{i}" for i in range(250)], "Hi", "There")
    assert [len(batch) for batch in calls] == [100, 100, 50]


def test_phones_expo_no_longer_knows_are_switched_off(tokens, expo):
    _, replies = expo
    tokens.rows = [{"user_id": "p1", "token": T1}, {"user_id": "p1", "token": T2}]
    replies.append(FakeResponse([
        {"status": "error", "details": {"error": "DeviceNotRegistered"}},
        {"status": "ok"},
    ]))
    push.deliver(["p1"], "Hi", "There")
    assert tokens.disabled == [T1]


def test_no_phones_means_no_request(tokens, expo):
    calls, _ = expo
    assert push.deliver(["p1"], "Hi", "There") == 0
    assert calls == []


def test_an_expo_outage_is_only_logged(tokens, monkeypatch):
    tokens.rows = [{"user_id": "p1", "token": T1}]

    def boom(*a, **k):
        raise push.httpx.ConnectError("down")

    monkeypatch.setattr(push.httpx, "post", boom)
    assert push.deliver(["p1"], "Hi", "There") == 1
    assert tokens.disabled == []


def test_send_push_runs_in_the_background(tokens, expo, monkeypatch):
    started = []

    class FakeThread:
        def __init__(self, target, name=None, daemon=None):
            self.target = target

        def start(self):
            started.append(True)
            self.target()

    monkeypatch.setattr(push.threading, "Thread", FakeThread)
    tokens.rows = [{"user_id": "p1", "token": T1}]
    real_send_push(["p1"], "Hi", "There")
    assert started == [True] and expo[0]


# --- the app's token routes -----------------------------------------------------------------------------

@pytest.fixture
def signed_in(monkeypatch, tokens):
    monkeypatch.setattr("app.db.repositories.get_push_token_repo", lambda: tokens)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "p1", "role": "patient"}
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user, None)


def test_a_signed_in_phone_saves_its_token(signed_in, tokens):
    assert signed_in.post("/api/notifications/push-token", json={"token": T1, "platform": "android"}).status_code == 200
    assert tokens.saved == [("p1", T1, "android")]


def test_only_expo_tokens_are_accepted(signed_in, tokens):
    assert signed_in.post("/api/notifications/push-token", json={"token": "something-else-123"}).status_code == 400
    assert tokens.saved == []


def test_sign_out_removes_only_this_accounts_token(signed_in, tokens):
    assert signed_in.request("DELETE", "/api/notifications/push-token", json={"token": T1}).status_code == 200
    assert tokens.removed == [("p1", T1)]


# --- notifications that trigger a push --------------------------------------------------------------------

class FakeTable:
    def __init__(self, inserted):
        self.inserted = inserted

    def insert(self, rows):
        self.inserted.append(rows)
        return self

    def execute(self):
        rows = self.inserted[-1]
        return type("R", (), {"data": [dict(rows, id="b1")] if isinstance(rows, dict) else rows})


class FakeClient:
    def __init__(self):
        self.inserted = []

    def table(self, name):
        return FakeTable(self.inserted)


def test_announcements_and_personal_notifications_push(monkeypatch):
    from app.db.repositories.notifications import SupabaseNotificationRepository
    pushed = []
    monkeypatch.setattr("app.services.push.send_push", lambda ids, title, body, data=None: pushed.append((list(ids), title, data)))
    repo = SupabaseNotificationRepository(FakeClient())
    monkeypatch.setattr(repo, "_resolve_user_uuid", lambda uid: uid, raising=False)

    repo.create_broadcast({"title": "Clinic closed", "message": "Monday", "type": "General"}, target_user_ids=["p1", "p2"])
    repo.create_notification({"user_id": "p3", "type": "reminder", "title": "Checkup", "message": "Please book one"})

    assert pushed[0] == (["p1", "p2"], "Clinic closed", {"screen": "notifications"})
    assert pushed[1] == (["p3"], "Checkup", {"screen": "notifications"})
