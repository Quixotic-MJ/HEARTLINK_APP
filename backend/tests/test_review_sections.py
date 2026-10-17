"""HL-055 / HL-056: expert sections of a review round."""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.services import review_sections

ROUND = "11111111-1111-1111-1111-111111111111"


class Profiles:
    def __init__(self, people):
        self.people = {p["id"]: p for p in people}

    def get_by_id(self, uid):
        return self.people.get(uid)


class Cases:
    def __init__(self, rc):
        self.rc, self.sections = rc, {}

    def get_review_case(self, rid):
        return self.rc if rid == self.rc["id"] else None

    def list_sections(self, review_case_id=None, **k):
        return list(self.sections.values())

    def save_section(self, rid, section, data):
        row = {**self.sections.get(section, {}), **data, "review_case_id": rid, "section": section}
        self.sections[section] = row
        return row

    def update_review_case(self, rid, patch):
        self.rc.update(patch)
        return self.rc


class Content:
    def list_recipes(self):
        return [
            {"id": "r2", "name": "Oatmeal with banana", "hss_tier": "Moderate", "status": "published"},
            {"id": "r1", "name": "Garlic tofu", "hss_tier": "Moderate", "status": "published"},
            {"id": "r3", "name": "Draft stew", "hss_tier": "Moderate", "status": "draft"},
            {"id": "r4", "name": "Fried fish", "hss_tier": "Critical", "status": "published"},
        ]

    def list_routines(self):
        return [
            {"id": "e1", "name": "Brisk walking", "hss_tier": "Moderate", "status": "published"},
            {"id": "e2", "name": "Band rows", "hss_tier": "Moderate", "status": "published"},
        ]


def expert(uid, kind, verified=False, role="medical_expert"):
    return {"id": uid, "role": role, "expert_type": kind, "first_name": "Dr", "last_name": kind,
            "is_verified_clinician": verified}


@pytest.fixture
def world(monkeypatch):
    rc = {"id": ROUND, "case_code": "CASE-0042", "lane": "urgent", "reason": "BP 182/121 logged Oct 12",
          "status": "open", "app_tier": "Moderate", "app_score": 64, "app_scorer": "bp_rules",
          "created_at": datetime(2026, 10, 13, tzinfo=timezone.utc).isoformat(),
          "input_snapshot": {"date_of_birth": "1968-05-01", "sex": "male", "onboarding": {"ever_smoked": True},
                             "clinical": {"resting_bp_mmhg": "182/121"}, "timeline": []}}
    state = {
        "cases": Cases(rc),
        "profiles": Profiles([expert("cardio", "Cardiologist", verified=True), expert("diet", "Dietitian"),
                              expert("pt", "Physical Therapist"), expert("admin", None, role="admin")]),
    }
    monkeypatch.setattr(review_sections, "get_case_review_repo", lambda: state["cases"])
    monkeypatch.setattr(review_sections, "get_profile_repo", lambda: state["profiles"])
    monkeypatch.setattr(review_sections, "get_content_repo", lambda: Content())
    return state


def as_user(uid):
    return {"user_id": uid}


GOOD = {"expert_tier": "Critical", "expert_score": "38", "reasons": ["blood_pressure", "symptoms", "nonsense"],
        "confidence": "high", "checkup_flag": "asap", "notes": "Crisis-range reading with headache."}


# --- cardiology --------------------------------------------------------------------------------------

def test_cardiologist_review_completes_round_and_compares(world):
    saved = review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))

    assert saved["expert_tier"] == "Critical" and saved["expert_score"] == 38
    assert saved["reasons"] == ["blood_pressure", "symptoms"]
    assert saved["tier_agreement"] == "under"          # the app said Moderate: less risky than the cardiologist
    assert saved["score_difference"] == 38 - 64
    assert saved["is_clinical"] is True and saved["reviewer_expert_type"] == "Cardiologist"
    assert world["cases"].rc["status"] == "complete" and world["cases"].rc["completed_at"]


def test_score_is_optional(world):
    saved = review_sections.submit_cardiology(ROUND, {**GOOD, "expert_score": "", "expert_tier": "Moderate"}, as_user("cardio"))
    assert saved["expert_score"] is None and saved["score_difference"] is None
    assert saved["tier_agreement"] == "agree"


def test_unverified_cardiologist_review_is_practice(world):
    world["profiles"].people["cardio"]["is_verified_clinician"] = False
    assert review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))["is_clinical"] is False


