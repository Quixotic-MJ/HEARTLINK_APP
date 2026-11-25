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
            {"id": "r2", "name": "Oatmeal with banana", "hss_tier": "Moderate", "status": "published", "expert_validated": True},
            {"id": "r1", "name": "Garlic tofu", "hss_tier": "Moderate", "status": "published", "expert_validated": True},
            {"id": "r3", "name": "Draft stew", "hss_tier": "Moderate", "status": "draft", "expert_validated": True},
            {"id": "r4", "name": "Fried fish", "hss_tier": "Critical", "status": "published", "expert_validated": True},
            # HL-037: not Dietitian-approved, so the review never lists it.
            {"id": "r5", "name": "Pancit", "hss_tier": "Moderate", "status": "published", "expert_validated": False},
            # 2026-11-12: the app also suggests "Stable" recipes, minus ones that clash with allergies
            {"id": "r6", "name": "Vegetable soup", "hss_tier": "Stable", "status": "published", "expert_validated": True},
            {"id": "r7", "name": "Shrimp sinigang", "hss_tier": "Stable", "status": "published", "expert_validated": True,
             "ingredients": [{"name": "shrimp"}]},
        ]

    def list_routines(self):
        return [
            {"id": "e1", "name": "Brisk walking", "hss_tier": "Moderate", "status": "published", "expert_validated": True},
            {"id": "e2", "name": "Band rows", "hss_tier": "Moderate", "status": "published", "expert_validated": True},
            # HL-026: not PT-approved, so patients never get it and the review never lists it.
            {"id": "e3", "name": "Arm circles", "hss_tier": "Moderate", "status": "published", "expert_validated": False},
            # 2026-11-12: listed by the PAR-Q+ result, not the level
            {"id": "e4", "name": "Chair march", "hss_tier": "Critical", "status": "published", "expert_validated": True,
             "difficulty_level": "Beginner"},
            {"id": "e5", "name": "Box breathing", "hss_tier": "Critical", "type": "Breathing", "status": "published",
             "expert_validated": True},
        ]


def expert(uid, kind, verified=False, role="medical_expert"):
    return {"id": uid, "role": role, "expert_type": kind, "first_name": "Dr", "last_name": kind,
            "is_verified_clinician": verified}


@pytest.fixture
def world(monkeypatch):
    rc = {"id": ROUND, "case_code": "CASE-0042", "lane": "urgent", "reason": "BP 182/121 logged Oct 12",
          "status": "open", "app_tier": "Moderate", "app_score": 64, "app_scorer": "bp_rules",
          # HL-153: the app's Heart risk when the round opened
          "app_risk_band": "borderline", "app_risk_percent": 4.2, "app_risk_kind": "estimated",
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


GOOD = {"expert_risk_band": "high", "expert_risk_percent": "12.5", "reasons": ["blood_pressure", "symptoms", "nonsense"],
        "confidence": "high", "checkup_flag": "asap", "notes": "Crisis-range reading with headache."}


# --- cardiology --------------------------------------------------------------------------------------

def test_cardiologist_review_completes_round_and_compares(world):
    saved = review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))

    # HL-153: a Heart risk band and an optional %, compared with the app's Heart risk
    assert saved["expert_risk_band"] == "high" and saved["expert_risk_percent"] == 12.5
    assert saved["reasons"] == ["blood_pressure", "symptoms"]
    assert saved["risk_agreement"] == "under"          # the app said Borderline: less risky than the cardiologist
    assert saved["risk_difference"] == 8.3             # 12.5 - 4.2 percentage points
    assert "expert_tier" not in saved
    assert saved["is_clinical"] is True and saved["reviewer_expert_type"] == "Cardiologist"
    assert world["cases"].rc["status"] == "complete" and world["cases"].rc["completed_at"]


def test_score_is_optional(world):
    saved = review_sections.submit_cardiology(ROUND, {**GOOD, "expert_risk_percent": "", "expert_risk_band": "borderline"},
                                              as_user("cardio"))
    assert saved["expert_risk_percent"] is None and saved["risk_difference"] is None
    assert saved["risk_agreement"] == "agree"


