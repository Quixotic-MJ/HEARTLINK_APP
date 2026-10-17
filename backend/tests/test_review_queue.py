"""HL-054: review queue lanes, triggers, sampling and ordering."""
import random
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.services import review_queue
from app.services import review_rules as rules

NOW = datetime(2026, 10, 14, 4, 0, tzinfo=timezone.utc)


def iso(dt):
    return dt.isoformat()


class Profiles:
    def __init__(self, people):
        self.people = {p["id"]: p for p in people}

    def list_all(self, exclude_archived=True):
        return list(self.people.values())

    def get_by_id(self, uid):
        return self.people.get(uid)


class Hss:
    def __init__(self, latest):
        self.latest = latest

    def list_hss_history(self, user_id, limit=None):
        row = self.latest.get(user_id)
        return [row] if row else []


class Logs:
    def __init__(self, logs):
        self.logs = logs

    def list_user_logs(self, user_id, cutoff=None):
        rows = [l for l in self.logs.get(user_id, []) if not cutoff or l["logged_at"] >= cutoff]
        return sorted(rows, key=lambda l: l["logged_at"], reverse=True)


class Cases:
    def __init__(self):
        self.rounds, self.sections = [], []

    def get_open_case_for_patient(self, pid):
        return next((r for r in self.rounds if r["patient_id"] == pid and r["status"] == "open"), None)

    def list_patient_cases(self, pid):
        return sorted([r for r in self.rounds if r["patient_id"] == pid], key=lambda r: r["created_at"], reverse=True)

    def create_review_case(self, data):
        row = {"id": str(uuid.uuid4()), "created_at": iso(NOW), **data}
        self.rounds.append(row)
        return row

    def update_review_case(self, cid, patch):
        row = next(r for r in self.rounds if r["id"] == cid)
        row.update(patch)
        return row

    def list_review_cases(self, status=None, lane=None):
        return [r for r in self.rounds if (not status or r["status"] == status) and (not lane or r["lane"] == lane)]

    def list_sections(self, review_case_id=None, **k):
        return [s for s in self.sections if s["review_case_id"] == review_case_id]


def patient(pid, **extra):
    return {"id": pid, "role": "patient", "onboarding_status": "complete", "account_status": "active",
            "date_of_birth": "1968-05-01", "sex": "male", **extra}


@pytest.fixture
def world(monkeypatch):
    state = {"profiles": Profiles([]), "hss": Hss({}), "logs": Logs({}), "cases": Cases()}
    monkeypatch.setattr(review_queue, "get_profile_repo", lambda: state["profiles"])
    monkeypatch.setattr(review_queue, "get_hss_repo", lambda: state["hss"])
    monkeypatch.setattr(review_queue, "get_health_logs_repo", lambda: state["logs"])
    monkeypatch.setattr(review_queue, "get_case_review_repo", lambda: state["cases"])
    monkeypatch.setattr(review_queue, "build_snapshot", lambda profile: {"model_features": {"RIDAGEYR": 58}, "input_snapshot": {}})
    return state


# --- which scorer produced the app's level ----------------------------------------------------------

@pytest.mark.parametrize("row, scorer", [
    ({"source": "baseline", "score": 70, "tier": "Moderate"}, "baseline_model"),
    ({"source": "telemetry", "score": 52, "tier": "Elevated Risk"}, "bp_rules"),
    ({"source": "telemetry", "score": 81, "tier": "Stable", "contributing_factors": {"source": "lifestyle_composite"}}, "lifestyle_points"),
    ({"source": "expert_override", "score": 40, "tier": "Critical"}, "unknown"),
])
def test_scorer_mapping(world, row, scorer):
    world["hss"] = Hss({"p1": row})
    assert review_queue.current_app_status("p1")["scorer"] == scorer


def test_no_score_yet(world):
    assert review_queue.current_app_status("p1") == {"score": None, "tier": None, "scorer": "unknown"}


