import zoneinfo
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.services import coach_note, exercise_screening, heart_score
from app.services.review_rules import FAINTED_SYMPTOM
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN
from app.services.exercises import is_visible_to_patients, calories_burned
from app.services.nutrition_targets import compute_targets
from app.services.recipes import is_visible_to_patients as recipe_visible
from app.services import review_feedback
from app.db.repositories import (
    get_profile_repo,
    get_hss_repo,
    get_health_logs_repo,
    get_meals_repo,
    get_exercises_repo,
    get_sleep_repo,
    get_baseline_repo,
    get_content_repo,
    get_notification_repo,
)
import logging

logger = logging.getLogger(__name__)

def _safe_date(val: Any) -> datetime.date:
    dt = parse_utc(val)
    if dt:
        return to_local_date(dt)
    return UTC_MIN.date()
    
def _safe_datetime(val: Any) -> datetime:
    dt = parse_utc(val)
    return dt if dt else UTC_MIN


def _local_time(val: Any, tz_name: str = "Asia/Manila") -> str:
    """HL-079: a log's time as the patient saw it ("07:40 AM"), not in UTC."""
    dt = parse_utc(val)
    if not dt:
        return ""
    try:
        dt = dt.astimezone(zoneinfo.ZoneInfo(tz_name))
    except zoneinfo.ZoneInfoNotFoundError:
        pass
    return dt.strftime("%I:%M %p")

# ─── Dietary exclusion map ─────────────────────────────────────────────────────
# Maps a dietary practice to ingredient keywords that should be excluded.
# Seafood names, Filipino ones included: "Grilled Bangus" must not pass as vegetarian because it never says "fish".
_FISH = ["fish", "salmon", "tuna", "bangus", "milkfish", "tilapia", "galunggong", "sardine", "anchovy", "tinapa", "dilis", "bagoong", "patis"]
_SHELLFISH = ["shrimp", "prawn", "hipon", "crab", "alimango", "lobster", "squid", "pusit", "clam", "tahong", "mussel", "oyster", "scallop", "shellfish"]

DIETARY_EXCLUSIONS: Dict[str, List[str]] = {
    "Halal": ["pork", "bacon", "ham", "lard", "gelatin_pork", "liempo", "chicharon", "wine", "rum", "beer"],
    "Vegetarian": ["chicken", "pork", "beef", "bacon", "ham", "lard", "liempo", "chicharon"] + _FISH + _SHELLFISH,
    "Vegan": ["chicken", "pork", "beef", "bacon", "ham", "lard", "liempo", "chicharon", "egg", "milk", "cheese", "butter",
              "cream", "yogurt", "honey"] + _FISH + _SHELLFISH,
    "Pescatarian": ["chicken", "pork", "beef", "bacon", "ham", "lard", "liempo", "chicharon"],
}

# The setup question's allergies, each as the ingredient words that contain it. Matching the allergy's own name
# missed almost everything ("Eggs" never matched "egg", "Shellfish" never matched "shrimp").
ALLERGY_KEYWORDS: Dict[str, List[str]] = {
    "peanuts": ["peanut", "groundnut", "mani", "kare-kare"],
    "shellfish": _SHELLFISH,
    "dairy": ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "ghee", "whey", "dairy", "evaporated", "condensed"],
    "gluten": ["wheat", "flour", "bread", "noodle", "pasta", "pancit", "miki", "misua", "barley", "rye", "breadcrumb",
               "soy sauce", "toyo", "gluten"],
    "soy": ["soy", "tofu", "tokwa", "taho", "edamame", "tempeh", "miso", "toyo"],
    "eggs": ["egg", "itlog", "mayonnaise"],
}


def allergy_words(allergies: List[str]) -> List[str]:
    """Ingredient words to avoid for these allergies; an allergy not in the list matches by its own name."""
    words: List[str] = []
    for a in allergies or []:
        key = str(a).strip().lower()
        if not key or key == "none":
            continue
        words.extend(ALLERGY_KEYWORDS.get(key, [key.rstrip("s") or key]))
    return words


# How careful each band is: an exercise suits a patient when its band is theirs or more careful.


def exercise_suits(exercise: dict, screening: dict, resting: bool) -> bool:
    """HL-123: the screening result decides, never the score. Only breathing during a rest or a pause."""
    if resting:
        return exercise_screening.is_breathing(exercise)
    return exercise_screening.allows(screening, exercise)


def is_severe_symptom(log: dict) -> bool:
    """The symptoms that start the 24-hour rest, and that need the screening done again: unchanged from before."""
    symptoms = log.get("symptoms") or []
    severity_map = log.get("severity_map") or {}
    is_chest_pain = "Chest Discomfort / Tightness" in symptoms and severity_map.get("Chest Discomfort / Tightness", 1) >= 7
    is_sob_rest = "Shortness of Breath" in symptoms and log.get("context") == "resting"
    return is_chest_pain or is_sob_rest or FAINTED_SYMPTOM in symptoms


def latest_severe_symptom_at(logs: list):
    """When the newest severe symptom was logged, or None. Logs are newest first."""
    for log in logs:
        if not log.get("deleted_at") and is_severe_symptom(log):
            return parse_utc(log.get("logged_at"))
    return None


def emergency_reading_pause(logs: list) -> bool:
    """HL-123: active workouts pause after an emergency-level reading, until a later reading isn't one. Newest first."""
    from app.services.hss_service import is_emergency_reading

    for log in logs:
        sys_bp, dia_bp = log.get("systolic_bp"), log.get("diastolic_bp")
        if log.get("deleted_at") or not sys_bp or not dia_bp:
            continue
        return is_emergency_reading(float(sys_bp), float(dia_bp))
    return False



