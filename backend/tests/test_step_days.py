"""HL-163: steps from the phone. Only brisk walking (100+ steps a minute, sent as periods) counts as movement minutes,
a logged exercise is never counted twice, the step total is only shown, and turning tracking off removes it all."""
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import app.db.repositories as repos
from app.main import app
from app.services import heart_score as hs
from app.services import step_minutes
from app.services.steps import LOCAL_TZ
from app.utils.security import get_current_user
from app.utils.time import to_local_date, utc_now

# 6 pm in Manila
NOW = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)
TODAY = date(2026, 10, 30)


def t(hour, minute=0, day=TODAY):
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=LOCAL_TZ)


def walk(start, minutes):
    return [start.isoformat(), (start + timedelta(minutes=minutes)).isoformat()]


def step_day(day=TODAY, steps=5000, periods=()):
    return {"day": day.isoformat(), "steps": steps, "brisk_periods": list(periods)}


# ── Brisk minutes ─────────────────────────────────────────────────────────────────────────────────────────────────


def test_brisk_periods_become_minutes_for_their_day():
    rows = [step_day(periods=[walk(t(7), 12), walk(t(17), 8)])]
    assert step_minutes.brisk_minutes_by_day(rows, []) == {TODAY: 20}


def test_a_logged_exercise_during_a_brisk_walk_is_counted_once():
    # A 30-minute walk logged in the app, ending at 7:30; the phone saw 7:10-7:40 as brisk
    exercise = [{"duration_minutes": 30, "logged_at": t(7, 30).isoformat()}]
    rows = [step_day(periods=[walk(t(7, 10), 30)])]
    assert step_minutes.brisk_minutes_by_day(rows, exercise) == {TODAY: 10}


def test_an_abandoned_or_deleted_exercise_doesnt_remove_brisk_minutes():
    exercise = [
        {"duration_minutes": 30, "logged_at": t(7, 30).isoformat(), "status": "abandoned"},
        {"duration_minutes": 30, "logged_at": t(7, 30).isoformat(), "deleted_at": t(8).isoformat()},
    ]
    rows = [step_day(periods=[walk(t(7), 30)])]
    assert step_minutes.brisk_minutes_by_day(rows, exercise) == {TODAY: 30}


def test_a_phone_and_a_watch_counting_the_same_walk_count_once():
    rows = [step_day(periods=[walk(t(7), 20), walk(t(7, 10), 20)])]
    assert step_minutes.brisk_minutes_by_day(rows, []) == {TODAY: 30}


def test_periods_that_cant_be_read_are_left_out():
    rows = [step_day(periods=[["not a time", "nope"], ["x"], walk(t(9), 5)])]
    assert step_minutes.brisk_minutes_by_day(rows, []) == {TODAY: 5}


# ── The Habit score ───────────────────────────────────────────────────────────────────────────────────────────────


def score(**kw):
    args = {
        "baseline": {"created_at": (NOW - timedelta(days=60)).isoformat()}, "profile": {}, "health_logs": [],
        "exercise_logs": [], "sleep_logs": [], "meal_logs": [], "routines": [], "now": NOW,
    }
    return hs.score_from(**{**args, **kw})


def test_brisk_walking_adds_to_the_weeks_movement_minutes():
    exercise = [{"duration_minutes": 30, "effort_rating": 5, "logged_at": t(6).isoformat()}]
    without = score(exercise_logs=exercise)["areas"]["activity"]
    rows = [step_day(day=TODAY - timedelta(days=d), periods=[walk(t(17, day=TODAY - timedelta(days=d)), 20)])
            for d in range(3)]
    area = score(exercise_logs=exercise, step_days=rows)["areas"]["activity"]
    assert (without["minutes"], without["points"]) == (30, 40)
    assert (area["minutes"], area["phone_minutes"], area["points"]) == (90, 60, 80)


def test_only_this_weeks_steps_count():
    old = TODAY - timedelta(days=7)
    rows = [step_day(day=old, periods=[walk(t(17, day=old), 60)])]
    area = score(step_days=rows)["areas"]["activity"]
    assert area["minutes"] == 0 and "phone_minutes" not in area


def test_the_step_total_alone_never_counts():
    area = score(step_days=[step_day(steps=15000)])["areas"]["activity"]
    assert area["minutes"] == 0


def test_no_steps_changes_nothing():
    exercise = [{"duration_minutes": 40, "effort_rating": 5, "logged_at": t(6).isoformat()}]
    assert score(exercise_logs=exercise)["areas"]["activity"] == {
        **score(exercise_logs=exercise, step_days=[])["areas"]["activity"]}


