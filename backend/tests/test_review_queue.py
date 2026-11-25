"""HL-054 / HL-168: the weekly sample and the steps a case goes through (check, approve, done)."""
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
    state = {"profiles": Profiles([]), "hss": Hss({}), "cases": Cases()}
    monkeypatch.setattr(review_queue, "get_profile_repo", lambda: state["profiles"])
    monkeypatch.setattr(review_queue, "get_hss_repo", lambda: state["hss"])
    monkeypatch.setattr(review_queue, "get_case_review_repo", lambda: state["cases"])
    monkeypatch.setattr(review_queue, "build_snapshot", lambda profile: {"model_features": {"RIDAGEYR": 58}, "input_snapshot": {}})
    # Each level recommends 2 recipes and 2 exercises, except Stable, which recommends no exercises
    state["recs"] = lambda rc: {"recipes": [{"id": "r1"}, {"id": "r2"}],
                                "exercises": [] if rc.get("app_tier") == "Stable" else [{"id": "e1"}, {"id": "e2"}]}
    monkeypatch.setattr("app.services.review_sections.recommendations_for", lambda rc: state["recs"](rc))
    return state


# --- which scorer produced the app's level ----------------------------------------------------------

@pytest.mark.parametrize("row, scorer", [
    ({"source": "telemetry", "score": 73, "tier": "Moderate", "contributing_factors": {"source": "heart_score"}}, "heart_score"),
    ({"source": "baseline", "score": 70, "tier": "Moderate"}, "baseline_model"),
    ({"source": "telemetry", "score": 52, "tier": "Elevated Risk"}, "bp_rules"),
    ({"source": "telemetry", "score": 81, "tier": "Stable", "contributing_factors": {"source": "lifestyle_composite"}}, "lifestyle_points"),
    ({"source": "expert_override", "score": 40, "tier": "Critical"}, "unknown"),
])
def test_scorer_mapping(world, row, scorer):
    world["hss"] = Hss({"p1": row})
    assert review_queue.current_app_status("p1")["scorer"] == scorer


def test_no_score_yet(world):
    assert review_queue.current_app_status("p1") == {"score": None, "tier": None, "scorer": "unknown", "heart_risk": None}


# --- HL-139: the expert sees the Heart risk ----------------------------------

RISK = {"available": True, "kind": "calculated", "ascvd_10": 12.4, "band": "high", "urgent": True}


def with_risk(band, percent, tier="Moderate", score=70):
    """An HSS row whose record also holds a Heart risk (HL-139)."""
    risk = {"available": True, "kind": "estimated", "ascvd_10": percent, "band": band, "urgent": band == "high"}
    return {"source": "telemetry", "score": score, "tier": tier, "contributing_factors": {"source": "heart_score", "risk": risk}}


def test_the_expert_sees_the_heart_risk(world):
    world["hss"] = Hss({"p1": {"source": "telemetry", "score": 61, "tier": "Moderate",
                              "contributing_factors": {"source": "heart_score", "risk": RISK}}})
    status = review_queue.current_app_status("p1")
    assert status["heart_risk"] == RISK
    created = review_queue.open_round(patient("p1"), "sample", "test", status)
    assert created["input_snapshot"]["heart_risk"] == RISK
    # HL-153: saved on the round, for the comparison with the Cardiologist's band
    assert (created["app_risk_band"], created["app_risk_percent"], created["app_risk_kind"]) == ("high", 12.4, "calculated")


def test_a_round_without_a_heart_risk_has_none_saved(world):
    created = review_queue.open_round(patient("p1"), "sample", "test", {"tier": "Moderate", "score": 60, "scorer": "heart_score"})
    assert created["app_risk_band"] is None and created["app_risk_percent"] is None


# --- weekly sample -------------------------------------------------------------------------------------

def test_sample_spreads_across_heart_risk_bands_and_respects_cooldown(world):
    """HL-153: 5 per Heart risk band; people without a Heart risk (under 30, over 79) aren't sampled."""
    people, latest = [], {}
    percents = {"low": 1.5, "borderline": 4.0, "intermediate": 7.0, "high": 14.0}
    for band in rules.RISK_BANDS:
        for i in range(rules.SAMPLE_PER_TIER + 3):
            pid = f"{band}-{i}"
            people.append(patient(pid))
            latest[pid] = with_risk(band, percents[band])
    people.append(patient("recent"))
    latest["recent"] = with_risk("low", 1.0)
    people.append(patient("young"))
    latest["young"] = {"source": "telemetry", "score": 80, "tier": "Stable"}
    world["profiles"], world["hss"] = Profiles(people), Hss(latest)
    world["cases"].rounds.append({"id": "x", "patient_id": "recent", "status": "complete", "lane": "sample",
                                  "created_at": iso(NOW - timedelta(days=rules.SAMPLE_COOLDOWN_DAYS - 1))})

    opened = review_queue.draw_sample("admin-1", NOW, random.Random(7))

    per_band = {band: sum(1 for r in opened if r["app_risk_band"] == band) for band in rules.RISK_BANDS}
    assert per_band == {band: rules.SAMPLE_PER_TIER for band in rules.RISK_BANDS}
    assert "young" not in {r["patient_id"] for r in opened}
    assert all(r["lane"] == "sample" and r["created_by"] == "admin-1" for r in opened)
    assert "recent" not in {r["patient_id"] for r in opened}
    assert all("app says" not in r["reason"] for r in opened)



