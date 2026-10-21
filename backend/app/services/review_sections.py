"""
HL-055 / HL-056: the expert sections of a review round.

- cardiology (Cardiologist): risk level, optional 1-100, reasons, confidence, checkup flag, note.
  Submitting it completes the round. Only then is the app's own level shown, as a computed comparison.
- nutrition (Dietitian): a verdict on each recipe the app recommends for this case.
- exercise (Physical Therapist): a verdict on each exercise the app recommends for this case.

A review counts as clinical only if the reviewer is a verified clinician when they submit it.
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.db.repositories import get_case_review_repo, get_content_repo, get_profile_repo
from app.services import review_feedback, review_rules as rules
from app.services.review_queue import _age, section_progress
from app.services.exercises import is_visible_to_patients
from app.services.recipes import is_visible_to_patients as recipe_visible
from app.utils.time import parse_utc, utc_now

logger = logging.getLogger(__name__)

SECTION_EXPERT_TYPE = {"cardiology": "Cardiologist", "nutrition": "Dietitian", "exercise": "Physical Therapist"}
REASONS = ("blood_pressure", "heart_rate", "symptoms", "medication", "activity",
           "nutrition_sodium", "sleep", "baseline_information", "other")
CONFIDENCE = ("low", "medium", "high")
CHECKUP = ("not_needed", "within_2_weeks", "asap")
VERDICTS = {"nutrition": ("ok", "no"), "exercise": ("ok", "changes", "no")}
RECIPES_SHOWN = 2
EXERCISES_SHOWN = 3
MAX_NOTE = 2000


def _bad(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def get_round_or_404(round_id: str) -> Dict[str, Any]:
    rc = get_case_review_repo().get_review_case(round_id)
    if not rc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review case not found")
    return rc


def recommendations_for(rc: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """The recipes and exercises the app recommends at this case's level (published only, stable order)."""
    tier = rc.get("app_tier")
    content = get_content_repo()
    recipes = [r for r in content.list_recipes() if recipe_visible(r) and r.get("hss_tier") == tier]
    routines = [r for r in content.list_routines() if is_visible_to_patients(r) and r.get("hss_tier") == tier]
    pick = lambda rows, n: [{"id": str(r["id"]), "name": r.get("name")} for r in sorted(rows, key=lambda r: r.get("name") or "")[:n]]
    return {"recipes": pick(recipes, RECIPES_SHOWN), "exercises": pick(routines, EXERCISES_SHOWN)}


def _viewer(current_user: Dict[str, Any], rc: Dict[str, Any]) -> Dict[str, Any]:
    profile = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    role = profile.get("role") or current_user.get("role")
    expert_type = profile.get("expert_type")
    open_for_work = rc.get("status") in ("open", "complete")
    can = {section: role == "medical_expert" and expert_type == needed and open_for_work
           for section, needed in SECTION_EXPERT_TYPE.items()}
    return {"role": role, "expert_type": expert_type,
            "verified_clinician": bool(profile.get("is_verified_clinician")), "can_submit": can}