def recipe_warnings(recipe: dict, dietary_practice: str, allergies: List[str]) -> List[str]:
    """Why this recipe doesn't suit the patient, one line per allergy or diet it clashes with; empty when it suits.
    Looks in the ingredient names, the tags and the recipe's own name, e.g. "Contains shrimp (you're allergic to shellfish)"."""
    ingredients = recipe.get("ingredients") or []
    texts = [str(item.get("name", "")).lower() for item in ingredients if isinstance(item, dict)]
    texts += [str(t).lower() for t in recipe.get("tags") or []]
    texts.append(str(recipe.get("name", "")).lower())

    def found(words: List[str]) -> Optional[str]:
        return next((w for w in words if any(w in t for t in texts)), None)

    warnings: List[str] = []
    for a in allergies or []:
        key = str(a).strip().lower()
        if not key or key == "none":
            continue
        word = found(allergy_words([key]))
        if word:
            warnings.append(f"Contains {word} (you're allergic to {key})")
    word = found(DIETARY_EXCLUSIONS.get(dietary_practice, []))
    if word:
        warnings.append(f"Contains {word.replace('_', ' ')} (not {dietary_practice})")
    return warnings


def _recipe_is_safe(recipe: dict, dietary_practice: str, allergies: List[str]) -> bool:
    """Return True if the recipe does NOT contain excluded ingredients or allergies."""
    return not recipe_warnings(recipe, dietary_practice, allergies)


def _get_comparison_score(user_hss: list) -> int:
    """Finds the most recent score from a previous calendar day to provide a meaningful trend."""
    if len(user_hss) < 2:
        return user_hss[0].get("score", 0) if user_hss else 0
        
    latest_dt = _safe_date(user_hss[0].get("computed_at"))
    if not latest_dt:
        return user_hss[1].get("score", 0)
        
    for hss in user_hss[1:]:
        dt = _safe_date(hss.get("computed_at"))
        if dt and dt < latest_dt:
            return hss.get("score", 0)
            
    # If all scores are from today, return the oldest one to show today's progress
    return user_hss[-1].get("score", 0)

def _trend_since(user_hss: list) -> str | None:
    """What the trend compares with: "yesterday", an "earlier" day, or "today" when every score is from today."""
    if len(user_hss) < 2:
        return None
    latest_dt = _safe_date(user_hss[0].get("computed_at"))
    for hss in user_hss[1:]:
        dt = _safe_date(hss.get("computed_at"))
        if dt < latest_dt:
            return "yesterday" if (latest_dt - dt).days == 1 else "earlier"
    return "today"

def _get_trend_direction(user_hss: list) -> str:
    """Compute score trend comparing to yesterday (or baseline)."""
    if len(user_hss) < 2:
        return "+0"
    latest = user_hss[0].get("score", 0)
    previous = _get_comparison_score(user_hss)
    diff = latest - previous
    if diff > 0:
        return f"+{diff}"
    return str(diff)  # Already includes minus sign for negatives


def _event_records(user_hss: list) -> tuple:
    """(latest record, the score before it, the latest record again if a blood pressure reading made it)."""
    latest = user_hss[0]
    factors = latest.get("contributing_factors") or {}
    rest = user_hss[1:]
    reading = latest if factors.get("trigger") == "health_log" and factors.get("systolic") else None
    previous = rest[0].get("score") if rest else None
    return latest, previous, reading


def _just_left_the_starting_score(user_hss: list) -> bool:
    """The first log after setup: the score moves from the model's estimate to the Heart score, so the change says
    little about that one log."""
    return len(user_hss) >= 2 and user_hss[0].get("source") != "baseline" and user_hss[1].get("source") == "baseline"


def _score_change(user_hss: list) -> int:
    latest, previous, _ = _event_records(user_hss)
    return (latest.get("score", 0) - previous) if previous is not None else 0


def _progress(factors: dict, source: str) -> str | None:
    """Where the area this log counts toward now stands, in real numbers: "120 of 150 minutes this week"."""
    areas = factors.get("areas") or {}
    if source == "exercise" and "activity" in areas:
        minutes, goal = areas["activity"].get("minutes", 0), areas["activity"].get("goal", 150)
        return f"{minutes} of {goal} minutes this week" if minutes < goal else f"{minutes} minutes this week, past the {goal}-minute goal"
    if source == "sleep" and "sleep" in areas:
        return f"{areas['sleep'].get('hours', 0):g} hours of sleep on average"
    if source == "meal" and "diet" in areas:
        meal_days = areas["diet"].get("meal_days", 0)
        if meal_days >= 3:
            return f"sodium over your limit on {areas['diet'].get('sodium_days_over', 0)} of the last 7 days"
        return f"{meal_days} of 3 days of meals logged this week"
    return None


