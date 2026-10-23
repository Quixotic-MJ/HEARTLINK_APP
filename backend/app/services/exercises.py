import math
from typing import List, Dict, Any, Tuple, Optional
from app.db.repositories import get_exercises_repo, get_content_repo
from app.services.recipes import map_hss_tier
from app.utils.time import utc_now

def get_routines() -> List[Dict[str, Any]]:
    return get_content_repo().list_routines()


def is_visible_to_patients(routine: Dict[str, Any]) -> bool:
    """HL-026: patients only get exercises that are published AND approved by a Physical Therapist."""
    return routine.get("status") == "published" and bool(routine.get("expert_validated"))

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


def _int(value: Any, default: int, low: int, high: int) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))


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
        "duration_seconds": _int(step.get("duration_seconds"), 5, 1, 3600),
        "both_sides": bool(step.get("both_sides")),
    }
    if mode == "count":
        out["reps"] = _int(step.get("reps"), 10, 1, 100)
        out["seconds_per_rep"] = _int(step.get("seconds_per_rep"), 3, 1, 60)
        out["duration_seconds"] = out["reps"] * out["seconds_per_rep"]
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
        return s["duration_seconds"] * (2 if s.get("both_sides") else 1)

    warmup = sum(length(s) for s in steps if s["section"] == "warmup")
    main = sum(length(s) for s in steps if s["section"] == "main")
    cooldown = sum(length(s) for s in steps if s["section"] == "cooldown")
    return warmup + main * rounds + rest_seconds * max(0, rounds - 1) + cooldown


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


def _mark_review(payload: Dict[str, Any], data: Dict[str, Any], pt_id: Optional[str]) -> None:
    """HL-026: only a Physical Therapist approves. A PT's save keeps the switch as sent and records
    who approved and when; anyone else's save sends the exercise back to waiting for a PT, so a PT
    always checks the version patients see. HL-038: a PT may leave a note when sending it back; the
    note stays until a PT changes it, and approving clears it."""
    if not pt_id:
        payload.update(expert_validated=False, reviewed_by=None, reviewed_at=None)
        return
    if "reviewNote" in data or "review_note" in data:
        note = str(data.get("reviewNote", data.get("review_note")) or "").strip()[:500]
        payload["review_note"] = note or None
    if "expert_validated" not in payload:
        return
    if payload["expert_validated"]:
        payload.update(reviewed_by=pt_id, reviewed_at=utc_now().isoformat(), review_note=None)
    else:
        payload.update(reviewed_by=None, reviewed_at=None)


def create_routine(data: Dict[str, Any], pt_id: Optional[str] = None) -> Dict[str, Any]:
    payload = routine_payload(data)
    _mark_review(payload, data, pt_id)
    return get_content_repo().create_routine(payload)

def update_routine(routine_id: str, data: Dict[str, Any], pt_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    payload = routine_payload(data, partial=True)
    _mark_review(payload, data, pt_id)
    return get_content_repo().update_routine(routine_id, payload)

def delete_routine(routine_id: str) -> bool:
    return get_content_repo().delete_routine(routine_id)