def test_a_round_without_an_app_heart_risk_has_nothing_to_compare(world):
    """HL-153: under 30 or over 79 there's no app band, so the review counts for nothing in Model Check."""
    world["cases"].rc.update({"app_risk_band": None, "app_risk_percent": None, "app_risk_kind": None})
    saved = review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    assert saved["risk_agreement"] is None and saved["risk_difference"] is None
    assert world["cases"].rc["status"] == "complete"


def test_unverified_cardiologist_review_is_practice(world):
    world["profiles"].people["cardio"]["is_verified_clinician"] = False
    assert review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))["is_clinical"] is False


@pytest.mark.parametrize("who", ["diet", "pt", "admin"])
def test_only_cardiologists_submit_cardiology(world, who):
    with pytest.raises(HTTPException) as exc:
        review_sections.submit_cardiology(ROUND, GOOD, as_user(who))
    assert exc.value.status_code == 403


@pytest.mark.parametrize("bad", [
    {"expert_risk_band": "Critical"}, {"expert_risk_band": None}, {"expert_risk_percent": 0},
    {"expert_risk_percent": 101}, {"expert_risk_percent": "abc"},
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
    assert after["app"] == {"tier": "Moderate", "score": 64, "scorer": "bp_rules", "heart_risk": None,
                            "risk": {"band": "borderline", "percent": 4.2, "kind": "estimated"}}
    assert after["sections"]["cardiology"]["risk_agreement"] == "under"


def test_heart_risk_shown_with_the_app_level_after_cardiology(world):
    """HL-146: the Heart risk saved in the snapshot stays hidden with the app's level, then shows beside it."""
    risk = {"percent": 12.4, "band": "high", "kind": "estimated", "at": "2026-11-11T00:00:00+00:00"}
    world["cases"].rc["input_snapshot"] = {**(world["cases"].rc.get("input_snapshot") or {}), "heart_risk": risk}
    assert review_sections.case_detail(ROUND, as_user("diet"))["app"] is None
    review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    assert review_sections.case_detail(ROUND, as_user("diet"))["app"]["heart_risk"] == risk


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
    ([{"item_id": "r1", "verdict": "ok"}, {"item_id": "r2", "verdict": "changes"}], 400),          # changes need a note
    ([{"item_id": "r1", "verdict": "ok"}, {"item_id": "r2", "verdict": "maybe"}], 400),            # not a choice
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


def test_the_review_lists_only_pt_approved_exercises(world):
    # HL-026: the exercises the app recommends are the ones patients can actually get.
    ids = [e["id"] for e in review_sections.recommendations_for({"app_tier": "Moderate"})["exercises"]]
    assert "e3" not in ids and set(ids) <= {"e1", "e2"}


@pytest.mark.parametrize("state, expected", [
    ("eligible", {"e2", "e5", "e1"}),  # every approved exercise; 3 shown, by name
    ("caution", {"e4", "e5"}),         # beginner exercises and breathing
    ("locked", {"e5"}),                # breathing only
    ("needed", {"e5"}),
])
def test_the_pt_reviews_the_exercises_the_par_q_allows(world, monkeypatch, state, expected):
    """2026-11-12: like the app (HL-123), the PAR-Q+ result decides, never the level. Breathing is always open."""
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: {"state": state})
    rc = {"app_tier": "Moderate", "patient_id": "p1"}
    assert {e["id"] for e in review_sections.recommendations_for(rc)["exercises"]} == expected


def test_the_dietitian_reviews_the_recipes_the_app_suggests(world, monkeypatch):
    """2026-11-12: the patient's level or "Stable", without the ones that clash with their allergies."""
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: None)
    monkeypatch.setattr(review_sections, "RECIPES_SHOWN", 10)
    rc = {"app_tier": "Moderate", "input_snapshot": {"onboarding": {"allergies": ["shellfish"]}}}
    ids = [r["id"] for r in review_sections.recommendations_for(rc)["recipes"]]
    assert sorted(ids) == ["r1", "r2", "r6"]


def test_the_case_shows_the_par_q_result(world, monkeypatch):
    check = {"state": "caution", "reason": None, "cleared": False, "answered_at": "2026-11-01T08:00:00+00:00", "expires_at": None}
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: check)
    assert review_sections.case_detail(ROUND, as_user("pt"))["exercise_check"] == check