def _note_for_latest_event(user_hss: list, latest_log: dict | None) -> tuple:
    """Today's note: what the latest log did to the score, and the one step that fits it."""
    from app.services.family import is_emergency

    latest, previous, reading = _event_records(user_hss)
    score = latest.get("score", 0)
    diff = _score_change(user_hss)
    factors = latest.get("contributing_factors") or {}
    trigger = factors.get("trigger") or ""
    moved = f"Up {diff}" if diff > 0 else f"Down {abs(diff)}"

    # Emergency-level reading or symptoms (the app's own rules) logged today: the note says so, whatever the score did
    logged_today = bool(latest_log) and not latest_log.get("deleted_at") and \
        _safe_date(latest_log.get("logged_at")) == to_local_date(utc_now())
    if logged_today and is_emergency(latest_log):
        sys_bp, dia_bp = latest_log.get("systolic_bp"), latest_log.get("diastolic_bp")
        from app.services.hss_service import is_emergency_reading
        if sys_bp and dia_bp and is_emergency_reading(sys_bp, dia_bp):
            title = f"Your reading {round(sys_bp)}/{round(dia_bp)} is at an emergency level."
        else:
            title = "You logged symptoms at an emergency level."
        body = "If you feel unwell, call 911 now. HeartLink can't diagnose; please get checked in person."
        return title, body, "alert-triangle", "see_what_to_do"

    if _just_left_the_starting_score(user_hss):
        return ("Your score now comes from your logs.",
                "Your first score was an estimate from your setup answers. Now it's based on your blood pressure, activity, sleep, nicotine, body weight and diet.",
                "info", None)

    # HL-144: the refresh that added the Heart risk to an existing account. Records saved by it before this fix say
    # "method_update" but already hold the risk, so they get this note too. The note never gives the risk % (HL-139).
    if trigger == "risk_added" or (trigger == "method_update" and "risk" in factors):
        return ("New: your heart risk.",
                "It's at the top of your Dashboard: the chance of a heart attack or stroke in the next 10 years. Your "
                "habits score below works as before.",
                "info", None)

    if trigger == "method_update":
        return ("Your Heart score was updated.",
                "It's now based on the American Heart Association's Life's Essential 8. Tap the i on your score to see each area.",
                "info", None)

    if reading is not None:
        sys_bp, dia_bp = factors.get("systolic"), factors.get("diastolic")
        what = f"{round(sys_bp)}/{round(dia_bp)}" if sys_bp and dia_bp else "latest"
        if factors.get("reading_kind") == "healthy":
            title = f"Your {what} reading is in the healthy range."
            body = f"Your score went up {diff}." if diff > 0 else f"Your score is now {score}." if diff < 0 else f"Your score stays at {score}."
            return title, body, "check-circle", None
        if diff:
            title = f"{moved} after your {what} reading."
        else:
            title = f"Your {what} reading is above the healthy range."
        body = "Your score uses your average for the week, so one reading moves it only a little. Log another one later to see the trend."
        return title, body, ("trending-down" if diff <= 0 else "trending-up"), "log_later"

    if factors.get("rule") == "no_recent_reading" and diff < 0:
        return ("Your score is limited because there's no recent blood pressure reading.",
                "Log a reading to bring your score up to date.", "trending-down", "log_vitals")

    source = "meal" if trigger.startswith("meal") else "exercise" if trigger.startswith("exercise") else "sleep" if trigger.startswith("sleep") else ""
    removed = trigger.endswith("_delete")
    label = "workout" if source == "exercise" else source
    progress = _progress(factors, source)
    tail = f": {progress}." if progress else "."
    if removed and diff:
        return (f"{moved} after removing your {label or 'log'}{tail}", "Your score counts only what's logged in the last 7 days.",
                "trending-down" if diff < 0 else "trending-up", None)
    if source and not removed:
        if diff > 0:
            return f"{moved} from your {label}{tail}", "Keep it up.", "trending-up", None
        if diff < 0 and source == "meal":
            return (f"{moved} after your meal{tail}", "More days over your sodium limit lower your diet points. Review today's meals to see which.",
                    "trending-down", "review_meals")
        if diff < 0:
            return f"{moved} after your {label}{tail}", "Your score uses your average for the week.", "trending-down", None
        if progress:
            return f"No change yet: {progress}.", "Your score looks at your whole week, so it moves slowly.", "check-circle", None
    if diff > 0:
        return f"Your score went up {diff}.", "Keep it up.", "trending-up", None
    if diff < 0:
        return (f"Your score went down {abs(diff)}.", "Your score uses the last 7 days, so older logs drop out as time passes. Keep logging to keep it current.",
                "trending-down", "log_vitals")
    if score < 50:
        return ("Your score is in the lowest range.", "Keep logging your readings, and see your care team in person.",
                "alert-circle", "log_vitals")
    return ("Your score is holding steady.", f"It stays at {score}.", "check-circle", None)


def _note_kind(user_hss: list) -> tuple:
    """What moved the score last ("meal", "exercise", "sleep", "reading", "stale", "removed", "update" or ""), the change
    and the score; the same reading of the score history as _note_for_latest_event."""
    latest, _, reading = _event_records(user_hss)
    score = latest.get("score", 0)
    diff = _score_change(user_hss)
    factors = latest.get("contributing_factors") or {}
    trigger = factors.get("trigger") or ""
    if trigger in ("method_update", "risk_added") or _just_left_the_starting_score(user_hss):
        kind = "update"
    elif reading is not None:
        kind = "reading"
    elif factors.get("rule") == "no_recent_reading" and diff < 0:
        kind = "stale"
    elif trigger.endswith("_delete"):
        kind = "removed"
    elif trigger.startswith("meal"):
        kind = "meal"
    elif trigger.startswith("exercise"):
        kind = "exercise"
    elif trigger.startswith("sleep"):
        kind = "sleep"
    else:
        kind = ""
    return kind, diff, score


def _generate_insight(
    user_hss: list,
    latest_log: dict | None,
    first_name: str | None = None,
    user_id: str | None = None,
    facts: dict | None = None,
) -> dict:
    """Generate a dynamic smart insight based on actual data.

    `action` names the one step the app offers under the note: "log_vitals", "review_meals", "see_what_to_do"
    (an emergency-level reading or symptom: Call 911 and nearby clinics), "log_later" or None.
    `ai_written` is always False: the note comes from the rules below (the AI summary is on Trends)."""
    if len(user_hss) < 2:
        return {
            "title": "Start tracking to unlock insights.",
            "body": "Log your vitals and meals daily so HeartLink can give you personalized insights.",
            "icon": "info",
            "action": "log_vitals",
            "ai_written": False,
        }

    title, body, icon, action = _note_for_latest_event(user_hss, latest_log)

    # The fact stays the title; real numbers and a step for the time of day are added. The week's patterns are on Trends.
    if facts and action != "see_what_to_do":
        kind, diff, score = _note_kind(user_hss)
        title, body, icon, action = coach_note.improve_note(title, body, icon, action, kind, diff, score, facts)

    # 2026-11-12: no AI on the Dashboard any more; the AI summary is on Trends (progress_summary.py). The key stays
    # for older apps.
    return {"title": title, "body": body, "icon": icon, "action": action, "ai_written": False}


