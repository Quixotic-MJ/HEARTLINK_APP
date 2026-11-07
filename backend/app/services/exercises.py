import math
from typing import List, Dict, Any, Tuple, Optional
from app.db.repositories import get_exercises_repo, get_content_repo
from app.services.recipes import map_hss_tier
from app.utils.time import utc_now

def get_routines() -> List[Dict[str, Any]]:
    return get_content_repo().list_routines()


def is_visible_to_patients(routine: Dict[str, Any]) -> bool:
    """HL-026: patients only get exercises that are published AND approved by a Physical Therapist."""
    return (routine.get("status") == "published" and bool(routine.get("expert_validated"))
            and bool(routine.get("reviewed_by")) and bool(routine.get("reviewed_at")) and not _approval_error(routine))

def calories_burned(logs: List[Dict[str, Any]], routines: List[Dict[str, Any]]) -> Tuple[int, int]:
    """HL-015: calories burned by these exercise logs, from each exercise's PT-set estimate scaled by the
    minutes actually done. A log with no library exercise (or no estimate) isn't counted.
    Returns (calories burned, logs not counted)."""
    by_id = {str(r.get("id")): r for r in routines}
    burned = 0.0
    not_counted = 0
    for log in logs:
        routine = by_id.get(str(log.get("routine_id") or ""))
        planned = float((routine or {}).get("duration_minutes") or 0)
        estimate = float((routine or {}).get("calories") or 0)
        minutes = (log.get("duration_seconds") or 0) / 60 or float(log.get("duration_minutes") or 0)
        if not planned or not estimate or not minutes:
            not_counted += 1
            continue
        # shortcut: a session left running counts at most twice the planned time; replace with a
        # per-minute rate if PTs start setting one.
        burned += estimate * min(minutes / planned, 2.0)
    return round(burned), not_counted


def get_saved_exercises(user_id: str) -> List[Dict[str, Any]]:
    # Only patients save exercises, so one that lost its PT approval drops out of the list.
    return [r for r in get_content_repo().list_saved_exercises(user_id) if is_visible_to_patients(r)]

def save_exercise_for_user(user_id: str, routine_id: str) -> bool:
    return get_content_repo().save_exercise_for_user(user_id, routine_id)

def unsave_exercise_for_user(user_id: str, routine_id: str) -> bool:
    return get_content_repo().unsave_exercise_for_user(user_id, routine_id)

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


# ─── Saving routines from the portal ─────────────────────────────────────────
# The portal sends its own field names (mediaUrl, hssTarget, duration, ...). They are turned into
# the table's column names here, unknown fields are dropped, and steps are tidied, so a save never
# fails on a field the table doesn't have.

FIELD_NAMES = {
    "duration": "duration_minutes",
    "hssTarget": "hss_tier",
    "mediaUrl": "media_url",
    "videoUrl": "video_url",
    "guideImages": "guide_images",
    "expertValidated": "expert_validated",
    "setupSteps": "setup_steps",
    "restSeconds": "rest_seconds",
    "skipIf": "skip_if",
    "stopIf": "stop_if",
    "easierVersion": "easier_version",
    "effortHint": "effort_hint",
}
COLUMNS = {
    "name", "description", "duration_minutes", "hss_tier", "type", "intensity", "goal", "steps",
    "media_url", "video_url", "guide_images", "status", "expert_validated", "requirements", "calories",
    "setup_steps", "rounds", "rest_seconds", "position", "setting", "skip_if", "stop_if",
    "easier_version", "effort_hint", "frequency",
}
SECTIONS = {"warmup", "main", "cooldown"}
BREATHS = {"setup", "in", "hold", "out"}
POSITIONS = {"Seated", "Standing", "Lying down", "Walking"}
SETTINGS = {"Indoors", "Outdoors", "Either"}
INTENSITIES = {"None", "Low", "Moderate", "High"}
STATUSES = {"draft", "published", "archived"}


def _text(value: Any, limit: int = 300) -> str:
    return str(value or "").strip()[:limit]


def _int(value: Any, default: Optional[int], low: int, high: int) -> Optional[int]:
    if value is None or value == "":
        return default
    try:
        number = float(value)
        if isinstance(value, bool) or not math.isfinite(number) or not number.is_integer() or not low <= number <= high:
            raise ValueError()
        return int(number)
    except (TypeError, ValueError, OverflowError):
        raise ValueError(f"Use a whole number between {low} and {high}; the routine dose was not changed.")


def _text_list(value: Any, limit: int = 10) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        text = _text((item.get("value") or item.get("url")) if isinstance(item, dict) else item, 1000)
        if text and text not in out:
            out.append(text)
    return out[:limit]