# --- urgent triggers (proposed values, pending the cardiologist) ------------------------------------

def log(days_ago=1, **fields):
    return {"logged_at": iso(NOW - timedelta(days=days_ago)), **fields}


@pytest.mark.parametrize("entry, expected", [
    (log(systolic_bp=182, diastolic_bp=100), "BP 182/100"),
    (log(systolic_bp=150, diastolic_bp=121), "BP 150/121"),
    (log(systolic_bp=85, diastolic_bp=70), "Low BP 85/70"),
    (log(symptoms=["Chest Discomfort / Tightness"], severity_map={"Chest Discomfort / Tightness": 7}), "Chest discomfort, severity 7"),
    (log(symptoms=["Shortness of Breath"], context="resting"), "Shortness of breath at rest"),
])
def test_urgent_triggers(world, entry, expected):
    world["logs"] = Logs({"p1": [entry]})
    assert review_queue.urgent_reason("p1", {"tier": "Moderate"}, NOW).startswith(expected)


@pytest.mark.parametrize("entry", [
    log(systolic_bp=179, diastolic_bp=119),
    log(systolic_bp=90, diastolic_bp=60),
    log(symptoms=["Chest Discomfort / Tightness"], severity_map={"Chest Discomfort / Tightness": 6}),
    log(symptoms=["Shortness of Breath"], context="after_exercise"),
    log(days_ago=rules.SYMPTOM_WINDOW_DAYS + 1, systolic_bp=190, diastolic_bp=125),
])
def test_not_urgent(world, entry):
    world["logs"] = Logs({"p1": [entry]})
    assert review_queue.urgent_reason("p1", {"tier": "Moderate"}, NOW) is None


def test_critical_level_is_urgent(world):
    assert review_queue.urgent_reason("p1", {"tier": "Critical"}, NOW) == "App level is Critical"


# --- refresh: urgent and re-review rounds ------------------------------------------------------------

def test_refresh_opens_urgent_and_rereview_once(world):
    world["profiles"] = Profiles([patient("urgent"), patient("changed"), patient("calm")])
    world["hss"] = Hss({"urgent": {"source": "telemetry", "score": 52, "tier": "Elevated Risk"},
                        "changed": {"source": "baseline", "score": 66, "tier": "Moderate"},
                        "calm": {"source": "baseline", "score": 85, "tier": "Stable"}})
    world["logs"] = Logs({"urgent": [log(systolic_bp=184, diastolic_bp=118)]})
    world["cases"].rounds.append({"id": "old", "patient_id": "changed", "status": "complete", "app_tier": "Stable",
                                  "lane": "sample", "created_at": iso(NOW - timedelta(days=40))})

    first = review_queue.refresh_queue(NOW)
    second = review_queue.refresh_queue(NOW)

    open_rounds = world["cases"].list_review_cases(status="open")
    assert {(r["patient_id"], r["lane"]) for r in open_rounds} == {("urgent", "urgent"), ("changed", "rereview")}
    assert len(first["opened"]) == 2 and second["opened"] == []
    urgent = next(r for r in open_rounds if r["lane"] == "urgent")
    assert urgent["app_tier"] == "Elevated Risk" and urgent["app_scorer"] == "bp_rules"
    assert urgent["model_features"] == {"RIDAGEYR": 58}
    assert urgent["case_code"].startswith("CASE-")


def test_open_sample_round_moves_to_urgent(world):
    world["profiles"] = Profiles([patient("p1")])
    world["hss"] = Hss({"p1": {"source": "baseline", "score": 45, "tier": "Critical"}})
    world["cases"].rounds.append({"id": "r1", "patient_id": "p1", "status": "open", "lane": "sample",
                                  "reason": "Weekly random sample", "created_at": iso(NOW)})
    result = review_queue.refresh_queue(NOW)
    assert result["upgraded"] == ["r1"]
    assert world["cases"].rounds[0]["lane"] == "urgent"
    assert len(world["cases"].rounds) == 1