def test_the_review_lists_only_dietitian_approved_recipes(world):
    # HL-037: an unapproved recipe never reaches patients, so the review doesn't list it either.
    ids = [r["id"] for r in review_sections.recommendations_for({"app_tier": "Moderate"})["recipes"]]
    assert "r5" not in ids and set(ids) <= {"r1", "r2"}


# --- HL-165 (panel revision): the Cardiologist approves a case for the dataset ---------------------------------------

ONE_EACH = {"recipes": [{"id": "r1", "name": "Garlic tofu"}], "exercises": [{"id": "e1", "name": "Brisk walking"}]}


@pytest.fixture
def ready(world, monkeypatch):
    """A case with all three parts in: the Cardiologist's review, the food check and the exercise check."""
    monkeypatch.setattr(review_sections, "recommendations_for", lambda rc: ONE_EACH)
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: None)
    review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    review_sections.submit_items("nutrition", ROUND, {"items": [{"item_id": "r1", "verdict": "ok"}]}, as_user("diet"))
    review_sections.submit_items("exercise", ROUND, {"items": [{"item_id": "e1", "verdict": "ok"}]}, as_user("pt"))
    return world


def test_the_cardiologist_approves_a_complete_case_for_the_dataset(ready):
    assert review_sections.case_detail(ROUND, as_user("cardio"))["dataset"]["can_decide"] is True
    review_sections.decide_dataset(ROUND, {"decision": "approve"}, as_user("cardio"))
    rc = ready["cases"].rc
    assert rc["dataset_status"] == "approved" and rc["dataset_decided_by"] == "cardio" and rc["dataset_decided_at"]
    view = review_sections.case_detail(ROUND, as_user("admin"))["dataset"]
    assert (view["status"], view["decided_by_name"], view["can_decide"]) == ("approved", "Dr Cardiologist", False)


def test_leaving_a_case_out_needs_a_reason(ready):
    with pytest.raises(HTTPException) as exc:
        review_sections.decide_dataset(ROUND, {"decision": "leave_out"}, as_user("cardio"))
    assert exc.value.status_code == 400
    review_sections.decide_dataset(ROUND, {"decision": "leave_out", "note": "Cuff readings look wrong"}, as_user("cardio"))
    assert ready["cases"].rc["dataset_status"] == "left_out" and ready["cases"].rc["dataset_note"] == "Cuff readings look wrong"


@pytest.mark.parametrize("who, code", [("diet", 403), ("pt", 403), ("admin", 403)])
def test_only_the_cardiologist_decides(ready, who, code):
    with pytest.raises(HTTPException) as exc:
        review_sections.decide_dataset(ROUND, {"decision": "approve"}, as_user(who))
    assert exc.value.status_code == code


def test_an_unverified_cardiologist_cant_approve(ready):
    ready["profiles"].people["cardio"]["is_verified_clinician"] = False
    with pytest.raises(HTTPException) as exc:
        review_sections.decide_dataset(ROUND, {"decision": "approve"}, as_user("cardio"))
    assert exc.value.status_code == 403


def test_approval_waits_for_the_dietitian_and_the_pt(world, monkeypatch):
    monkeypatch.setattr(review_sections, "recommendations_for", lambda rc: ONE_EACH)
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: None)
    review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    view = review_sections.case_detail(ROUND, as_user("cardio"))["dataset"]
    assert view["waiting_for"] == "the Dietitian and the Physical Therapist" and view["can_decide"] is False
    with pytest.raises(HTTPException) as exc:
        review_sections.decide_dataset(ROUND, {"decision": "approve"}, as_user("cardio"))
    assert exc.value.status_code == 400 and "Dietitian" in exc.value.detail


def test_nothing_to_check_doesnt_hold_up_the_approval(world, monkeypatch):
    monkeypatch.setattr(review_sections, "recommendations_for", lambda rc: {"recipes": [], "exercises": []})
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: None)
    review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    review_sections.decide_dataset(ROUND, {"decision": "approve"}, as_user("cardio"))
    assert world["cases"].rc["dataset_status"] == "approved"