def _calculate_streak_data(meal_logs, exercise_logs, daily_health_logs, sleep_logs) -> Dict[str, Any]:
    now_local = to_local_date(utc_now())
    
    meal_dates = set()
    for item in meal_logs:
        if not item.get("deleted_at"):
            dt = _safe_date(item.get("logged_at"))
            if dt: meal_dates.add(dt)
            
    exercise_dates = set()
    for item in exercise_logs:
        if not item.get("deleted_at"):
            dt = _safe_date(item.get("logged_at"))
            if dt: exercise_dates.add(dt)
            
    vitals_dates = set()
    for item in daily_health_logs:
        if not item.get("deleted_at"):
            dt = _safe_date(item.get("logged_at"))
            if dt: vitals_dates.add(dt)
            
    sleep_dates = set()
    for item in sleep_logs:
        if not item.get("deleted_at") and not item.get("is_deleted", False):
            dt = _safe_date(item.get("logged_at"))
            if dt: sleep_dates.add(dt)
            
    all_logged_dates = meal_dates.intersection(exercise_dates).intersection(vitals_dates).intersection(sleep_dates)
    
    current_streak = 0
    check_date = now_local
    
    # 1-day grace period: if today is not logged yet, check yesterday
    if check_date not in all_logged_dates:
        check_date -= timedelta(days=1)
        
    while check_date in all_logged_dates:
        current_streak += 1
        check_date -= timedelta(days=1)
        
    best_streak = 0
    temp_streak = 0
    sorted_dates = sorted(list(all_logged_dates))
    if sorted_dates:
        temp_streak = 1
        best_streak = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                temp_streak += 1
                best_streak = max(best_streak, temp_streak)
            else:
                temp_streak = 1

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "history": [d.isoformat() for d in sorted_dates]
    }


def _get_today_activity(user_id: str) -> dict:
    """Summarize today's logged activity."""
    today = to_local_date(utc_now())

    from app.services.health_logs import get_health_logs
    daily_health_logs = get_health_logs(user_id)
    meal_logs = get_meals_repo().list_user_meals(user_id)
    exercise_logs = get_exercises_repo().list_user_logs(user_id)
    sleep_logs = get_sleep_repo().list_user_logs(user_id)

    # Vitals logged today
    vitals_today = [
        l
        for l in daily_health_logs
        if _safe_date(l.get("logged_at")) == today
    ]

    # Meals logged today
    meals_today = [
        m
        for m in meal_logs
        if _safe_date(m.get("logged_at")) == today and m.get("deleted_at") is None
    ]

    # Exercises logged today
    exercises_today = [
        e
        for e in exercise_logs
        if _safe_date(e.get("logged_at")) == today and e.get("deleted_at") is None and e.get("status", "completed") != "abandoned"
    ]

    # Sleep logged today
    sleeps_today = [
        s
        for s in sleep_logs
        if _safe_date(s.get("logged_at")) == today and s.get("deleted_at") is None and not s.get("is_deleted", False)
    ]

    total_sodium = sum((m.get("sodium_mg") or 0) for m in meals_today)
    total_calories = sum((m.get("calories") or 0) for m in meals_today)
    total_saturated_fat = sum((m.get("saturated_fat_g") or 0) for m in meals_today)
    total_cholesterol = sum((m.get("cholesterol_mg") or 0) for m in meals_today)
    total_fiber = sum((m.get("fiber_g") or 0) for m in meals_today)
    
    total_exercise_min = sum((e.get("duration_minutes") or 0) for e in exercises_today)
    # HL-015: net calories = eaten - burned by today's exercises.
    burned, not_counted = calories_burned(exercises_today, get_content_repo().list_routines()) if exercises_today else (0, 0)
    total_sleep_hours = sum((s.get("duration_hours") or 0) for s in sleeps_today)

    # Meds adherence today
    meds_taken = any(l.get("medication_taken") for l in vitals_today)
    # For the dashboard's medicine tile: "I don't take any" is saved as null, so the latest answer decides "none"
    latest_answer = max(daily_health_logs, key=lambda l: _safe_datetime(l.get("logged_at")), default=None)
    if meds_taken:
        medication_status = "taken"
    elif latest_answer is not None and latest_answer.get("medication_taken") is None:
        medication_status = "none"
    else:
        medication_status = "not_yet"

    # Context, Severe Symptoms, Weight Gain, Blood Sugar
    vitals_context = vitals_today[0].get("context") if vitals_today else None
    severe_symptom_count = sum(1 for l in vitals_today if any(s in l.get("symptoms", []) for s in ["Chest Discomfort / Tightness", "Shortness of Breath", FAINTED_SYMPTOM]))
    rapid_weight_gain = False # Requires alert fetch, implemented in hss_service
    blood_sugar = vitals_today[0].get("blood_sugar") if vitals_today else None

    return {
        "vitals_logged": len(vitals_today) > 0,
        "meals_count": len(meals_today),
        "exercises_count": len(exercises_today),
        "sleep_logged": len(sleeps_today) > 0,
        "total_sodium_mg": total_sodium,
        "total_calories": total_calories,
        "total_calories_burned": burned,
        "net_calories": round(total_calories - burned),
        "exercises_not_counted": not_counted,
        "total_saturated_fat_g": total_saturated_fat,
        "total_cholesterol_mg": round(total_cholesterol),
        "total_fiber_g": total_fiber,
        "total_exercise_minutes": total_exercise_min,
        "total_sleep_hours": total_sleep_hours,
        "medication_taken": meds_taken,
        "medication_status": medication_status,
        "vitals_context": vitals_context,
        "severe_symptom_count": severe_symptom_count,
        "latest_blood_sugar": blood_sugar,
        "streak_data": _calculate_streak_data(meal_logs, exercise_logs, daily_health_logs, sleep_logs),
        # For Today's note (coach_note.day_facts); taken out before the dashboard is sent
        "_logs": {"meals": meal_logs, "exercises": exercise_logs, "vitals": daily_health_logs, "sleep": sleep_logs},
    }


