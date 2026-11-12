"""HL-058: Model Check (one row per review round, clinical-only measures) and clinician verification.
HL-153: the measures compare the app's Heart risk band with the Cardiologist's."""
import pytest
from fastapi.testclient import TestClient

from app.services import model_check as mc

# The Heart risk bands, lowest first (the same letters the level tests used)
S, M, E, C = "low", "borderline", "intermediate", "high"


# --- weighted kappa ------------------------------------------------------------------------------------

def test_perfect_agreement_is_one():
    assert mc.weighted_kappa([(S, S), (M, M), (E, E), (C, C)]) == 1.0


def test_systematic_swap_is_negative():
    # App says Low when the cardiologist says Borderline and vice versa: worse than chance
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


def rnd(rid, band, kind="estimated", status="complete"):
    return {"id": rid, "case_code": f"CASE-{rid}", "lane": "sample", "status": status,
            "app_tier": "Stable" if band == S else "Moderate",
            "app_score": 70, "app_scorer": "heart_score", "app_risk_band": band, "app_risk_kind": kind if band else None,
            "app_risk_percent": 4.0 if band else None, "created_at": "2026-10-10T00:00:00+00:00"}


def cardio(rid, band, agreement, clinical=True, when="2026-10-12T00:00:00+00:00", difference=None):
    return {"review_case_id": rid, "section": "cardiology", "expert_risk_band": band, "risk_agreement": agreement,
            "is_clinical": clinical, "reviewer_name": "Dr C", "reasons": ["blood_pressure"],
            "risk_difference": difference, "updated_at": when}


def older(rid, tier="Critical"):
    """A review from before HL-153: a habits-style level, no band."""
    return {"review_case_id": rid, "section": "cardiology", "expert_tier": tier, "tier_agreement": "under",
            "is_clinical": True, "reviewer_name": "Dr C", "reasons": ["blood_pressure"], "updated_at": "2026-10-01T00:00:00+00:00"}


@pytest.fixture
def world(monkeypatch):
    state = {}

    def install(rounds, sections):
        state["cases"] = Cases(rounds, sections)
        monkeypatch.setattr(mc, "get_case_review_repo", lambda: state["cases"])

    monkeypatch.setattr("app.services.review_sections.recommendations_for",
                        lambda rc: {"recipes": [{"id": "r1"}], "exercises": [] if rc.get("app_tier") == "Stable" else [{"id": "e1"}]})
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
        [rnd("1", M), rnd("2", M), rnd("3", S, kind="calculated"), rnd("4", E), rnd("old", M), rnd("young", None)],
        [cardio("1", M, "agree", difference=-1.5), cardio("2", E, "under", difference=3.5), cardio("3", S, "agree"),
         cardio("4", M, "over", clinical=False), older("old"), cardio("young", S, None)],
    )
    result = mc.model_check()
    clinical = result["clinical"]

    assert clinical["reviews"] == 3 and clinical["enough_reviews"] is False
    assert clinical["agreement"] == {"count": 2, "percent": 66.7}
    assert clinical["under_calling"]["count"] == 1 and clinical["over_calling"]["count"] == 0
    assert clinical["matrix"]["levels"] == ["low", "borderline", "intermediate", "high"]
    assert clinical["matrix"]["rows_app_columns_cardiologist"][1] == [0, 1, 1, 0]   # app Borderline row
    assert clinical["percent_difference"] == {"reviews_with_percent": 2, "average_gap": 2.5}
    # HL-153: an older habits-level review and a round without an app risk are listed but not measured
    assert clinical["left_out"] == {"older_reviews": 1, "no_app_risk": 1}
    assert result["practice"] == {"reviews": 1, "agreement": {"count": 0, "percent": 0.0}}
    assert len(result["rows"]) == 6                                                   # every row is still listed
    assert next(r for r in result["rows"] if r["round_id"] == "old")["older_review"] is True

    calculated = mc.model_check("calculated")
    assert calculated["kind"] == "calculated"
    assert calculated["clinical"]["reviews"] == 1 and len(calculated["rows"]) == 1
    assert mc.model_check("estimated")["clinical"]["reviews"] == 2


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