def _section_view(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    keep = ("section", "reviewer_name", "reviewer_expert_type", "is_clinical", "expert_tier", "expert_score",
            "reasons", "confidence", "checkup_flag", "tier_agreement", "score_difference", "item_verdicts",
            "notes", "created_at", "updated_at")
    return {k: row.get(k) for k in keep}


def case_detail(round_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    rc = get_round_or_404(round_id)
    sections = {s["section"]: s for s in get_case_review_repo().list_sections(review_case_id=rc["id"])}
    snap = rc.get("input_snapshot") or {}
    now = utc_now()
    opened = parse_utc(rc.get("created_at")) or now
    hours = max(0, int((now - opened).total_seconds() // 3600))
    cardiology_done = "cardiology" in sections
    recommendations = recommendations_for(rc)
    return {
        "id": rc["id"],
        "case_code": rc.get("case_code"),
        "lane": rc.get("lane"),
        "reason": rc.get("reason"),
        "status": rc.get("status"),
        "opened_at": rc.get("created_at"),
        "waiting_hours": hours,
        "overdue": rc.get("lane") == "urgent" and rc.get("status") == "open" and hours > rules.URGENT_REVIEW_HOURS,
        "patient": {"age": _age(snap.get("date_of_birth"), now), "sex": snap.get("sex"),
                    "height_cm": snap.get("height_cm"), "weight_kg": snap.get("weight_kg")},
        "onboarding": snap.get("onboarding") or {},
        "clinical": snap.get("clinical") or {},
        "timeline": snap.get("timeline") or [],
        "recommendations": recommendations,
        "sections": {name: _section_view(sections.get(name)) for name in SECTION_EXPERT_TYPE},
        "progress": section_progress(rc, set(sections), recommendations),
        # Kept from reviewers until the Cardiologist has given their own level
        "app": {"tier": rc.get("app_tier"), "score": rc.get("app_score"), "scorer": rc.get("app_scorer")} if cardiology_done else None,
        "viewer": _viewer(current_user, rc),
    }


def _require_section_reviewer(section: str, current_user: Dict[str, Any], rc: Dict[str, Any]) -> Dict[str, Any]:
    profile = get_profile_repo().get_by_id(current_user.get("user_id")) or {}
    needed = SECTION_EXPERT_TYPE[section]
    if profile.get("role") != "medical_expert" or profile.get("expert_type") != needed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Only a {needed} can submit this section.")
    if rc.get("status") == "archived":
        raise _bad("This case is archived.")
    return profile


def _reviewer_fields(profile: Dict[str, Any]) -> Dict[str, Any]:
    name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or profile.get("email") or "Medical expert"
    return {"expert_id": profile.get("id"), "reviewer_name": name,
            "reviewer_expert_type": profile.get("expert_type"),
            "is_clinical": bool(profile.get("is_verified_clinician"))}


def _clean_note(value: Any) -> str:
    note = str(value or "").strip()
    if len(note) > MAX_NOTE:
        raise _bad(f"Notes are limited to {MAX_NOTE} characters.")
    return note


def compare(expert_tier: str, app_tier: Optional[str]) -> Optional[str]:
    """agree, under (the app rated the patient less risky than the expert) or over."""
    if app_tier not in rules.TIERS:
        return None
    e, a = rules.TIERS.index(expert_tier), rules.TIERS.index(app_tier)
    return "agree" if e == a else ("under" if e > a else "over")


def submit_cardiology(round_id: str, payload: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
    rc = get_round_or_404(round_id)
    profile = _require_section_reviewer("cardiology", current_user, rc)

    tier = payload.get("expert_tier")
    if tier not in rules.TIERS:
        raise _bad("Choose a risk level: Stable, Moderate, Elevated Risk or Critical.")
    score = payload.get("expert_score")
    if score in ("", None):
        score = None
    else:
        try:
            score = int(score)
        except (TypeError, ValueError):
            raise _bad("The score must be a whole number from 1 to 100.")
        if not 1 <= score <= 100:
            raise _bad("The score must be a whole number from 1 to 100.")
    reasons = [r for r in dict.fromkeys(payload.get("reasons") or []) if r in REASONS]
    if not reasons:
        raise _bad("Choose at least one main reason.")
    confidence = payload.get("confidence")
    if confidence not in CONFIDENCE:
        raise _bad("Choose a confidence: low, medium or high.")
    checkup = payload.get("checkup_flag")
    if checkup not in CHECKUP:
        raise _bad("Choose whether an in-person checkup is needed.")

    app_score = rc.get("app_score")
    data = {
        **_reviewer_fields(profile),
        "expert_tier": tier,
        "expert_score": score,
        "reasons": reasons,
        "confidence": confidence,
        "checkup_flag": checkup,
        "tier_agreement": compare(tier, rc.get("app_tier")),
        "score_difference": (score - app_score) if (score is not None and app_score is not None) else None,
        "notes": _clean_note(payload.get("notes")),
        "status": "submitted",
    }
    repo = get_case_review_repo()
    saved = repo.save_section(rc["id"], "cardiology", data)
    if rc.get("status") == "open":
        repo.update_review_case(rc["id"], {"status": "complete", "completed_at": utc_now().isoformat()})
    review_feedback.notify_checkup(rc, checkup)  # HL-057: only while the setting is on
    return saved


def submit_items(section: str, round_id: str, payload: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
    rc = get_round_or_404(round_id)
    profile = _require_section_reviewer(section, current_user, rc)
    item_type = "recipe" if section == "nutrition" else "exercise"
    shown = recommendations_for(rc)["recipes" if section == "nutrition" else "exercises"]
    names = {item["id"]: item["name"] for item in shown}

    given = {str(item.get("item_id")): item for item in (payload.get("items") or [])}
    if set(given) != set(names):
        raise _bad("Give a verdict for every recommended item, and only those.")
    verdicts = []
    for item_id, item in given.items():
        verdict = item.get("verdict")
        if verdict not in VERDICTS[section]:
            raise _bad("Each item needs a verdict: " + ", ".join(VERDICTS[section]) + ".")
        note = _clean_note(item.get("note"))
        if verdict != "ok" and not note:
            raise _bad(f"Say why \"{names[item_id]}\" is not suitable or what should change.")
        verdicts.append({"item_type": item_type, "item_id": item_id, "item_name": names[item_id],
                         "verdict": verdict, "note": note})

    data = {**_reviewer_fields(profile), "item_verdicts": verdicts,
            "notes": _clean_note(payload.get("notes")), "status": "submitted"}
    saved = get_case_review_repo().save_section(rc["id"], section, data)
    review_feedback.record_not_suitable(rc, verdicts)  # HL-056 records; HL-057 hides them once switched on
    return saved
