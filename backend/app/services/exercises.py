from typing import List, Dict, Any, Tuple, Optional
from app.db.repositories import get_exercises_repo, get_content_repo
from app.services.recipes import map_hss_tier

def get_routines() -> List[Dict[str, Any]]:
    return get_content_repo().list_routines()

def get_exercise_logs(user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    logs = get_exercises_repo().list_user_logs(user_id)
    return logs[offset:offset + limit]

def create_exercise_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return get_exercises_repo().create_log(user_id, data)

def delete_exercise_log(user_id: str, log_id: str) -> Tuple[bool, str, int]:
    success = get_exercises_repo().delete_log(user_id, log_id)
    if success:
        return True, "Exercise log deleted", 200
    return False, "Log not found or already deleted", 404

def _list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [line.strip() for line in value.split("\n") if line.strip()]
    return []


def _evidence(value: Any) -> List[Dict[str, str]]:
    output = []
    for item in _list(value):
        if isinstance(item, str):
            output.append({"title": item, "url": ""})
        elif isinstance(item, dict) and (item.get("title") or item.get("url")):
            output.append({
                "title": str(item.get("title") or "").strip(),
                "url": str(item.get("url") or "").strip(),
            })
    return output


def _routine_payload(data: Dict[str, Any], *, existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    raw_intensity = str(data.get("intensity") or (existing or {}).get("intensity") or "Low").strip().title()
    intensity = "Moderate" if raw_intensity == "Medium" else raw_intensity
    if intensity not in {"None", "Low", "Moderate", "High"}:
        intensity = "Low"
    try:
        duration = max(1, int(data.get("duration") or data.get("duration_minutes") or (existing or {}).get("duration_minutes") or 1))
    except (TypeError, ValueError):
        duration = 1
    try:
        calories = max(0, int(data.get("calories") or (existing or {}).get("calories") or 0))
    except (TypeError, ValueError):
        calories = 0

    payload = {
        "name": str(data.get("name") or (existing or {}).get("name") or "Untitled routine").strip(),
        "description": str(data.get("description") or "").strip(),
        "duration_minutes": duration,
        "hss_tier": map_hss_tier(data.get("hssTarget") or data.get("hss_tier") or "Stable"),
        "type": str(data.get("type") or "Walking").strip(),
        "intensity": intensity,
        "goal": str(data.get("goal") or "").strip(),
        "steps": _list(data.get("steps")),
        "media_url": str(data.get("mediaUrl") or data.get("media_url") or "").strip(),
        "video_url": str(data.get("videoUrl") or data.get("video_url") or "").strip(),
        "guide_images": _list(data.get("guideImages") or data.get("guide_images")),
        "requirements": _list(data.get("requirements")),
        "calories": calories,
        "intended_audiences": _list(data.get("intendedAudiences") or data.get("intended_audiences") or ["general_wellness"]),
        "frequency_guidance": str(data.get("frequencyGuidance") or data.get("frequency_guidance") or "").strip(),
        "progression_guidance": str(data.get("progressionGuidance") or data.get("progression_guidance") or "").strip(),
        "equipment": _list(data.get("equipment") or data.get("requirements")),
        "modifications": _list(data.get("modifications")),
        "contraindications": _list(data.get("contraindications")),
        "clearance_required": bool(data.get("clearanceRequired") or data.get("clearance_required", False)),
        "clearance_notes": str(data.get("clearanceNotes") or data.get("clearance_notes") or "").strip(),
        "stop_symptoms": _list(data.get("stopSymptoms") or data.get("stop_symptoms")),
        "evidence_sources": _evidence(data.get("evidenceSources") or data.get("evidence_sources")),
        "requires_cardiologist_review": bool(data.get("requiresCardiologistReview") or data.get("requires_cardiologist_review", False)),
    }
    return payload


def create_routine(data: Dict[str, Any], created_by: Optional[str] = None) -> Dict[str, Any]:
    payload = {
        **_routine_payload(data),
        "status": "draft",
        "expert_validated": False,
        "content_version": 1,
        "change_notes": str(data.get("changeNotes") or data.get("change_notes") or "Initial draft").strip(),
    }
    if created_by:
        payload["created_by"] = created_by
    return get_content_repo().create_routine(payload)

def update_routine(routine_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    existing = get_content_repo().get_routine(routine_id)
    if not existing:
        return None
    payload = {
        **_routine_payload(data, existing=existing),
        "status": "draft",
        "expert_validated": False,
        "content_version": int(existing.get("content_version") or 1) + 1,
        "change_notes": str(data.get("changeNotes") or data.get("change_notes") or "Content updated").strip(),
    }
    return get_content_repo().update_routine(routine_id, payload)

def delete_routine(routine_id: str) -> bool:
    return get_content_repo().delete_routine(routine_id)
