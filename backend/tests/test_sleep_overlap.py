"""2026-11-19: the same night can't be logged twice; a nap at another time still adds up."""
from app.services.sleep_logs import overlap_message, overlapping_log

NIGHT = {"id": "n1", "bedtime": "2026-11-18T14:00:00Z", "wake_time": "2026-11-18T22:00:00Z"}  # 10 PM to 6 AM in Manila


def test_the_same_night_again_overlaps():
    assert overlapping_log("2026-11-18T14:00:00Z", "2026-11-18T22:00:00Z", [NIGHT]) == NIGHT


def test_part_of_the_night_overlaps():
    assert overlapping_log("2026-11-18T20:00:00Z", "2026-11-18T23:00:00Z", [NIGHT]) == NIGHT


def test_a_nap_at_another_time_is_fine():
    assert overlapping_log("2026-11-19T05:00:00Z", "2026-11-19T06:00:00Z", [NIGHT]) is None


def test_sleep_that_only_touches_is_fine():
    assert overlapping_log("2026-11-18T22:00:00Z", "2026-11-18T23:00:00Z", [NIGHT]) is None


def test_logs_without_times_and_deleted_logs_are_skipped():
    old = {"id": "o", "duration_hours": 7}
    gone = {**NIGHT, "id": "g", "is_deleted": True}
    assert overlapping_log(NIGHT["bedtime"], NIGHT["wake_time"], [old, gone]) is None


def test_message_uses_philippine_time():
    assert overlap_message(NIGHT).startswith("You already logged sleep from 10:00 PM to 6:00 AM.")


def test_the_server_refuses_an_overlapping_log(monkeypatch):
    from fastapi.testclient import TestClient
    import app.api.sleep_logs.sleep_logs as api
    from app.main import app
    from app.utils.security import get_current_user

    uid = "mock-patient-id"
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: {"id": uid, "user_id": uid, "role": "patient"})
    monkeypatch.setattr(api, "find_overlap", lambda *a: NIGHT)
    saved = []
    monkeypatch.setattr(api, "create_sleep_log", lambda *a: saved.append(a))
    res = TestClient(app).post(f"/api/sleep-logs/{uid}", json={
        "duration_hours": 8, "quality": "Good", "bedtime": NIGHT["bedtime"], "wake_time": NIGHT["wake_time"]})
    assert res.status_code == 409
    assert "10:00 PM to 6:00 AM" in res.json()["detail"]
    assert saved == []