def test_a_part_that_changes_after_approval_sends_the_case_back_to_waiting(ready):
    review_sections.decide_dataset(ROUND, {"decision": "approve"}, as_user("cardio"))
    review_sections.submit_items("exercise", ROUND, {"items": [{"item_id": "e1", "verdict": "changes", "note": "Slower"}]},
                                 as_user("pt"))
    rc = ready["cases"].rc
    assert rc["dataset_status"] == "waiting" and rc["dataset_decided_by"] is None


# --- HL-168: "About this person", nothing sent to the user, plain reasons -------------------------------------------

def test_about_this_person_in_plain_facts():
    snap = {
        "setup_at": "2026-11-23T08:00:00+00:00",
        "onboarding": {"bp_medicine": True, "has_diabetes": False, "ever_smoked": True, "smoke_now": "Every day",
                       "health_conditions": ["kidney_disease"], "doctor_cleared": True},
        # the Heart risk's answer fills a question setup didn't answer
        "heart_risk": {"answers": {"bp_medicine": True, "diabetes": False, "statin": True}},
        "labs": [{"kind": "cholesterol", "test_date": "2026-10-02", "total_cholesterol": 220, "hdl": 45}],
        "timeline": [
            {"type": "Vitals", "data": {"systolic": 152, "diastolic": 94}},
            {"type": "Vitals", "data": {"systolic": 130, "diastolic": 80}},
            {"type": "Vitals", "data": {"heart_rate": 70}},
            {"type": "Symptoms", "data": {"symptoms": ["Dizziness"]}},
            {"type": "Symptoms", "data": {"symptoms": ["Dizziness", "None of these"]}},
        ],
    }
    about = review_sections.about_person(snap)
    assert (about["bp_medicine"], about["diabetes"], about["cholesterol_medicine"]) == (True, False, True)
    assert about["smoking"] == "now"
    assert about["labs"][0]["total_cholesterol"] == 220
    assert about["blood_pressure"] == {"readings": 2, "average": "141/87", "highest": "152/94"}
    assert about["symptoms"] == {"Dizziness": 2}
    assert about["health_check"] == {"asked": True, "conditions": ["kidney_disease"], "doctor_cleared": True}


@pytest.mark.parametrize("snap", [
    {"onboarding": {}},                                                                   # before the health check
    {"setup_at": "2026-11-01T00:00:00+00:00", "onboarding": {"health_conditions": []}},  # set up before Nov 23
])
def test_the_health_check_wasnt_asked_before_nov_23(snap):
    assert review_sections.about_person(snap)["health_check"]["asked"] is False


def test_the_case_page_has_its_step_and_the_facts(world):
    detail = review_sections.case_detail(ROUND, as_user("cardio"))
    assert detail["stage"] == "check" and detail["older"] is True     # the fixture is an older urgent case
    assert detail["about"]["smoking"] == "used to"
    assert "overdue" not in detail and "lane" not in detail


def test_nothing_from_a_review_reaches_the_user(world, monkeypatch):
    """HL-168: case review only builds the dataset; the checkup answer and the verdicts aren't sent anywhere."""
    from app.services import review_feedback

    def boom(*a, **k):
        raise AssertionError("case review must not send anything to the user")

    monkeypatch.setattr(review_feedback, "notify_checkup", boom)
    monkeypatch.setattr(review_feedback, "record_not_suitable", boom)
    review_sections.submit_cardiology(ROUND, GOOD, as_user("cardio"))
    review_sections.submit_items("exercise", ROUND, {"items": [{"item_id": "e1", "verdict": "ok"},
                                                              {"item_id": "e2", "verdict": "no", "note": "Too hard"}]}, as_user("pt"))


def test_plain_reasons_are_accepted(world):
    saved = review_sections.submit_cardiology(ROUND, {**GOOD, "reasons": ["smoking", "cholesterol", "age", "lifestyle"]},
                                              as_user("cardio"))
    assert saved["reasons"] == ["smoking", "cholesterol", "age", "lifestyle"]


def test_the_dietitian_can_say_yes_with_changes(world):
    """HL-168: like the Physical Therapist, the Dietitian can suggest a recipe with changes."""
    items = [{"item_id": "r1", "verdict": "ok"}, {"item_id": "r2", "verdict": "changes", "note": "Less soy sauce"}]
    saved = review_sections.submit_items("nutrition", ROUND, {"items": items}, as_user("diet"))
    assert saved["item_verdicts"][1]["verdict"] == "changes"