def clean_step(step: Any) -> Optional[Dict[str, Any]]:
    """One part of an exercise: what to do, which section, and how long (a time or a count)."""
    if isinstance(step, str):
        step = {"instruction": step}
    if not isinstance(step, dict):
        return None
    instruction = _text(step.get("instruction") or step.get("value"))
    if not instruction:
        return None
    mode = "count" if step.get("mode") == "count" else "time"
    out: Dict[str, Any] = {
        "instruction": instruction,
        "details": _text(step.get("details")),
        "section": step.get("section") if step.get("section") in SECTIONS else "main",
        "mode": mode,
        "duration_seconds": _int(step.get("duration_seconds"), None, 1, 3600) if mode == "time" else None,
        "both_sides": bool(step.get("both_sides")),
    }
    if mode == "count":
        out["reps"] = _int(step.get("reps"), None, 1, 100)
        out["seconds_per_rep"] = _int(step.get("seconds_per_rep"), None, 1, 60)
        out["duration_seconds"] = out["reps"] * out["seconds_per_rep"] if out["reps"] and out["seconds_per_rep"] else None
    if step.get("breath") in BREATHS:
        out["breath"] = step["breath"]
    image = _text(step.get("image"), 1000)
    if image:
        out["image"] = image
    return out


def clean_setup_step(step: Any) -> Optional[Dict[str, Any]]:
    """A get-into-position instruction: done once before the timer starts."""
    if isinstance(step, str):
        step = {"instruction": step}
    if not isinstance(step, dict):
        return None
    instruction = _text(step.get("instruction") or step.get("value"))
    if not instruction:
        return None
    out = {"instruction": instruction, "details": _text(step.get("details"))}
    image = _text(step.get("image"), 1000)
    if image:
        out["image"] = image
    return out


def total_seconds(steps: List[Dict[str, Any]], rounds: int, rest_seconds: int) -> int:
    """Warm-up once, the main part `rounds` times with rest between, cool-down once."""
    def length(s: Dict[str, Any]) -> int:
        return (s["duration_seconds"] or 0) * (2 if s.get("both_sides") else 1)

    warmup = sum(length(s) for s in steps if s["section"] == "warmup")
    main = sum(length(s) for s in steps if s["section"] == "main")
    cooldown = sum(length(s) for s in steps if s["section"] == "cooldown")
    return warmup + main * rounds + (rest_seconds * max(0, rounds - 1) if main else 0) + cooldown


def routine_payload(data: Dict[str, Any], partial: bool = False) -> Dict[str, Any]:
    """Turns a portal save into table columns. `partial` keeps only the fields that were sent."""
    raw = {FIELD_NAMES.get(k, k): v for k, v in data.items()}
    out: Dict[str, Any] = {k: v for k, v in raw.items() if k in COLUMNS}

    if "name" in out or not partial:
        out["name"] = _text(out.get("name"), 120) or "Untitled exercise"
    if "hss_tier" in out or not partial:
        out["hss_tier"] = map_hss_tier(str(out.get("hss_tier") or "Stable"))
    if "type" in out or not partial:
        out["type"] = _text(out.get("type"), 40) or "General"
    if "intensity" in out or not partial:
        out["intensity"] = out.get("intensity") if out.get("intensity") in INTENSITIES else "Low"
    if "status" in out or not partial:
        out["status"] = out.get("status") if out.get("status") in STATUSES else "draft"
    if "expert_validated" in out:
        out["expert_validated"] = bool(out["expert_validated"])
    for key in ("description", "goal", "easier_version", "effort_hint", "frequency", "media_url", "video_url"):
        if key in out:
            out[key] = _text(out[key], 1000 if key.endswith("_url") else 500)
    for key in ("requirements", "skip_if", "stop_if"):
        if key in out:
            out[key] = _text_list(out[key], 15)
    if "guide_images" in out:
        out["guide_images"] = _text_list(out["guide_images"], 20)
    if "position" in out:
        out["position"] = out["position"] if out["position"] in POSITIONS else None
    if "setting" in out:
        out["setting"] = out["setting"] if out["setting"] in SETTINGS else None
    if "calories" in out:
        out["calories"] = _int(out["calories"], 0, 0, 5000)
    if "rounds" in out or not partial:
        out["rounds"] = _int(out.get("rounds"), 1, 1, 20)
    if "rest_seconds" in out or not partial:
        out["rest_seconds"] = _int(out.get("rest_seconds"), 0, 0, 600)
    if "setup_steps" in out:
        out["setup_steps"] = [s for s in (clean_setup_step(x) for x in (out["setup_steps"] or [])) if s]
    if "steps" in out:
        out["steps"] = [s for s in (clean_step(x) for x in (out["steps"] or [])) if s]

    # The total comes from the parts, so it always matches them. Breathing repeats its breaths until
    # the chosen time is up, so its time is kept as entered.
    if out.get("steps") and out.get("type") != "Breathing" and "rounds" in out:
        out["duration_minutes"] = max(1, math.ceil(total_seconds(out["steps"], out["rounds"], out.get("rest_seconds", 0)) / 60))
    elif "duration_minutes" in out or not partial:
        out["duration_minutes"] = _int(out.get("duration_minutes"), 10, 1, 240)
    return out


