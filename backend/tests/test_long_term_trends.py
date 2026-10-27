"""HL-086: long-term Trends (Premium): weeks and months, this month vs last, time of day and pattern notes."""
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.services.long_term_trends import _buckets, build_long_term

NOW = datetime(2026, 10, 27, 4, 0, tzinfo=timezone.utc)  # noon, 27 Oct, in Manila
TODAY = date(2026, 10, 27)


def at(days_ago, hour):
    """A UTC timestamp for `hour` o'clock Manila time, `days_ago` days before 27 Oct (Manila is UTC+8)."""
    local = datetime.combine(TODAY - timedelta(days=days_ago), datetime.min.time()) + timedelta(hours=hour)
    return (local - timedelta(hours=8)).replace(tzinfo=timezone.utc).isoformat()


OVER = [20, 18, 16, 14, 12]  # days over the 1,500 mg limit, with exercise
UNDER = [19, 17, 15, 13, 11]  # days under it, no exercise
# every morning from day 10 to 19: 140 after a salty (and exercise) day, 130 after an under-the-limit one;
# medicines missed on the 140 mornings, taken on the 130 ones
CHECKINS = [
    {"logged_at": at(d - 1, 7), "systolic_bp": 140, "diastolic_bp": 90, "heart_rate_bpm": 80, "medication_taken": False}
    for d in OVER
] + [
    {"logged_at": at(d - 1, 7), "systolic_bp": 130, "diastolic_bp": 84, "heart_rate_bpm": 70, "medication_taken": True}
    for d in UNDER
] + [
    {"logged_at": at(40, 20), "systolic_bp": 120, "diastolic_bp": 80},  # evening
    {"logged_at": at(42, 23), "systolic_bp": 150, "diastolic_bp": 95},  # night
    {"logged_at": at(44, 14), "systolic_bp": 125, "diastolic_bp": 82},  # afternoon
    {"logged_at": at(3, 7), "systolic_bp": 210, "diastolic_bp": 130, "deleted_at": at(3, 8)},  # deleted: left out
]
MEALS = [{"logged_at": at(d, 12), "sodium_mg": 2500} for d in OVER] + [{"logged_at": at(d, 12), "sodium_mg": 1000} for d in UNDER]
EXERCISE = [{"logged_at": at(d, 17), "duration_minutes": 30, "status": "completed"} for d in OVER] + [
    {"logged_at": at(11, 17), "duration_minutes": 30, "status": "abandoned"},  # not counted
]
SLEEP = [{"logged_at": at(5, 6), "duration_hours": 7}]
SCORES = [{"computed_at": at(10, 8), "score": 70}, {"computed_at": at(12, 8), "score": 74}]


class Rows:
    def __init__(self, **lists):
        self.lists = lists

    def __getattr__(self, name):
        return lambda *a, **k: self.lists.get(name, [])


@pytest.fixture
def data(monkeypatch):
    import app.db.repositories as repos
    monkeypatch.setattr("app.services.long_term_trends.utc_now", lambda: NOW)
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: CHECKINS)
    monkeypatch.setattr(repos, "get_meals_repo", lambda: Rows(list_user_meals=MEALS))
    monkeypatch.setattr(repos, "get_exercises_repo", lambda: Rows(list_user_logs=EXERCISE))
    monkeypatch.setattr(repos, "get_sleep_repo", lambda: Rows(list_user_logs=SLEEP))
    monkeypatch.setattr(repos, "get_hss_repo", lambda: Rows(list_hss_history=SCORES))
    monkeypatch.setattr(repos, "get_baseline_repo", lambda: Rows(get_thresholds={}))
    monkeypatch.setattr("app.services.nutrition_targets.targets_for_user", lambda uid, t: {"sodium_mg": {"value": 1500}})


def test_90_days_is_13_weeks_and_a_year_is_12_months():
    weeks = _buckets(TODAY, 90)
    assert len(weeks) == 13 and weeks[-1][1:] == (date(2026, 10, 21), TODAY) and weeks[0][0] == "Jul 29"
    months = _buckets(TODAY, 365)
    assert [m[0] for m in months] == ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]
    assert months[0][1] == date(2025, 11, 1) and months[1][2] == date(2025, 12, 31) and months[-1][2] == TODAY


def test_weeks_average_what_was_logged(data):
    r = build_long_term("pat", 90)
    assert r["bucket"] == "week" and len(r["buckets"]) == 13 and r["sodium_limit_mg"] == 1500
    this_week, last_week = r["buckets"][-1], r["buckets"][-2]  # 21 to 27 Oct, 14 to 20 Oct
    assert this_week["readings"] == 0 and this_week["systolic"] is None  # the deleted reading is left out
    assert (last_week["systolic"], last_week["readings"]) == (135, 4)  # days 10 to 13
    assert (last_week["score"], last_week["sodium_mg"], last_week["sodium_days"], last_week["days_over_limit"]) == (72, 1500, 3, 1)


