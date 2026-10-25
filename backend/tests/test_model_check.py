"""HL-058: Model Check (one row per review round, clinical-only measures) and clinician verification."""
import pytest
from fastapi.testclient import TestClient

from app.services import model_check as mc

S, M, E, C = "Stable", "Moderate", "Elevated Risk", "Critical"


# --- weighted kappa ------------------------------------------------------------------------------------

def test_perfect_agreement_is_one():
    assert mc.weighted_kappa([(S, S), (M, M), (E, E), (C, C)]) == 1.0


def test_systematic_swap_is_negative():
    # App says Stable when the cardiologist says Moderate and vice versa: worse than chance
    assert mc.weighted_kappa([(S, M), (M, S)]) == -1.0


def test_kappa_undefined_when_everything_is_one_level():
    assert mc.weighted_kappa([(S, S), (S, S)]) is None
    assert mc.weighted_kappa([]) is None


def test_far_misses_cost_more_than_near_misses():
    base = [(S, S), (M, M), (E, E), (C, C)] * 3
    near = mc.weighted_kappa(base + [(S, M)])
    far = mc.weighted_kappa(base + [(S, C)])
    assert near > far


@pytest.mark.parametrize("kappa, label", [(-0.1, "Poor"), (0.15, "Slight"), (0.35, "Fair"), (0.5, "Moderate"),
                                           (0.7, "Substantial"), (0.9, "Almost perfect"), (None, None)])
def test_kappa_labels(kappa, label):
    assert mc.kappa_label(kappa) == label


# --- one row per round ---------------------------------------------------------------------------------

class Cases:
    def __init__(self, rounds, sections):
        self.rounds, self.sections = rounds, sections

    def list_review_cases(self, status=None, lane=None):
        return [r for r in self.rounds if r["status"] == status]

    def list_sections(self, include_archived=False, **k):
        return [s for s in self.sections if include_archived or s.get("status", "submitted") == "submitted"]


def rnd(rid, tier, scorer="baseline_model", status="complete"):
    return {"id": rid, "case_code": f"CASE-{rid}", "lane": "sample", "status": status, "app_tier": tier,
            "app_score": 70, "app_scorer": scorer, "created_at": "2026-10-10T00:00:00+00:00"}


def cardio(rid, tier, agreement, clinical=True, when="2026-10-12T00:00:00+00:00"):
    return {"review_case_id": rid, "section": "cardiology", "expert_tier": tier, "tier_agreement": agreement,
            "is_clinical": clinical, "reviewer_name": "Dr C", "reasons": ["blood_pressure"],
            "score_difference": None, "updated_at": when}


@pytest.fixture
def world(monkeypatch):
    state = {}

    def install(rounds, sections):
        state["cases"] = Cases(rounds, sections)
        monkeypatch.setattr(mc, "get_case_review_repo", lambda: state["cases"])

    monkeypatch.setattr("app.services.review_sections.recommendations_for",
                        lambda rc: {"recipes": [{"id": "r1"}], "exercises": [] if rc.get("app_tier") == S else [{"id": "e1"}]})
    return install


def test_each_round_is_one_row_with_checks_inside(world):
    world(
        [rnd("a", M), rnd("b", S), rnd("no-cardio", M, status="open"), rnd("gone", M, status="archived")],
        [
            cardio("a", E, "under"),
            {"review_case_id": "a", "section": "nutrition", "reviewer_name": "Dt",
             "item_verdicts": [{"item_name": "Fried fish", "verdict": "no"}, {"item_name": "Oats", "verdict": "ok"}]},
            {"review_case_id": "a", "section": "exercise", "reviewer_name": "PT",
             "item_verdicts": [{"item_name": "Band rows", "verdict": "changes"}]},
            cardio("b", S, "agree", when="2026-10-11T00:00:00+00:00"),
            {"review_case_id": "no-cardio", "section": "nutrition", "item_verdicts": []},
            cardio("gone", M, "agree"),
        ],
    )
    rows = mc.list_rows()

    assert [r["round_id"] for r in rows] == ["a", "b"]           # newest first; no cardiology = no row; archived out
    a, b = rows
    assert a["food_check"] == {"status": "done", "reviewer_name": "Dt", "not_suitable": ["Fried fish"], "with_changes": []}
    assert a["exercise_check"]["with_changes"] == ["Band rows"]
    assert b["food_check"]["status"] == "waiting" and b["exercise_check"]["status"] == "not_needed"


def test_measures_use_clinical_reviews_only(world):
    world(
        [rnd("1", M), rnd("2", M), rnd("3", S, scorer="bp_rules"), rnd("4", E)],
        [cardio("1", M, "agree"), cardio("2", E, "under"), cardio("3", S, "agree"),
         cardio("4", M, "over", clinical=False)],
    )
    result = mc.model_check()
    clinical = result["clinical"]

    assert clinical["reviews"] == 3 and clinical["enough_reviews"] is False
    assert clinical["agreement"] == {"count": 2, "percent": 66.7}
    assert clinical["under_calling"]["count"] == 1 and clinical["over_calling"]["count"] == 0
    assert clinical["matrix"]["rows_app_columns_cardiologist"][1] == [0, 1, 1, 0]   # app Moderate row
    assert result["practice"] == {"reviews": 1, "agreement": {"count": 0, "percent": 0.0}}
    assert len(result["rows"]) == 4                                                   # practice rows still listed

    bp_only = mc.model_check("bp_rules")
    assert bp_only["clinical"]["reviews"] == 1 and len(bp_only["rows"]) == 1


# --- clinician verification (API) ------------------------------------------------------------------------

class Profiles:
    def __init__(self, people):
        self.people = {p["id"]: dict(p) for p in people}

    def get_by_id(self, uid):
        return self.people.get(uid)

    def update(self, uid, data):
        self.people[uid].update(data)
        return self.people[uid]


@pytest.fixture
def api(monkeypatch):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes

    people = Profiles([
        {"id": "boss", "role": "admin", "account_status": "active"},
        {"id": "admin", "role": "admin", "account_status": "active"},
        {"id": "doc", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
    ])
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: people)
    monkeypatch.setattr("app.api.admin_api.admin_api.get_profile_repo", lambda: people)
    monkeypatch.setattr("app.api.admin_api.admin_api.record_admin_activity", lambda **k: None)
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    client = TestClient(app)
    as_user = lambda uid, role: {"Authorization": f"Bearer {create_access_token({'user_id': uid, 'role': role})}"}
    yield client, people, as_user
    app.dependency_overrides.update(saved)


def test_an_admin_verifies_a_clinician(api):
    client, people, as_user = api
    res = client.put("/api/admin/staff/doc/clinician-verification", json={"verified": True}, headers=as_user("boss", "admin"))
    assert res.status_code == 200
    assert people.people["doc"]["is_verified_clinician"] is True
    assert people.people["doc"]["clinician_verified_by"] == "boss"

    res = client.put("/api/admin/staff/doc/clinician-verification", json={"verified": False}, headers=as_user("boss", "admin"))
    assert res.status_code == 200 and people.people["doc"]["clinician_verified_at"] is None


@pytest.mark.parametrize("target, body, who, code", [
    ("doc", {"verified": True}, ("doc", "medical_expert"), 403),  # experts cannot verify
    ("doc", {"verified": "yes"}, ("boss", "admin"), 400),
    ("admin", {"verified": True}, ("boss", "admin"), 404),  # only medical experts
])
def test_verification_rules(api, target, body, who, code):
    client, _, as_user = api
    res = client.put(f"/api/admin/staff/{target}/clinician-verification", json=body, headers=as_user(*who))
    assert res.status_code == code
