"""Domain rules for drafting, reviewing, approving, and publishing content."""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.db.repositories import (
    get_content_repo,
    get_content_workflow_repo,
    get_profile_repo,
)


CONTENT_TYPES = {"recipe", "exercise"}
EDITOR_ROLES = {"admin", "super_admin"}
REQUIRED_SPECIALIZATION = {
    "recipe": "Dietitian",
    "exercise": "Physical Therapist",
}
VALID_DECISIONS = {"approved", "changes_requested", "rejected"}


def _clean_content_type(content_type: str) -> str:
    value = (content_type or "").strip().lower()
    if value not in CONTENT_TYPES:
        raise HTTPException(status_code=404, detail="Unsupported content type")
    return value


def _get_item(content_type: str, content_id: str) -> Optional[Dict[str, Any]]:
    repo = get_content_repo()
    if content_type == "recipe":
        return repo.get_recipe(content_id)
    return repo.get_routine(content_id)


def _update_item(content_type: str, content_id: str, patch: Dict[str, Any]):
    repo = get_content_repo()
    if content_type == "recipe":
        return repo.update_recipe(content_id, patch)
    return repo.update_routine(content_id, patch)


def _actor_profile(actor: Dict[str, Any]) -> Dict[str, Any]:
    actor_id = actor.get("user_id")
    return get_profile_repo().get_by_id(actor_id) or actor


def _require_editor(actor: Dict[str, Any]) -> None:
    if actor.get("role") not in EDITOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an administrator can draft or submit content.",
        )


def required_specializations(content_type: str, item: Dict[str, Any]) -> List[str]:
    required = [REQUIRED_SPECIALIZATION[content_type]]
    if item.get("requires_cardiologist_review"):
        required.append("Cardiologist")
    return required


def current_reviews(content_type: str, item: Dict[str, Any]) -> List[Dict[str, Any]]:
    version = int(item.get("content_version") or 1)
    reviews = get_content_workflow_repo().list_reviews(content_type, str(item["id"]))
    return [review for review in reviews if int(review.get("content_version") or 0) == version]


def approval_summary(
    content_type: str,
    item: Dict[str, Any],
    reviews: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    reviews = current_reviews(content_type, item) if reviews is None else reviews
    required = required_specializations(content_type, item)
    decisions = {}
    for specialization in required:
        specialization_decisions = [
            review.get("decision") for review in reviews
            if review.get("reviewer_specialization") == specialization
        ]
        if any(decision in {"changes_requested", "rejected"} for decision in specialization_decisions):
            decisions[specialization] = "changes_requested"
        elif "approved" in specialization_decisions:
            decisions[specialization] = "approved"
    missing = [specialization for specialization in required if decisions.get(specialization) != "approved"]
    return {
        "approved": not missing,
        "required_specializations": required,
        "missing_approvals": missing,
        "decisions": decisions,
    }


def _present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict, tuple, set)):
        return bool(value)
    return True


def completeness_issues(content_type: str, item: Dict[str, Any]) -> List[str]:
    common = {
        "name": "Title",
        "intended_audiences": "Intended audience",
        "evidence_sources": "Evidence source",
    }
    recipe = {
        "category": "Category",
        "yield_description": "Recipe yield",
        "servings": "Servings",
        "serving_description": "Serving description",
        "prep_time_minutes": "Preparation time",
        "ingredients": "Ingredients with household and metric measures",
        "steps": "Preparation steps",
        "nutrient_source": "Nutrient source",
        "nutrient_source_record_id": "Nutrient source record ID",
        "nutrition_totals": "Total-recipe nutrition",
        "allergen_notes": "Allergen statement (use “None known” when applicable)",
        "contraindication_notes": "Contraindication statement (use “None known” when applicable)",
    }
    exercise = {
        "description": "Description",
        "type": "Activity type",
        "intensity": "Intensity",
        "duration_minutes": "Duration",
        "frequency_guidance": "Frequency guidance",
        "progression_guidance": "Progression guidance",
        "steps": "Instructions",
        "modifications": "Modifications",
        "contraindications": "Contraindications",
        "clearance_notes": "Clearance guidance",
        "stop_symptoms": "Stop-exercise symptoms",
    }
    fields = {**common, **(recipe if content_type == "recipe" else exercise)}
    issues = [label for key, label in fields.items() if not _present(item.get(key))]

    if content_type == "recipe":
        ingredients = item.get("ingredients") or []
        incomplete = any(
            not _present(ingredient.get("name"))
            or not (_present(ingredient.get("metric_amount")) and _present(ingredient.get("metric_unit")))
            or not (
                (_present(ingredient.get("household_amount")) and _present(ingredient.get("household_unit")))
                or (_present(ingredient.get("amount")) and _present(ingredient.get("unit")))
            )
            for ingredient in ingredients
            if isinstance(ingredient, dict)
        )
        if incomplete:
            issues.append("Every ingredient needs household and metric measures")
    return issues