@pytest.mark.parametrize("who", ["diet", "pt", "admin"])
def test_only_cardiologists_submit_cardiology(world, who):
    with pytest.raises(HTTPException) as exc:
        review_sections.submit_cardiology(ROUND, GOOD, as_user(who))
    assert exc.value.status_code == 403


@pytest.mark.parametrize("bad", [
    {"expert_tier": "Fine"}, {"expert_score": 0}, {"expert_score": 101}, {"expert_score": "abc"},
    {"reasons": []}, {"reasons": ["nonsense"]}, {"confidence": "very"}, {"checkup_flag": "maybe"},
    {"notes": "x" * 2001},
])
def test_cardiology_validation(world, bad):
    with pytest.raises(HTTPException) as exc:
        review_sections.submit_cardiology(ROUND, {**GOOD, **bad}, as_user("cardio"))
    assert exc.value.status_code == 400
    assert world["cases"].rc["status"] == "open"


def test_archived_round_is_closed(world):
    world["cases"].rc["status"] = "archived"
    with pytest.raises(HTTPException) as exc:
        review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    assert exc.value.status_code == 400


# --- what reviewers see ------------------------------------------------------------------------------

def test_app_level_hidden_until_cardiology_is_in(world):
    before = review_sections.case_detail(ROUND, as_user("diet"))
    assert before["app"] is None
    assert before["patient"]["sex"] == "male" and before["patient"]["age"] is not None
    assert [r["name"] for r in before["recommendations"]["recipes"]] == ["Garlic tofu", "Oatmeal with banana"]
    assert before["viewer"]["can_submit"] == {"cardiology": False, "nutrition": True, "exercise": False}

    review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    after = review_sections.case_detail(ROUND, as_user("diet"))
    assert after["app"] == {"tier": "Moderate", "score": 64, "scorer": "bp_rules"}
    assert after["sections"]["cardiology"]["tier_agreement"] == "under"


def test_unknown_round_is_404(world):
    with pytest.raises(HTTPException) as exc:
        review_sections.case_detail(str(uuid.uuid4()), as_user("cardio"))
    assert exc.value.status_code == 404


# --- food and exercise checks -----------------------------------------------------------------------

def test_dietitian_checks_every_recipe(world):
    items = [{"item_id": "r1", "verdict": "ok"}, {"item_id": "r2", "verdict": "no", "note": "High sugar for this patient"}]
    saved = review_sections.submit_items("nutrition", ROUND, {"items": items}, as_user("diet"))
    assert {v["item_id"]: v["verdict"] for v in saved["item_verdicts"]} == {"r1": "ok", "r2": "no"}
    assert all(v["item_type"] == "recipe" for v in saved["item_verdicts"])
    assert world["cases"].rc["status"] == "open"        # only the Cardiologist completes a round


@pytest.mark.parametrize("items, code", [
    ([{"item_id": "r1", "verdict": "ok"}], 400),                                                   # one missing
    ([{"item_id": "r1", "verdict": "ok"}, {"item_id": "r2", "verdict": "no"}], 400),               # no reason
    ([{"item_id": "r1", "verdict": "ok"}, {"item_id": "r2", "verdict": "changes", "note": "x"}], 400),  # PT-only verdict
    ([{"item_id": "r1", "verdict": "ok"}, {"item_id": "r4", "verdict": "ok"}], 400),               # not recommended
])
def test_food_check_validation(world, items, code):
    with pytest.raises(HTTPException) as exc:
        review_sections.submit_items("nutrition", ROUND, {"items": items}, as_user("diet"))
    assert exc.value.status_code == code


def test_pt_can_suggest_changes(world):
    items = [{"item_id": "e1", "verdict": "ok"}, {"item_id": "e2", "verdict": "changes", "note": "Lighter band"}]
    saved = review_sections.submit_items("exercise", ROUND, {"items": items}, as_user("pt"))
    assert saved["item_verdicts"][1]["verdict"] == "changes"


@pytest.mark.parametrize("section, who", [("nutrition", "pt"), ("exercise", "diet"), ("nutrition", "cardio")])
def test_sections_belong_to_their_expert_type(world, section, who):
    with pytest.raises(HTTPException) as exc:
        review_sections.submit_items(section, ROUND, {"items": []}, as_user(who))
    assert exc.value.status_code == 403
