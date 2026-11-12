"""
HL-055 / HL-056: the expert sections of a review round.

- cardiology (Cardiologist): the Heart risk band they would give (HL-153), an optional 10-year risk %, reasons,
  confidence, checkup flag, note. Submitting it completes the round. Only then is the app's own Heart risk shown, as a
  computed comparison. Older reviews (before HL-153) gave a habits-style level instead.
- nutrition (Dietitian): a verdict on each recipe the app recommends for this case.
- exercise (Physical Therapist): a verdict on each exercise the app recommends for this case.

2026-11-12: the lists are built the way the app's Dashboard builds them, so experts judge what the patient actually gets:
recipes at the patient's level or "Stable", without ones that clash with their allergies or diet; exercises by their
exercise safety check (PAR-Q+) result, never by the score (HL-123). The PAR-Q+ result is shown with the exercise list.

A review counts as clinical only if the reviewer is a verified clinician when they submit it.
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.db.repositories import get_case_review_repo, get_content_repo, get_health_logs_repo, get_profile_repo
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


def exercise_check_for(rc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """The patient's exercise safety check (PAR-Q+) today, as the app uses it. None for a round without a patient."""
    from app.services import exercise_screening
    from app.services.dashboard import latest_severe_symptom_at

    patient_id = rc.get("patient_id")
    if not patient_id:
        return None
    try:
        logs = get_health_logs_repo().list_user_logs(patient_id, limit=50)
    except Exception:
        logs = []
    return exercise_screening.expert_view(patient_id, latest_severe_symptom_at(logs))


def recommendations_for(rc: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """The recipes and exercises the app recommends for this case (published and approved only, stable order)."""
    from app.services import exercise_screening
    from app.services.dashboard import recipe_warnings

    tier = rc.get("app_tier")
    content = get_content_repo()
    # The diet and allergies the reviewers see, frozen when the round opened
    answers = (rc.get("input_snapshot") or {}).get("onboarding") or {}
    diet, allergies = answers.get("dietary_practice") or "", answers.get("allergies") or []
    recipes = [
        r for r in content.list_recipes()
        if recipe_visible(r) and r.get("hss_tier") in (tier, "Stable") and not recipe_warnings(r, diet, allergies)
    ]
    check = exercise_check_for(rc)
    if check is None:
        # A round without a patient (older data): the earlier rule, by level
        routines = [r for r in content.list_routines() if is_visible_to_patients(r) and r.get("hss_tier") == tier]
    else:
        routines = [r for r in content.list_routines() if is_visible_to_patients(r) and exercise_screening.allows(check, r)]
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
            "expert_risk_band", "expert_risk_percent", "risk_agreement", "risk_difference",
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
        # 2026-11-12: what the PAR-Q+ allows today, shown with the Physical Therapist's exercise list
        "exercise_check": exercise_check_for(rc),
        "sections": {name: _section_view(sections.get(name)) for name in SECTION_EXPERT_TYPE},
        "progress": section_progress(rc, set(sections), recommendations),
        # Kept from reviewers until the Cardiologist has given their own level. HL-146: the Heart risk saved when the
        # round opened (None for older rounds) is shown with it, as extra information
        "app": {"tier": rc.get("app_tier"), "score": rc.get("app_score"), "scorer": rc.get("app_scorer"),
                "heart_risk": snap.get("heart_risk"),
                # HL-153: what the Cardiologist's band is compared with
                "risk": {"band": rc.get("app_risk_band"), "percent": rc.get("app_risk_percent"),
                         "kind": rc.get("app_risk_kind")} if rc.get("app_risk_band") else None,
                } if cardiology_done else None,
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


def compare(expert: str, app: Optional[str], levels=rules.RISK_BANDS) -> Optional[str]:
    """agree, under (the app rated the patient less risky than the expert) or over. None when the app has nothing."""
    if app not in levels or expert not in levels:
        return None
    e, a = levels.index(expert), levels.index(app)
    return "agree" if e == a else ("under" if e > a else "over")


def submit_cardiology(round_id: str, payload: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
    rc = get_round_or_404(round_id)
    profile = _require_section_reviewer("cardiology", current_user, rc)

    band = payload.get("expert_risk_band")
    if band not in rules.RISK_BANDS:
        raise _bad("Choose a Heart risk band: Low, Borderline, Intermediate or High.")
    percent = payload.get("expert_risk_percent")
    if percent in ("", None):
        percent = None
    else:
        try:
            percent = round(float(percent), 1)
        except (TypeError, ValueError):
            raise _bad("The 10-year risk must be a number from 0.1 to 100.")
        if not 0 < percent <= 100:
            raise _bad("The 10-year risk must be a number from 0.1 to 100.")
    reasons = [r for r in dict.fromkeys(payload.get("reasons") or []) if r in REASONS]
    if not reasons:
        raise _bad("Choose at least one main reason.")
    confidence = payload.get("confidence")
    if confidence not in CONFIDENCE:
        raise _bad("Choose a confidence: low, medium or high.")
    checkup = payload.get("checkup_flag")
    if checkup not in CHECKUP:
        raise _bad("Choose whether an in-person checkup is needed.")

    app_percent = rc.get("app_risk_percent")
    data = {
        **_reviewer_fields(profile),
        "expert_risk_band": band,
        "expert_risk_percent": percent,
        "reasons": reasons,
        "confidence": confidence,
        "checkup_flag": checkup,
        # HL-153: compared with the app's Heart risk when the round opened (None when it had none)
        "risk_agreement": compare(band, rc.get("app_risk_band")),
        "risk_difference": round(percent - float(app_percent), 1) if (percent is not None and app_percent is not None) else None,
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