def test_archived_rounds_do_not_block_the_sample(world):
    """An archived round (taken out of the review) doesn't count as a recent review; a real one still does."""
    world["profiles"] = Profiles([patient("archived-only"), patient("reviewed")])
    world["hss"] = Hss({"archived-only": with_risk("low", 1.5), "reviewed": with_risk("low", 1.5)})
    recent = iso(NOW - timedelta(days=2))
    world["cases"].rounds.append({"id": "a", "patient_id": "archived-only", "status": "archived", "lane": "sample",
                                  "created_at": recent})
    world["cases"].rounds.append({"id": "b", "patient_id": "reviewed", "status": "complete", "lane": "sample",
                                  "created_at": recent})

    opened = review_queue.draw_sample("admin-1", NOW, random.Random(7))

    assert {r["patient_id"] for r in opened} == {"archived-only"}

# --- queue listing -----------------------------------------------------------------------------------

def round_(rid, status, lane="sample", tier="Moderate", hours=10, pid=None):
    return {"id": rid, "patient_id": pid or rid, "status": status, "lane": lane, "reason": "x",
            "case_code": f"CASE-{rid}", "app_tier": tier, "created_at": iso(NOW - timedelta(hours=hours))}


def section(rid, name, clinical=True):
    return {"review_case_id": rid, "section": name, "is_clinical": clinical}


def test_cases_move_through_check_approve_and_done(world):
    """HL-168: every case is listed with its step; nothing leaves the list when it's finished."""
    people = ["open", "waiting-food", "ready", "approved", "left", "practice", "stable"]
    world["profiles"] = Profiles([patient(p) for p in people])
    cases = world["cases"]
    cases.rounds += [round_("open", "open", hours=2), round_("waiting-food", "complete", hours=60),
                     round_("ready", "complete", hours=50), round_("approved", "complete", hours=40),
                     round_("left", "complete", hours=30), round_("practice", "complete", hours=20),
                     round_("stable", "complete", tier="Stable", hours=10)]
    cases.rounds[3]["dataset_status"] = "approved"
    cases.rounds[4]["dataset_status"] = "left_out"
    for rid in ("ready", "approved", "left"):
        cases.sections += [section(rid, "cardiology"), section(rid, "nutrition"), section(rid, "exercise")]
    cases.sections += [section("waiting-food", "cardiology"), section("waiting-food", "exercise"),
                       section("practice", "cardiology", clinical=False), section("practice", "nutrition"),
                       section("practice", "exercise"),
                       section("stable", "cardiology"), section("stable", "nutrition")]

    items = review_queue.list_queue(NOW)
    by_id = {i["id"]: i for i in items}

    assert [(i["id"], i["stage"]) for i in items] == [
        ("open", "check"), ("waiting-food", "check"),          # waiting for the Cardiologist first
        ("ready", "approve"), ("stable", "approve"),          # Stable: no exercise to check, so it's ready
        ("approved", "done"), ("left", "done"), ("practice", "done"),
    ]
    assert by_id["waiting-food"]["sections"] == {"cardiology": "done", "nutrition": "waiting", "exercise": "done"}
    assert (by_id["approved"]["outcome"], by_id["left"]["outcome"], by_id["practice"]["outcome"]) == (
        "approved", "left_out", "practice")
    assert by_id["open"]["age"] == 58 and by_id["open"]["older"] is False
    assert all("app_tier" not in i and "app_score" not in i and "overdue" not in i for i in items)

    steps = review_queue.queue_summary(items)
    assert {k: steps[k] for k in ("picked", "check", "approve", "approved", "done")} == {
        "picked": 7, "check": 2, "approve": 2, "approved": 1, "done": 3}
    assert steps["last_picked_at"] == iso(NOW - timedelta(hours=2))


def test_older_urgent_cases_are_kept_and_marked(world):
    """HL-168: the urgent and re-review lanes were removed, but their cases stay, marked as older."""
    world["profiles"] = Profiles([patient("u")])
    world["cases"].rounds.append(round_("u", "open", lane="urgent"))
    [item] = review_queue.list_queue(NOW)
    assert item["older"] is True and item["stage"] == "check"
    assert not hasattr(review_queue, "refresh_queue") and not hasattr(review_queue, "urgent_reason")


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