def get_dashboard_data(user_id: str, recipe_limit: int = 2, exercise_limit: int = 2) -> Dict[str, Any]:
    profile_repo = get_profile_repo()
    profile = profile_repo.get_by_id(user_id)
    if not profile:
        return {}

    canonical_id = profile.get("id") or user_id

    hss_repo = get_hss_repo()
    user_hss = heart_score.refresh_if_outdated(canonical_id, hss_repo.list_hss_history(canonical_id))
    latest_hss = (
        user_hss[0]
        if user_hss
        else {"score": 0, "tier": "Unknown", "computed_at": None}
    )

    health_repo = get_health_logs_repo()
    user_logs = health_repo.list_user_logs(canonical_id)
    latest_log = user_logs[0] if user_logs else None

    user_alerts = health_repo.list_alerts(user_id=canonical_id)
    latest_alert = user_alerts[0] if user_alerts else None

    # Symptom-based 24-hour safety lock check
    has_recent_severe_symptom = False
    now_utc = utc_now()
    for log in user_logs:
        log_time_str = log.get("logged_at")
        if not log_time_str:
            continue
        try:
            log_time = parse_utc(log_time_str)
            if not log_time:
                continue
            if (now_utc - log_time).total_seconds() > 24 * 3600:
                break
            
            if log.get("context") == "symptom_lock_cleared":
                # User manually cleared the lock after their most recent severe symptom!
                break
            
            if is_severe_symptom(log):
                has_recent_severe_symptom = True
                break
        except Exception:
            pass

    # ── Dietary preference filtering ───────────────────────────────────────────
    baseline_repo = get_baseline_repo()
    dietary_entry = baseline_repo.get_baseline(canonical_id)
    dietary_practice = (
        dietary_entry.get("dietary_practice", "") if dietary_entry else ""
    )
    allergies = dietary_entry.get("allergies", []) if dietary_entry else []

    # ── Today's activity summary & nutrition budget ────────────────────────────
    today_activity = _get_today_activity(canonical_id)
    
    today_recipe_ids = {m.get("recipe_id") for m in today_activity.get("recent_meals", []) if m.get("recipe_id")}
    today_exercise_ids = {e.get("routine_id") for e in today_activity.get("recent_exercises", []) if e.get("routine_id")}
    threshold = baseline_repo.get_thresholds(canonical_id)
    calorie_limit = threshold.get("daily_calories", None) if threshold else None
    # HL-016 / HL-017: guideline limits from height, weight, age, sex and activity; a saved limit wins.
    targets = compute_targets(profile, dietary_entry, threshold)
    sodium_limit = targets["sodium_mg"]["value"]
    cholesterol_limit = targets["cholesterol_mg"]["value"]

    # ── Recommendations: filter by HSS tier AND dietary preference ─────────────
    content_repo = get_content_repo()
    recipes = content_repo.list_recipes()
    exercise_routines = content_repo.list_routines()

    tier = latest_hss.get("tier", "Stable")
    # HL-057: items an expert marked not suitable for this patient (empty while the setting is off).
    hidden = review_feedback.hidden_items(canonical_id)
    reco_recipes = [
        r
        for r in recipes
        if recipe_visible(r)
        and (r.get("hss_tier") == tier or r.get("hss_tier") == "Stable")
        and r.get("id") not in today_recipe_ids
        and ("recipe", str(r.get("id"))) not in hidden
        and _recipe_is_safe(r, dietary_practice, allergies)
    ]

    # Dynamic budget prioritization (HL-ENG-21 / Pillar D):
    # If remaining sodium budget is < 500 mg, prioritize low-sodium expert-reviewed recipes
    remaining_sodium = sodium_limit - today_activity["total_sodium_mg"]
    if remaining_sodium < 500:
        reco_recipes.sort(key=lambda r: (not bool(r.get("expert_validated", False)), r.get("sodium_mg") or 0))
    else:
        reco_recipes.sort(key=lambda r: not bool(r.get("expert_validated", False)))

    # HL-123: the screening result decides which exercises are suggested, never the score. During the 24-hour rest after
    # a severe symptom, or after an emergency-level reading, breathing only (the exercise screen says the same).
    screening = exercise_screening.status_for(canonical_id, latest_severe_symptom_at(user_logs))
    reading_pause = emergency_reading_pause(user_logs)
    resting = has_recent_severe_symptom or reading_pause
    reco_exercises = [
        e
        for e in exercise_routines
        if exercise_suits(e, screening, resting)
        and is_visible_to_patients(e)
        and e.get("id") not in today_exercise_ids
        and ("exercise", str(e.get("id"))) not in hidden
    ]

    recommendations = []
    for r in reco_recipes[:recipe_limit]:
        is_expert = bool(r.get("expert_validated", False))
        recommendations.append(
            {
                "id": r["id"],
                "type": "recipe",
                "tag": "Dietitian approved",
                "title": r["name"],
                "subtitle": f"Sodium: {r.get('sodium_mg', 0)}mg",
                "icon": "bowl-mix-outline",
                "bg": "#14532d",
                "tagBg": "rgba(255,255,255,0.12)",
                "tagText": "rgba(255,255,255,0.8)",
                "subColor": "#86efac",
                "route": f"/(home)/recipe-details?id={r['id']}",
                "name": r.get("name", ""),
                "calories": r.get("calories", 0),
                "sodium_mg": r.get("sodium_mg", 0),
                "image_url": r.get("image_url", ""),
                "hss_tier": r.get("hss_tier", "Stable"),
                "expert_validated": is_expert,
                "dietary_tag": f"{dietary_practice} Safe" if dietary_practice and dietary_practice.lower() != "none" else None,
                "allergies_filtered": len([a for a in allergies if a.lower() != "none"]) > 0,
            }
        )
    for e in reco_exercises[:exercise_limit]:
        recommendations.append(
            {
                "id": e["id"],
                "type": "exercise",
                "tag": "PT approved",
                "title": e["name"],
                "subtitle": e.get("description", "")[:30] + "...",
                "icon": "yoga",
                "bg": "#1e293b",
                "tagBg": "rgba(255,255,255,0.12)",
                "tagText": "rgba(255,255,255,0.8)",
                "subColor": "#94a3b8",
                "route": f"/(home)/exercise-details?id={e['id']}",
                "duration_minutes": e.get("duration_minutes") or 0,
                "intensity": e.get("intensity") or "",
                "exercise_type": e.get("type") or "",
            }
        )

    # ── Compute real trend ─────────────────────────────────────────────────────
    trend = _get_trend_direction(user_hss)

    # ── Generate dynamic smart insight ─────────────────────────────────────────
    logs = today_activity.pop("_logs", {})
    try:
        facts = coach_note.day_facts(
            meal_logs=logs.get("meals", []),
            exercise_logs=logs.get("exercises", []),
            vitals_logs=logs.get("vitals", []),
            sleep_hours=today_activity.get("total_sleep_hours") or 0,
            sodium_limit=sodium_limit,
            movement_goal=(threshold or {}).get("active_minutes_goal") or 30,
            exercise_paused=bool(resting or screening["state"] not in exercise_screening.OPEN_STATES),
        )
    except Exception as e:  # the plain note still works without the extra facts
        logger.warning(f"Today's note facts failed: {e}")
        facts = None
    insight = _generate_insight(user_hss, latest_log, profile.get("first_name"), canonical_id, facts)



    # ── Unread notifications ───────────────────────────────────────────────────
    notif_repo = get_notification_repo()
    user_notifs = notif_repo.list_user_notifications(canonical_id)
    unread_count = sum(1 for n in user_notifs if not n.get("read", True))

    return {
        "user": {
            "first_name": profile.get("first_name"),
            "last_name": profile.get("last_name"),
            "avatar_url": profile.get("avatar_url"),
        },
        "hss_score": latest_hss.get("score", 0),
        "hss_tier": latest_hss.get("tier", "Unknown"),
        "hss_factors": latest_hss.get("contributing_factors", {}),
        # Under the heart: "74 from your readings + 2 from today's habits"
        "last_sync": latest_hss.get("computed_at"),
        "unread_notifications_count": unread_count,
        "latest_vitals": {
            "bpm": (
                str(latest_log.get("heart_rate_bpm") if latest_log.get("heart_rate_bpm") is not None else latest_log.get("bpm", "--"))
                if latest_log and (latest_log.get("heart_rate_bpm") is not None or latest_log.get("bpm") is not None)
                else "--"
            ),
            "bp": (
                f"{latest_log.get('systolic_bp')}/{latest_log.get('diastolic_bp')}"
                if latest_log and latest_log.get('systolic_bp') is not None and latest_log.get('diastolic_bp') is not None
                else "--/--"
            ),
            "trend": trend,
            "trend_since": _trend_since(user_hss),
            "logged_at": latest_log.get("logged_at") if latest_log else None,
            "context": latest_log.get("context") if latest_log else None,
        },
        "latest_alert": latest_alert,
        "recommendations": recommendations,
        # HL-057: so Explore can leave these out of its own picks too.
        "hidden_items": [{"type": t, "id": i} for t, i in sorted(hidden)],
        "checkup_reminder": review_feedback.checkup_reminder(canonical_id),
        "insight": insight,
        "weekly_report": coach_note.weekly_report_status(logs, profile.get("created_at")),
        "today_activity": today_activity,
        "nutrition_budget": {
            "sodium": {
                "consumed_mg": today_activity["total_sodium_mg"],
                "limit_mg": sodium_limit,
                "source": targets["sodium_mg"]["source"],
            },
            "sat_fat": {
                "consumed_g": today_activity["total_saturated_fat_g"],
                "limit_g": targets["sat_fat_g"]["value"],
                "source": targets["sat_fat_g"]["source"],
            },
            "cholesterol": {
                "consumed_mg": today_activity["total_cholesterol_mg"],
                "limit_mg": cholesterol_limit,
                "over": today_activity["total_cholesterol_mg"] > cholesterol_limit,
                "source": targets["cholesterol_mg"]["source"],
            },
            "calories": {
                "consumed": today_activity["total_calories"],
                "burned": today_activity["total_calories_burned"],
                "net": today_activity["net_calories"],
                "limit": calorie_limit,
                "target": targets["calories"]["value"],
                "source": targets["calories"]["source"],
            },
            "bmi": targets["bmi"],
            "bmi_category": targets["bmi_category"],
        },
        "streak": today_activity["streak_data"],
        "has_recent_severe_symptom": has_recent_severe_symptom,
        "exercise_screening": screening,
        "emergency_reading_pause": reading_pause,
    }