def record_version_snapshot(
    content_type: str,
    item: Dict[str, Any],
    actor_id: Optional[str],
    change_notes: str = "",
) -> Dict[str, Any]:
    return get_content_workflow_repo().create_version({
        "content_type": content_type,
        "content_id": item["id"],
        "content_version": int(item.get("content_version") or 1),
        "snapshot": item,
        "change_notes": change_notes or item.get("change_notes") or "",
        "created_by": actor_id,
    })


def workflow_detail(content_type: str, content_id: str) -> Dict[str, Any]:
    content_type = _clean_content_type(content_type)
    item = _get_item(content_type, content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    reviews = get_content_workflow_repo().list_reviews(content_type, content_id)
    profile_repo = get_profile_repo()
    decorated_reviews = []
    for review in reviews:
        profile = profile_repo.get_by_id(review.get("reviewer_id")) or {}
        reviewer_name = " ".join(filter(None, [profile.get("first_name"), profile.get("last_name")])).strip()
        decorated_reviews.append({
            **review,
            "reviewer_name": reviewer_name or profile.get("email") or "Verified reviewer",
        })
    reviews = decorated_reviews
    versions = get_content_workflow_repo().list_versions(content_type, content_id)
    version = int(item.get("content_version") or 1)
    current = [review for review in reviews if int(review.get("content_version") or 0) == version]
    approval = approval_summary(content_type, item, current)
    issues = completeness_issues(content_type, item)
    blockers = list(issues)
    blockers.extend(f"Missing {name} approval for version {version}" for name in approval["missing_approvals"])
    return {
        "item": item,
        "reviews": reviews,
        "versions": versions,
        "current_reviews": current,
        "approval": approval,
        "completeness_issues": issues,
        "publish_blockers": blockers,
    }


def workflow_overview(content_type: str) -> Dict[str, Dict[str, Any]]:
    content_type = _clean_content_type(content_type)
    items = get_content_repo().list_recipes() if content_type == "recipe" else get_content_repo().list_routines()
    reviews = get_content_workflow_repo().list_reviews(content_type)
    by_item: Dict[str, List[Dict[str, Any]]] = {}
    for review in reviews:
        by_item.setdefault(str(review.get("content_id")), []).append(review)

    result = {}
    for item in items:
        item_id = str(item.get("id"))
        version = int(item.get("content_version") or 1)
        current = [
            review for review in by_item.get(item_id, [])
            if int(review.get("content_version") or 0) == version
        ]
        approval = approval_summary(content_type, item, current)
        result[item_id] = {
            "approval": approval,
            "current_reviews": current,
            "review_count": len(by_item.get(item_id, [])),
            "completeness_issues": completeness_issues(content_type, item),
        }
    return result


def submit_for_review(content_type: str, content_id: str, actor: Dict[str, Any]) -> Dict[str, Any]:
    content_type = _clean_content_type(content_type)
    _require_editor(actor)
    item = _get_item(content_type, content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    if item.get("status") not in {"draft", "changes_requested"}:
        raise HTTPException(status_code=409, detail="Only a draft or changes-requested item can be submitted.")
    issues = completeness_issues(content_type, item)
    if issues:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Complete all required content fields before review.", "missing_fields": issues},
        )
    updated = _update_item(content_type, content_id, {"status": "in_review", "expert_validated": False})
    return workflow_detail(content_type, str(updated["id"]))


def add_review(
    content_type: str,
    content_id: str,
    payload: Dict[str, Any],
    actor: Dict[str, Any],
) -> Dict[str, Any]:
    content_type = _clean_content_type(content_type)
    if actor.get("role") != "medical_expert":
        raise HTTPException(status_code=403, detail="Only an assigned medical expert can review content.")
    item = _get_item(content_type, content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    if item.get("status") != "in_review":
        raise HTTPException(status_code=409, detail="This content version is not currently in review.")

    profile = _actor_profile(actor)
    specialization = profile.get("expert_type")
    required = required_specializations(content_type, item)
    if specialization not in required:
        raise HTTPException(
            status_code=403,
            detail=f"This version requires review by: {', '.join(required)}.",
        )
    decision = (payload.get("decision") or "").strip().lower()
    comments = (payload.get("comments") or "").strip()
    evidence_checked = payload.get("evidence_checked") or []
    if decision not in VALID_DECISIONS:
        raise HTTPException(status_code=422, detail="Choose approved, changes_requested, or rejected.")
    if not comments:
        raise HTTPException(status_code=422, detail="Review comments are required.")
    if decision == "approved" and not evidence_checked:
        raise HTTPException(status_code=422, detail="Confirm at least one checked evidence source before approval.")

    version = int(item.get("content_version") or 1)
    existing = current_reviews(content_type, item)
    if any(review.get("reviewer_id") == actor.get("user_id") for review in existing):
        raise HTTPException(status_code=409, detail="You already recorded a decision for this version.")

    review = get_content_workflow_repo().create_review({
        "content_type": content_type,
        "content_id": item["id"],
        "content_version": version,
        "reviewer_id": actor["user_id"],
        "reviewer_specialization": specialization,
        "decision": decision,
        "comments": comments,
        "evidence_checked": evidence_checked,
    })
    all_current = [review, *existing]
    approval = approval_summary(content_type, item, all_current)
    if decision in {"changes_requested", "rejected"}:
        next_status = "changes_requested"
    elif approval["approved"]:
        next_status = "approved"
    else:
        next_status = "in_review"
    _update_item(content_type, content_id, {
        "status": next_status,
        "expert_validated": approval["approved"],
    })
    return workflow_detail(content_type, content_id)


def publish(content_type: str, content_id: str, actor: Dict[str, Any]) -> Dict[str, Any]:
    content_type = _clean_content_type(content_type)
    if actor.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only the Superadmin can publish content.")
    detail = workflow_detail(content_type, content_id)
    item = detail["item"]
    if item.get("status") != "approved":
        raise HTTPException(status_code=409, detail="Only an approved content version can be published.")
    if detail["publish_blockers"]:
        raise HTTPException(status_code=409, detail={
            "message": "Publication is blocked.",
            "blockers": detail["publish_blockers"],
        })
    _update_item(content_type, content_id, {"status": "published", "expert_validated": True})
    return workflow_detail(content_type, content_id)


def archive(content_type: str, content_id: str, actor: Dict[str, Any]) -> Dict[str, Any]:
    content_type = _clean_content_type(content_type)
    if actor.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only the Superadmin can archive content.")
    item = _get_item(content_type, content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    if item.get("status") not in {"published", "approved"}:
        raise HTTPException(status_code=409, detail="Only approved or published content can be archived.")
    _update_item(content_type, content_id, {"status": "archived"})
    return workflow_detail(content_type, content_id)


def restore(content_type: str, content_id: str, actor: Dict[str, Any]) -> Dict[str, Any]:
    content_type = _clean_content_type(content_type)
    _require_editor(actor)
    item = _get_item(content_type, content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    if item.get("status") != "archived":
        raise HTTPException(status_code=409, detail="Only archived content can be restored.")
    next_version = int(item.get("content_version") or 1) + 1
    updated = _update_item(content_type, content_id, {
        "status": "draft",
        "content_version": next_version,
        "expert_validated": False,
        "change_notes": "Restored from archive for a new review cycle",
    })
    record_version_snapshot(content_type, updated, actor.get("user_id"), updated.get("change_notes"))
    return workflow_detail(content_type, content_id)


def is_current_version_approved(content_type: str, item: Dict[str, Any]) -> bool:
    return approval_summary(content_type, item)["approved"]