def test_this_month_against_last(data):
    m = build_long_term("pat", 365)["month_compare"]
    assert (m["this"]["systolic"], m["this"]["readings"], m["this"]["pulse"]) == (135, 10, 75)
    assert (m["last"]["systolic"], m["last"]["readings"]) == (132, 3)
    assert m["this"]["medicines_percent"] == 50 and m["last"]["medicines_percent"] is None
    assert m["this"]["exercise_minutes_per_week"] == 35  # 150 minutes over 30 days; the abandoned session is left out


def test_blood_pressure_by_time_of_day(data):
    times = {t["key"]: (t["systolic"], t["readings"]) for t in build_long_term("pat", 90)["time_of_day"]}
    assert times == {"morning": (135, 10), "afternoon": (125, 1), "evening": (120, 1), "night": (150, 1)}


def test_pattern_notes_compare_the_next_day_and_say_on_average(data):
    notes = {n["key"]: n for n in build_long_term("pat", 90)["patterns"]}
    assert set(notes) == {"sodium", "exercise", "medicines"}
    assert (notes["sodium"]["with"]["systolic"], notes["sodium"]["without"]["systolic"], notes["sodium"]["difference"]) == (140, 130, 10)
    assert notes["sodium"]["text"].startswith("On average, your top number the next day was 10 higher after days over your sodium limit")
    assert notes["exercise"]["with"]["days"] == 5 and notes["exercise"]["without"]["days"] == 5
    assert notes["medicines"]["text"].startswith("On average, your top number was 10 lower on days you took your medicines")
    for n in notes.values():
        assert "diagnos" not in n["text"] and "cause" not in n["text"]


def test_no_note_without_5_days_in_each_group(monkeypatch, data):
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: CHECKINS[:7])
    r = build_long_term("pat", 90)
    assert r["patterns"] == [] and r["pattern_min_days"] == 5
    assert "not what causes it" in r["disclaimer"]


def test_nothing_logged_still_gives_empty_trends(monkeypatch, data):
    import app.db.repositories as repos
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: [])
    monkeypatch.setattr(repos, "get_meals_repo", lambda: Rows())
    monkeypatch.setattr(repos, "get_exercises_repo", lambda: Rows())
    monkeypatch.setattr(repos, "get_sleep_repo", lambda: Rows())
    monkeypatch.setattr(repos, "get_hss_repo", lambda: Rows())
    r = build_long_term("pat", 365)
    assert all(b["readings"] == 0 and b["score"] is None for b in r["buckets"]) and r["patterns"] == []


# --- the endpoint -------------------------------------------------------------------------------------------

class Profiles:
    def __init__(self, premium):
        self.premium = premium

    def get_by_id(self, uid):
        until = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        return {"id": uid, "role": "patient", "account_status": "active",
                "plan": "premium" if self.premium else "free", "premium_until": until}


@pytest.fixture
def client(monkeypatch, data):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    token = create_access_token({"user_id": "pat", "role": "patient"})

    def as_patient(premium):
        monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles(premium))
        monkeypatch.setattr("app.services.premium.get_profile_repo", lambda: Profiles(premium))
        return {"Authorization": f"Bearer {token}"}

    yield TestClient(app), as_patient
    app.dependency_overrides.update(saved)


def test_premium_patients_get_long_term_trends(client):
    http, as_patient = client
    res = http.get("/api/analytics/pat/long-term?days=365", headers=as_patient(True))
    assert res.status_code == 200 and res.json()["bucket"] == "month"


def test_free_patients_are_told_it_is_premium(client):
    http, as_patient = client
    res = http.get("/api/analytics/pat/long-term", headers=as_patient(False))
    assert res.status_code == 403 and res.json()["detail"]["code"] == "premium_required"


def test_only_90_days_or_a_year_and_only_your_own(client):
    http, as_patient = client
    headers = as_patient(True)
    assert http.get("/api/analytics/pat/long-term?days=30", headers=headers).status_code == 400
    assert http.get("/api/analytics/someone-else/long-term", headers=headers).status_code == 403


@pytest.mark.parametrize("module, cls, method", [
    ("app.db.repositories.health_logs", "SupabaseHealthLogsRepository", "list_user_logs"),
    ("app.db.repositories.hss", "SupabaseHSSRepository", "list_hss_history"),
])
def test_a_year_of_check_ins_and_scores_is_read_past_1000_rows(module, cls, method):
    import importlib

    class Query:
        def __init__(self, log):
            self.log, self.span = log, (0, 0)

        def __getattr__(self, _):
            return lambda *a, **k: self

        def range(self, a, b):
            self.span = (a, b)
            return self

        def execute(self):
            self.log.append(self.span)
            a, b = self.span
            return type("R", (), {"data": [{"i": i} for i in range(a, min(b + 1, 1204))]})()

    log = []
    repo_cls = getattr(importlib.import_module(module), cls)
    repo = repo_cls.__new__(repo_cls)
    repo.client = type("C", (), {"table": lambda self, _: Query(log)})()
    repo._resolve_user_uuid = lambda uid: "uuid"
    assert len(getattr(repo, method)("pat", cutoff="2026-01-01T00:00:00Z")) == 1204
    assert log == [(0, 999), (1000, 1999)]