# ── The API ───────────────────────────────────────────────────────────────────────────────────────────────────────


class FakeSteps:
    def __init__(self):
        self.rows = {}

    def list(self, user_id, start, end):
        return [r for (u, d), r in sorted(self.rows.items()) if u == user_id and start <= d <= end]

    def save_days(self, user_id, days):
        for d in days:
            self.rows[(user_id, d["day"])] = {"user_id": user_id, **d}

    def delete_all(self, user_id):
        self.rows = {k: v for k, v in self.rows.items() if k[0] != user_id}


class FakeBaseline:
    def get_thresholds(self, user_id):
        return {"daily_steps_goal": 8000}


class FakeExercises:
    def list_user_logs(self, user_id, **kw):
        return []


@pytest.fixture
def api(monkeypatch):
    store = FakeSteps()
    recalculated = []
    monkeypatch.setattr(repos, "get_step_days_repo", lambda: store)
    monkeypatch.setattr(repos, "get_baseline_repo", lambda: FakeBaseline())
    monkeypatch.setattr(repos, "get_exercises_repo", lambda: FakeExercises())
    monkeypatch.setattr(hs, "try_recalculate", lambda uid, trigger, **kw: recalculated.append(trigger))
    saved = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "p1", "role": "patient"}
    yield TestClient(app), store, recalculated
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)


def local_today():
    return to_local_date(utc_now())


def at_local(day, hour, minute=0):
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=LOCAL_TZ)


def body_for(day, steps=4000, periods=None):
    if periods is None:
        start = at_local(day, 7)
        periods = [[start.isoformat(), (start + timedelta(minutes=15)).isoformat()]]
    return {"days": [{"day": day.isoformat(), "steps": steps, "brisk_periods": periods}]}


def test_the_week_is_saved_updates_the_score_and_shows_on_the_steps_card(api):
    client, store, recalculated = api
    today = local_today()
    res = client.put("/api/steps/days", json=body_for(today, steps=4210))
    assert res.status_code == 204
    assert recalculated == ["steps"]

    week = client.get("/api/steps/week").json()
    assert week["goal"] == 8000
    assert len(week["days"]) == 7 and week["days"][-1]["day"] == today.isoformat()
    assert (week["days"][-1]["steps"], week["days"][-1]["brisk_minutes"]) == (4210, 15)
    assert week["last_synced_at"]


def test_sending_the_week_again_replaces_it_instead_of_adding(api):
    client, store, _ = api
    today = local_today()
    client.put("/api/steps/days", json=body_for(today, steps=1000))
    client.put("/api/steps/days", json=body_for(today, steps=3000))
    assert [r["steps"] for r in store.rows.values()] == [3000]


def test_turning_tracking_off_removes_the_steps(api):
    client, store, recalculated = api
    client.put("/api/steps/days", json=body_for(local_today()))
    assert client.delete("/api/steps").status_code == 204
    assert store.rows == {} and recalculated[-1] == "steps_removed"


def _bad_bodies():
    today = local_today()
    tomorrow = today + timedelta(days=1)
    start = at_local(today, 7)
    yield body_for(tomorrow)  # the future
    yield body_for(today - timedelta(days=15))  # too long ago
    yield body_for(today, periods=[[start.isoformat(), (start - timedelta(minutes=5)).isoformat()]])  # ends first
    yesterday = at_local(today - timedelta(days=1), 7)
    yield body_for(today, periods=[[yesterday.isoformat(), (yesterday + timedelta(minutes=5)).isoformat()]])
    yield body_for(today, steps=-1)
    yield body_for(today, steps=100001)
    yield {"days": []}
    many = [[(start + timedelta(minutes=i)).isoformat(), (start + timedelta(minutes=i, seconds=30)).isoformat()]
            for i in range(301)]
    yield body_for(today, periods=many)
    twice = body_for(today)
    yield {"days": twice["days"] * 2}


@pytest.mark.parametrize("body", list(_bad_bodies()))
def test_bad_weeks_are_refused(api, body):
    client, store, recalculated = api
    res = client.put("/api/steps/days", json=body)
    assert res.status_code in (400, 422)
    assert store.rows == {} and recalculated == []


def test_a_portal_session_cant_use_steps(api):
    client, *_ = api
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "a1", "role": "admin"}
    assert client.get("/api/steps/week").status_code == 404
    assert client.put("/api/steps/days", json=body_for(local_today())).status_code == 404
