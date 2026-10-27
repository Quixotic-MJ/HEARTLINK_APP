"""HL-085: the doctor-ready health report (Premium)."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.services import health_report
from app.services.health_report import bp_category, build_report
from app.utils.time import utc_now


def ago(days, hour_utc):
    """A UTC timestamp `days` ago at `hour_utc` (Manila is UTC+8)."""
    d = (utc_now() - timedelta(days=days)).replace(hour=hour_utc, minute=0, second=0, microsecond=0)
    return d.isoformat()


CHECKINS = [
    # 7:00 AM Manila (23:00 UTC the day before): morning
    {"logged_at": ago(10, 23), "systolic_bp": 150, "diastolic_bp": 95, "heart_rate_bpm": 80, "medication_taken": True,
     "symptoms": ["Chest discomfort"]},
    # 7:00 PM Manila (11:00 UTC): evening
    {"logged_at": ago(9, 11), "systolic_bp": 118, "diastolic_bp": 76, "heart_rate_bpm": 70, "medication_taken": False,
     "symptoms": ["None (Feeling fine)"]},
    {"logged_at": ago(5, 23), "systolic_bp": 132, "diastolic_bp": 84, "heart_rate_bpm": None, "medication_taken": True,
     "symptoms": ["Chest discomfort", "Dizzy"]},
    # "I don't take any": left out of the medicine share
    {"logged_at": ago(2, 3), "systolic_bp": None, "diastolic_bp": None, "medication_taken": None, "symptoms": None},
    {"logged_at": ago(1, 3), "systolic_bp": 200, "diastolic_bp": 100, "deleted_at": ago(1, 4)},
]
MEALS = [
    {"logged_at": ago(10, 4), "sodium_mg": 900},
    {"logged_at": ago(10, 6), "sodium_mg": 800},  # same day: 1,700 mg, over the 1,500 limit
    {"logged_at": ago(5, 4), "sodium_mg": 600},
]
EXERCISE = [
    {"logged_at": ago(8, 2), "duration_minutes": 30, "status": "completed"},
    {"logged_at": ago(4, 2), "duration_minutes": 45, "status": "completed"},
    {"logged_at": ago(3, 2), "duration_minutes": 20, "status": "abandoned"},
]
SLEEP = [{"logged_at": ago(9, 22), "duration_hours": 7}, {"logged_at": ago(4, 22), "duration_hours": 6}]
SCORES = [{"computed_at": ago(20, 0), "score": 64}, {"computed_at": ago(1, 0), "score": 71}]
ALERTS = [{"created_at": ago(40, 0), "alert_type": "Old"}, {"created_at": ago(1, 3), "alert_type": "Hypertensive Crisis"}]


class Rows:
    def __init__(self, **lists):
        self.lists = lists

    def __getattr__(self, name):
        return lambda *a, **k: self.lists.get(name, [])


@pytest.fixture
def data(monkeypatch):
    import app.db.repositories as repos
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: CHECKINS)
    monkeypatch.setattr(repos, "get_meals_repo", lambda: Rows(list_user_meals=MEALS))
    monkeypatch.setattr(repos, "get_exercises_repo", lambda: Rows(list_user_logs=EXERCISE))
    monkeypatch.setattr(repos, "get_sleep_repo", lambda: Rows(list_user_logs=SLEEP))
    monkeypatch.setattr(repos, "get_hss_repo", lambda: Rows(list_hss_history=SCORES))
    monkeypatch.setattr(repos, "get_health_logs_repo", lambda: Rows(list_alerts=ALERTS))
    monkeypatch.setattr(repos, "get_baseline_repo", lambda: Rows(get_thresholds={}))
    monkeypatch.setattr("app.services.nutrition_targets.targets_for_user", lambda uid, t: {"sodium_mg": {"value": 1500}})


@pytest.mark.parametrize("sys_bp, dia_bp, expected", [
    (185, 95, "crisis"), (150, 125, "crisis"), (85, 70, "low"), (110, 55, "low"), (145, 85, "stage_2"),
    (125, 92, "stage_2"), (132, 70, "stage_1"), (118, 84, "stage_1"), (124, 78, "elevated"), (118, 76, "normal"),
])
def test_blood_pressure_categories_use_the_app_thresholds(sys_bp, dia_bp, expected):
    assert bp_category(sys_bp, dia_bp) == expected


def test_the_report_sums_up_the_period(data):
    r = build_report("pat", 30)
    bp = r["blood_pressure"]
    assert bp["readings"] == 3  # the deleted reading and the blank one are left out
    assert bp["average"] == {"systolic": 133, "diastolic": 85, "readings": 3}
    assert (bp["highest"]["systolic"], bp["lowest"]["systolic"]) == (150, 118)
    assert bp["morning"]["readings"] == 2 and bp["evening"] == {"systolic": 118, "diastolic": 76, "readings": 1}
    assert {c["key"]: c["readings"] for c in bp["categories"]} == {
        "crisis": 0, "low": 0, "stage_2": 1, "stage_1": 1, "elevated": 0, "normal": 1}
    assert r["pulse"] == {"average": 75, "readings": 2}
    assert r["score"] == {"start": 64, "end": 71, "change": 7}
    assert r["medicines"] == {"answered": 3, "taken": 2, "percent": 67}
    assert r["sodium"] == {"days_with_meals": 2, "average_mg": 1150, "limit_mg": 1500, "days_over_limit": 1}
    assert r["exercise"] == {"sessions": 2, "minutes": 75, "minutes_per_week": 18}
    assert r["sleep"] == {"average_hours": 6.5, "nights": 2}
    assert r["symptoms"] == [{"name": "Chest discomfort", "times": 2}, {"name": "Dizzy", "times": 1}]
    assert [a["type"] for a in r["alerts"]] == ["Hypertensive Crisis"]  # the 40-day-old one is outside
    assert "not a diagnosis" in r["disclaimer"]


def test_an_empty_period_still_gives_a_report(monkeypatch, data):
    monkeypatch.setattr("app.services.health_logs.get_health_logs", lambda uid, cutoff=None: [])
    r = build_report("pat", 90)
    assert r["blood_pressure"] == {"readings": 0} and r["medicines"]["percent"] is None and r["days"] == 90


# --- the endpoint -------------------------------------------------------------------------------------------

class Profiles:
    def __init__(self, premium):
        self.premium = premium

    def get_by_id(self, uid):
        until = (utc_now() + timedelta(days=5)).isoformat()
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


def test_premium_patients_get_their_report(client):
    http, as_patient = client
    res = http.get("/api/reports/pat?days=90", headers=as_patient(True))
    assert res.status_code == 200 and res.json()["days"] == 90


def test_free_patients_are_told_it_is_premium(client):
    http, as_patient = client
    res = http.get("/api/reports/pat", headers=as_patient(False))
    assert res.status_code == 403 and res.json()["detail"]["code"] == "premium_required"


def test_only_30_or_90_days_and_only_your_own(client):
    http, as_patient = client
    headers = as_patient(True)
    assert http.get("/api/reports/pat?days=365", headers=headers).status_code == 400
    assert http.get("/api/reports/someone-else", headers=headers).status_code == 403


def test_meals_are_read_past_1000_rows():
    from app.db.repositories.meals import SupabaseMealsRepository

    class Query:
        def __init__(self, log):
            self.log, self.span = log, (0, 0)

        def select(self, *_):
            return self

        def eq(self, *_):
            return self

        def gte(self, *_):
            return self

        def order(self, *_, **__):
            return self

        def range(self, a, b):
            self.span = (a, b)
            return self

        def execute(self):
            self.log.append(self.span)
            a, b = self.span
            return type("R", (), {"data": [{"i": i} for i in range(a, min(b + 1, 1204))]})()

    log = []
    repo = SupabaseMealsRepository.__new__(SupabaseMealsRepository)
    repo.client = type("C", (), {"table": lambda self, _: Query(log)})()
    repo._resolve_user_uuid = lambda uid: "uuid"
    assert len(repo.list_user_meals("pat", cutoff="2026-01-01T00:00:00Z")) == 1204
    assert log == [(0, 999), (1000, 1999)]
