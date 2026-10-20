from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, Query

from app.services.content_workflow import (
    add_review,
    archive,
    publish,
    restore,
    submit_for_review,
    workflow_detail,
    workflow_overview,
)
from app.utils.activity_helper import record_admin_activity
from app.utils.security import get_current_admin_user


router = APIRouter(prefix="/api/content-workflow", tags=["Content workflow"])


def _audit(actor: Dict[str, Any], action: str, content_type: str, detail: Dict[str, Any]):
    item = detail.get("item") or {}
    record_admin_activity(
        admin_user_id=actor.get("user_id") or "staff",
        action=action,
        target_type=content_type,
        target_id=str(item.get("id") or ""),
        target_name=item.get("name"),
        details={"content_version": item.get("content_version"), "status": item.get("status")},
    )


@router.get("/overview")
def get_overview(
    content_type: str = Query(..., pattern="^(recipe|exercise)$"),
    current_user: dict = Depends(get_current_admin_user),
):
    return workflow_overview(content_type)


@router.get("/{content_type}/{content_id}")
def get_detail(
    content_type: str,
    content_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    return workflow_detail(content_type, content_id)


@router.post("/{content_type}/{content_id}/submit")
def submit(
    content_type: str,
    content_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    detail = submit_for_review(content_type, content_id, current_user)
    _audit(current_user, "submitted_for_review", content_type, detail)
    return detail


@router.post("/{content_type}/{content_id}/reviews")
def review(
    content_type: str,
    content_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_admin_user),
):
    detail = add_review(content_type, content_id, payload, current_user)
    _audit(current_user, f"review_{payload.get('decision', 'recorded')}", content_type, detail)
    return detail


@router.post("/{content_type}/{content_id}/publish")
def publish_item(
    content_type: str,
    content_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    detail = publish(content_type, content_id, current_user)
    _audit(current_user, "published", content_type, detail)
    return detail


@router.post("/{content_type}/{content_id}/archive")
def archive_item(
    content_type: str,
    content_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    detail = archive(content_type, content_id, current_user)
    _audit(current_user, "archived", content_type, detail)
    return detail


@router.post("/{content_type}/{content_id}/restore")
def restore_item(
    content_type: str,
    content_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    detail = restore(content_type, content_id, current_user)
    _audit(current_user, "restored", content_type, detail)
    return detail