def get_7_day_wrap_up_data(user_id: str, local_date_str: str = None) -> Dict[str, Any]:
    profile = get_profile_repo().get_by_id(user_id)
    canonical_id = profile.get("id") if profile else user_id

    if local_date_str:
        try:
            now_local = datetime.strptime(local_date_str, "%Y-%m-%d").date()
        except ValueError:
            now_local = to_local_date(utc_now())
    else:
        now_local = to_local_date(utc_now())
        
    seven_days_ago = now_local - timedelta(days=6) # 7 days inclusive
    fourteen_days_ago = now_local - timedelta(days=13) # previous 7 days

    # Helper filters
    def in_current_week(date_str):
        if not date_str: return False
        return seven_days_ago <= _safe_date(date_str) <= now_local
        
    def in_prev_week(date_str):
        if not date_str: return False
        return fourteen_days_ago <= _safe_date(date_str) < seven_days_ago

    # Domain Repositories
    meal_logs = get_meals_repo().list_user_meals(canonical_id)
    exercise_logs = get_exercises_repo().list_user_logs(canonical_id)
    from app.services.health_logs import get_health_logs
    daily_health_logs = get_health_logs(canonical_id)
    sleep_logs = get_sleep_repo().list_user_logs(canonical_id)
    user_hss = sorted(get_hss_repo().list_hss_history(canonical_id), key=lambda x: _safe_datetime(x.get("computed_at")))
    exercise_routines = get_content_repo().list_routines()

    # Raw filtered logs
    user_meals_current = [m for m in meal_logs if in_current_week(m.get("logged_at")) and not m.get("deleted_at")]
    # Fetch ALL exercises for the timeline, including abandoned
    user_exercises_current_all = [e for e in exercise_logs if in_current_week(e.get("logged_at")) and not e.get("deleted_at")]
    # Completed/Active exercises for calculations
    user_exercises_current = [e for e in user_exercises_current_all if e.get("status") != "abandoned"]
    
    user_health_current = [l for l in daily_health_logs if in_current_week(l.get("logged_at")) and not l.get("deleted_at")]
    user_sleep_current = [s for s in sleep_logs if in_current_week(s.get("logged_at")) and not s.get("deleted_at") and not s.get("is_deleted", False)]

    user_meals_prev = [m for m in meal_logs if in_prev_week(m.get("logged_at")) and not m.get("deleted_at")]
    user_exercises_prev = [e for e in exercise_logs if in_prev_week(e.get("logged_at")) and not e.get("deleted_at") and e.get("status") != "abandoned"]

    # Unique dates
    logged_vitals_dates = {_safe_date(l["logged_at"]) for l in user_health_current}
    logged_meals_dates = {_safe_date(m["logged_at"]) for m in user_meals_current}
    logged_sleep_dates = {_safe_date(s["logged_at"]) for s in user_sleep_current}
    logged_exercise_dates = {_safe_date(e["logged_at"]) for e in user_exercises_current_all}
    logged_symptoms_dates = {_safe_date(l["logged_at"]) for l in user_health_current if any(s != "None (Feeling fine)" for s in (l.get("symptoms") or []))}
    
    # Calculate HSS
    def get_avg_hss(start_d, end_d):
        total = 0
        count = 0
        for i in range((end_d - start_d).days + 1):
            target_date = start_d + timedelta(days=i)
            day_scores = [c["score"] for c in user_hss if _safe_date(c["computed_at"]) <= target_date]
            if day_scores and day_scores[-1] > 0:
                total += day_scores[-1]
                count += 1
        return round(total / count) if count > 0 else None

    hss_current = get_avg_hss(seven_days_ago, now_local)
    hss_prev = get_avg_hss(fourteen_days_ago, seven_days_ago - timedelta(days=1))

    # Daily Records & Consistency
    daily_records = []
    days_logged = 0
    
    streak_data = _calculate_streak_data(meal_logs, exercise_logs, daily_health_logs, sleep_logs)

    for i in range(7):
        target_date = seven_days_ago + timedelta(days=i)
        activities = []
        if target_date in logged_exercise_dates: activities.append("Exercise")
        if target_date in logged_meals_dates: activities.append("Meals")
        if target_date in logged_vitals_dates: activities.append("Vitals")
        if target_date in logged_sleep_dates: activities.append("Sleep")
        if target_date in logged_symptoms_dates: activities.append("Symptoms")
        
        has_records = len(activities) > 0
        if has_records: days_logged += 1
        
        daily_records.append({
            "date": target_date.strftime("%b %d"),
            "day": target_date.strftime("%a"),
            "has_records": has_records,
            "activities": activities
        })

    # Movement Formatting
    exercise_records = []
    for e in user_exercises_current_all:
        routine = next((r for r in exercise_routines if r.get("id") == e.get("routine_id")), {})
        instructions = [
            step.get("content") or step.get("text") or step.get("instruction") or ""
            for step in routine.get("steps", [])
            if isinstance(step, dict) and step.get("type") in ("instruction", "breathing")
        ]
        
        status_label = e.get("status")
        if status_label == "abandoned":
            status_label = "ABORTED / STOPPED — SYMPTOMS"
            
        exercise_records.append({
            "date": _safe_date(e["logged_at"]).strftime("%b %d"),
            "time": _local_time(e["logged_at"]),
            "name": e.get("routine_name", routine.get("name", "Exercise")),
            "duration": e.get("duration_minutes", 0),
            "status": status_label,
            "type": routine.get("type", "General"),
            "intensity": routine.get("intensity", "None"),
            "goal": routine.get("goal", ""),
            "instructions": instructions
        })

    nutrition_records = []
    for m in sorted(user_meals_current, key=lambda x: _safe_datetime(x["logged_at"])):
        nutrition_records.append({
            "date": _safe_date(m["logged_at"]).strftime("%b %d"),
            "time": _local_time(m["logged_at"]),
            "meal_name": m.get("meal_name"),
            "portion": m.get("portion"),
            "calories": m.get("calories"),
            "sodium_mg": m.get("sodium_mg"),
            "sat_fat_g": m.get("saturated_fat_g"),
            "fiber_g": m.get("fiber_g"),
            "cholesterol_mg": m.get("cholesterol_mg")
        })

    vital_records = []
    for l in sorted(user_health_current, key=lambda x: _safe_datetime(x["logged_at"])):
        if l.get("systolic_bp") or l.get("weight_kg"):
            vital_records.append({
                "date": _safe_date(l["logged_at"]).strftime("%b %d"),
                "time": _local_time(l["logged_at"]),
                "systolic": l.get("systolic_bp"),
                "diastolic": l.get("diastolic_bp"),
                "bpm": l.get("heart_rate_bpm"),
                "weight_kg": l.get("weight_kg"),
                "medication": l.get("medication_taken")
            })

    sleep_records = []
    for s in sorted(user_sleep_current, key=lambda x: _safe_datetime(x["logged_at"])):
        if s.get("duration_hours"):
            sleep_records.append({
                "date": _safe_date(s["logged_at"]).strftime("%b %d"),
                "time": _local_time(s["logged_at"]),
                "hours": s.get("duration_hours"),
                "quality": s.get("quality")
            })

    symptoms_records = []
    for l in sorted(user_health_current, key=lambda x: _safe_datetime(x["logged_at"])):
        symps = [s for s in (l.get("symptoms") or []) if s != "None (Feeling fine)"]
        if symps:
            for s in symps:
                symptoms_records.append({
                    "date": _safe_date(l["logged_at"]).strftime("%b %d"),
                    "time": _local_time(l["logged_at"]),
                    "name": s,
                    "severity": (l.get("severity_map") or {}).get(s, 0),
                    "context": l.get("context") or ""
                })

    hss_records = []
    for i in range(7):
        target_date = seven_days_ago + timedelta(days=i)
        day_scores = [c["score"] for c in user_hss if _safe_date(c["computed_at"]) <= target_date]
        if day_scores and day_scores[-1] > 0:
             hss_records.append({
                 "date": target_date.strftime("%b %d"),
                 "score": day_scores[-1]
             })

    # Group records by day for the daily timeline view
    daily_records_grouped = []
    for i in range(7):
        target_date = seven_days_ago + timedelta(days=i)
        date_str = target_date.strftime("%b %d")
        
        day_movement = [r for r in exercise_records if r["date"] == date_str]
        day_nutrition = [r for r in nutrition_records if r["date"] == date_str]
        day_vitals = [r for r in vital_records if r["date"] == date_str]
        day_sleep = [r for r in sleep_records if r["date"] == date_str]
        day_symptoms = [r for r in symptoms_records if r["date"] == date_str]
        
        has_records = bool(day_movement or day_nutrition or day_vitals or day_sleep or day_symptoms)
        
        daily_records_grouped.append({
            "date": date_str,
            "day": target_date.strftime("%A"),
            "short_day": target_date.strftime("%a"),
            "has_records": has_records,
            "movement": day_movement,
            "nutrition": day_nutrition,
            "vitals": day_vitals,
            "sleep": day_sleep,
            "symptoms": day_symptoms
        })

    # Basic Summaries
    total_active = sum((e.get("duration_minutes") or 0) for e in user_exercises_current)
    prev_active = sum((e.get("duration_minutes") or 0) for e in user_exercises_prev)
    total_sodium = sum((m.get("sodium_mg") or 0) for m in user_meals_current)
    total_sat_fat = sum((m.get("saturated_fat_g") or 0) for m in user_meals_current)
    total_fiber = sum((m.get("fiber_g") or 0) for m in user_meals_current)
    sys_sum = sum(l.get("systolic_bp") for l in user_health_current if l.get("systolic_bp"))
    dia_sum = sum(l.get("diastolic_bp") for l in user_health_current if l.get("diastolic_bp"))
    hr_sum = sum(l.get("heart_rate_bpm") for l in user_health_current if l.get("heart_rate_bpm"))
    v_count = len([l for l in user_health_current if l.get("systolic_bp")])
    sleep_sum = sum((s.get("duration_hours") or 0) for s in user_sleep_current if s.get("duration_hours"))
    s_count = len([s for s in user_sleep_current if s.get("duration_hours")])

    return {
        "date_range": {
            "start": seven_days_ago.strftime("%b %d"),
            "end": now_local.strftime("%b %d"),
            "display": f"{seven_days_ago.strftime('%b %d')} – {now_local.strftime('%b %d')}"
        },
        "overview": {
            "hss_average": hss_current,
            "movement_minutes": total_active,
            "meal_days": len(logged_meals_dates),
            "vital_days": len(logged_vitals_dates),
            "sleep_average_hours": round(sleep_sum / s_count, 1) if s_count > 0 else None,
            "symptom_count": len(symptoms_records)
        },
        "daily_records": daily_records_grouped,
        "movement": {
            "total_minutes": total_active,
            "session_count": len(user_exercises_current),
            "trend_minutes": (total_active - prev_active) if user_exercises_prev else None,
            "records": exercise_records
        },
        "nutrition": {
            "days_logged": len(logged_meals_dates),
            "meals_recorded": len(user_meals_current),
            "sodium_mg": total_sodium,
            "sat_fat_g": total_sat_fat,
            "fiber_g": total_fiber,
            "records": nutrition_records
        },
        "vitals": {
            "avg_systolic": round(sys_sum / v_count) if v_count > 0 else None,
            "avg_diastolic": round(dia_sum / v_count) if v_count > 0 else None,
            "avg_bpm": round(hr_sum / v_count) if v_count > 0 else None,
            "days_logged": len(logged_vitals_dates),
            "records": vital_records
        },
        "sleep": {
            "avg_hours": round(sleep_sum / s_count, 1) if s_count > 0 else None,
            "days_logged": len(logged_sleep_dates),
            "records": sleep_records
        },
        "symptoms": {
            "total_count": len(symptoms_records),
            "records": symptoms_records
        },
        "stability": {
            "average": hss_current,
            "trend_pts": (hss_current - hss_prev) if (hss_current is not None and hss_prev is not None) else None,
            "records": hss_records,
            "prev_average": hss_prev
        },
        "consistency": {
            "days_logged": days_logged,
            "current_streak": streak_data["current_streak"],
            "best_streak": streak_data["best_streak"],
            "history": streak_data["history"]
        }
    }