# --- weekly sample -------------------------------------------------------------------------------------

def test_sample_spreads_across_levels_and_respects_cooldown(world):
    people, latest = [], {}
    for tier in rules.TIERS:
        for i in range(rules.SAMPLE_PER_TIER + 3):
            pid = f"{tier}-{i}"
            people.append(patient(pid))
            latest[pid] = {"source": "baseline", "score": 50, "tier": tier}
    people.append(patient("recent"))
    latest["recent"] = {"source": "baseline", "score": 90, "tier": "Stable"}
    world["profiles"], world["hss"] = Profiles(people), Hss(latest)
    world["cases"].rounds.append({"id": "x", "patient_id": "recent", "status": "complete", "lane": "sample",
                                  "created_at": iso(NOW - timedelta(days=rules.SAMPLE_COOLDOWN_DAYS - 1))})

    opened = review_queue.draw_sample("admin-1", NOW, random.Random(7))

    per_tier = {tier: sum(1 for r in opened if r["app_tier"] == tier) for tier in rules.TIERS}
    assert per_tier == {tier: rules.SAMPLE_PER_TIER for tier in rules.TIERS}
    assert all(r["lane"] == "sample" and r["created_by"] == "admin-1" for r in opened)
    assert "recent" not in {r["patient_id"] for r in opened}
    assert all("app says" not in r["reason"] for r in opened)


# --- queue listing -----------------------------------------------------------------------------------

def test_queue_order_progress_and_blinding(world):
    world["profiles"] = Profiles([patient("a"), patient("b"), patient("c")])
    cases = world["cases"]
    cases.rounds += [
        {"id": "s", "patient_id": "a", "status": "open", "lane": "sample", "reason": "Weekly random sample", "case_code": "CASE-0001", "app_tier": "Stable", "created_at": iso(NOW - timedelta(hours=100))},
        {"id": "u", "patient_id": "b", "status": "open", "lane": "urgent", "reason": "BP 182/121 logged Oct 12", "case_code": "CASE-0002", "app_tier": "Moderate", "created_at": iso(NOW - timedelta(hours=50))},
        {"id": "r", "patient_id": "c", "status": "open", "lane": "rereview", "reason": "App level changed since the last review", "case_code": "CASE-0003", "app_tier": "Moderate", "created_at": iso(NOW - timedelta(hours=5))},
    ]
    cases.sections.append({"review_case_id": "u", "section": "nutrition"})

    items = review_queue.list_queue(NOW)

    assert [i["id"] for i in items] == ["u", "r", "s"]
    assert items[0]["overdue"] is True and items[1]["overdue"] is False
    assert items[0]["sections"] == {"cardiology": False, "nutrition": True, "exercise": False}
    assert items[0]["age"] == 58
    assert all("app_tier" not in i and "app_score" not in i for i in items)


# --- API -----------------------------------------------------------------------------------------------

def test_only_admins_draw_the_sample(world, monkeypatch):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes

    staff = {"id": "e1", "role": "medical_expert", "account_status": "active"}
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles([staff]))
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    try:
        token = create_access_token({"user_id": "e1", "role": "medical_expert"})
        res = TestClient(app).post("/api/admin/review-queue/sample", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
    finally:
        app.dependency_overrides.update(saved)


def test_unanswered_model_inputs_are_stored_as_null():
    """NaN (a skipped onboarding answer) is not valid JSON, so saving a round with it failed."""
    import json
    raw = {"PAQ610": float("nan"), "PAD615": float("inf"), "RIDAGEYR": 58.0, "nested": [float("nan"), 1]}
    safe = review_queue._json_safe(raw)
    assert safe == {"PAQ610": None, "PAD615": None, "RIDAGEYR": 58.0, "nested": [None, 1]}
    json.dumps(safe, allow_nan=False)
