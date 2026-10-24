"""HL-041: the portal's live "notifications changed" stream (Server-Sent Events)."""
import asyncio
import threading

from fastapi.testclient import TestClient

from app.main import app
from app.services import admin_notifications, live_events
from app.utils.security import get_current_admin_user


def stream_until(steps, heartbeat_seconds=5.0):
    """Runs one stream: `steps` is a list of callables run after each chunk; returns the chunks read."""
    async def run():
        disconnected = {"value": False}

        async def is_disconnected():
            return disconnected["value"]

        chunks = []
        gen = live_events.event_stream(is_disconnected, heartbeat_seconds=heartbeat_seconds)
        chunks.append(await gen.__anext__())  # the retry line
        for step in steps:
            step()
            chunks.append(await asyncio.wait_for(gen.__anext__(), timeout=2))
        disconnected["value"] = True
        await gen.aclose()
        return chunks

    return asyncio.run(run())


def test_the_stream_starts_with_a_reconnect_delay_and_sends_changes():
    chunks = stream_until([lambda: live_events.publish("notifications")])
    assert chunks[0] == f"retry: {live_events.RETRY_MS}\n\n"
    assert chunks[1] == "event: notifications\ndata: changed\n\n"


def test_a_change_published_from_another_thread_arrives():
    def from_worker_thread():
        t = threading.Thread(target=live_events.publish, args=("notifications",))
        t.start()
        t.join()

    chunks = stream_until([from_worker_thread])
    assert chunks[1].startswith("event: notifications")


def test_a_quiet_stream_sends_heartbeats():
    chunks = stream_until([lambda: None], heartbeat_seconds=0.05)
    assert chunks[1] == ": ping\n\n"


def test_a_closed_stream_stops_listening():
    stream_until([])
    assert live_events.subscriber_count() == 0


def test_a_new_staff_notification_signals_open_tabs(monkeypatch):
    published = []
    monkeypatch.setattr(live_events, "publish", lambda kind: published.append(kind))

    class FakeAdminRepo:
        def create_admin_notification(self, data):
            return {"id": "n1", **data}

    monkeypatch.setattr(admin_notifications, "get_admin_repo", lambda: FakeAdminRepo())
    admin_notifications.create_admin_notification(
        type="feedback", title="New ticket", message="Bug report", severity="info",
        recipient_roles=["admin"], route="/feedbacks",
    )
    assert published == ["notifications"]


def test_marking_read_signals_open_tabs(monkeypatch):
    published = []
    monkeypatch.setattr(live_events, "publish", lambda kind: published.append(kind))

    class FakeAdminRepo:
        def mark_admin_notification_read(self, *a):
            return True

        def mark_all_admin_notifications_read(self, *a):
            return None

    monkeypatch.setattr("app.api.admin_api.admin_notifications_api.get_admin_repo", lambda: FakeAdminRepo())
    app.dependency_overrides[get_current_admin_user] = lambda: {"user_id": "a1", "role": "admin"}
    try:
        client = TestClient(app)
        assert client.put("/api/admin/notifications/n1/read").status_code == 200
        assert client.put("/api/admin/notifications/mark-all-read").status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_admin_user, None)
    assert published == ["notifications", "notifications"]


def test_the_stream_needs_a_staff_sign_in():
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    try:
        assert TestClient(app).get("/api/admin/notifications/stream").status_code in (401, 403)
    finally:
        app.dependency_overrides.update(saved)