class RoutineReviewConflict(Exception):
    pass


def _reject_review_fields(data: Dict[str, Any]) -> None:
    if {"expertValidated", "expert_validated", "reviewNote", "review_note", "reviewed_by", "reviewed_at"} & data.keys():
        raise ValueError("Use the separate review action to record a PT decision.")


def _approval_error(routine: Dict[str, Any]) -> bool:
    if (not _text(routine.get("name")) or not _text(routine.get("description"))
            or routine.get("position") not in POSITIONS or routine.get("setting") not in SETTINGS
            or not isinstance(routine.get("steps"), list) or not routine["steps"]):
        return True
    for field, low, high in (("duration_minutes", 1, 240), ("rounds", 1, 20), ("rest_seconds", 0, 600)):
        value = routine.get(field)
        if not isinstance(value, int) or isinstance(value, bool) or not low <= value <= high:
            return True
    for step in routine["steps"]:
        if not isinstance(step, dict) or not _text(step.get("instruction")):
            return True
        if step.get("section") not in SECTIONS or step.get("mode") not in {"count", "time"}:
            return True
        seconds = step.get("duration_seconds")
        if not isinstance(seconds, int) or isinstance(seconds, bool) or seconds <= 0:
            return True
        if step.get("mode") == "count":
            reps, pace = step.get("reps"), step.get("seconds_per_rep")
            if not isinstance(reps, int) or not isinstance(pace, int) or not 1 <= reps <= 100 or not 1 <= pace <= 60 or reps * pace != seconds:
                return True
        elif seconds > 3600:
            return True
    if routine.get("type") != "Breathing" and routine["duration_minutes"] != max(1, math.ceil(total_seconds(routine["steps"], routine["rounds"], routine["rest_seconds"]) / 60)):
        return True
    return False


def create_routine(data: Dict[str, Any]) -> Dict[str, Any]:
    _reject_review_fields(data)
    payload = routine_payload(data)
    payload.update(status="draft", expert_validated=False, reviewed_by=None, reviewed_at=None)
    return get_content_repo().create_routine(payload)


def update_routine(routine_id: str, data: Dict[str, Any], expected_updated_at: Optional[str] = None) -> Optional[Dict[str, Any]]:
    _reject_review_fields(data)
    repo = get_content_repo()
    current = repo.get_routine(routine_id)
    if not current:
        return None
    if expected_updated_at and current.get("updated_at") != expected_updated_at:
        raise RoutineReviewConflict()
    payload = routine_payload(data, partial=True)
    if {"steps", "rounds", "rest_seconds", "type"} & payload.keys():
        payload["duration_minutes"] = routine_payload({**current, **payload})["duration_minutes"]
    changed = any(current.get(key) != value for key, value in payload.items() if key != "status")
    if changed:
        payload.update(expert_validated=False, reviewed_by=None, reviewed_at=None)
        if current.get("status") == "published" or payload.get("status") == "published":
            payload["status"] = "draft"
    elif payload.get("status") == "published":
        if not current.get("expert_validated") or not current.get("reviewed_by") or not current.get("reviewed_at"):
            raise ValueError("PT approval is required before publication.")
        if _approval_error({**current, **payload}):
            raise ValueError("This routine is incomplete and cannot be published.")
    result = repo.update_routine(routine_id, payload, expected_updated_at=expected_updated_at)
    if expected_updated_at and not result:
        raise RoutineReviewConflict()
    return result


def review_routine(routine_id: str, *, decision: str, expected_updated_at: str, pt_id: str,
                   note: Optional[str] = None) -> Optional[Dict[str, Any]]:
    repo = get_content_repo()
    current = repo.get_routine(routine_id)
    if not current:
        return None
    if not expected_updated_at or current.get("updated_at") != expected_updated_at:
        raise RoutineReviewConflict()
    if current.get("status") == "archived":
        raise ValueError("Archived routines cannot be reviewed.")
    if decision == "approve":
        if _approval_error(current):
            raise ValueError("This routine is incomplete and cannot be approved.")
        payload = {"status": "draft", "expert_validated": True, "reviewed_by": pt_id,
                   "reviewed_at": utc_now().isoformat(), "review_note": None}
    elif decision == "changes_requested":
        review_note = str(note or "").strip()
        if not review_note:
            raise ValueError("A review note is required when requesting changes.")
        payload = {"status": "draft", "expert_validated": False, "reviewed_by": None,
                   "reviewed_at": None, "review_note": review_note[:500]}
    else:
        raise ValueError("Review decision must be approve or changes_requested.")
    updated = repo.update_routine(routine_id, payload, expected_updated_at=expected_updated_at)
    if not updated:
        raise RoutineReviewConflict()
    return updated

def delete_routine(routine_id: str) -> bool:
    return get_content_repo().delete_routine(routine_id)
