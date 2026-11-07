"""Today's note, made helpful: the fact that changed the score (kept as the title), why, and one step the app can
take you to. Every number comes from the patient's own logs; the AI may only reword the second line, and what it
writes is checked before it is shown (no new numbers, no medical claims). Emergency notes are never touched.

The facts (`day_facts`) are built once per dashboard load from data the dashboard already has.
"""
from __future__ import annotations

import re
import zoneinfo
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.utils.time import parse_utc, to_local_date, utc_now

LOCAL_TZ = "Asia/Manila"
MEAL_NAME_MAX = 32


def _local_now(now: datetime | None = None) -> datetime:
    return (now or utc_now()).astimezone(zoneinfo.ZoneInfo(LOCAL_TZ))


def _day(val: Any):
    dt = parse_utc(val)
    return to_local_date(dt) if dt else None


def _alive(row: dict) -> bool:
    return not row.get("deleted_at") and not row.get("is_deleted", False)


def _avg(values: List[float]) -> Optional[int]:
    return round(sum(values) / len(values)) if values else None


def day_facts(
    *,
    meal_logs: List[dict],
    exercise_logs: List[dict],
    vitals_logs: List[dict],
    sleep_hours: float,
    sodium_limit: float,
    movement_goal: float,
    exercise_paused: bool = False,
    now: datetime | None = None,
) -> Dict[str, Any]:
    """What the note may talk about: today's numbers, the latest meal and exercise, and the last two weeks."""
    local = _local_now(now)
    today = local.date()
    week = [today - timedelta(days=i) for i in range(6, -1, -1)]  # oldest first, ending today
    last_week = [d - timedelta(days=7) for d in week]

    meals = [m for m in meal_logs if _alive(m)]
    exercises = [e for e in exercise_logs if _alive(e) and e.get("status", "completed") != "abandoned"]
    readings = [v for v in vitals_logs if _alive(v) and v.get("systolic_bp") and v.get("diastolic_bp")]

    def sodium_on(d):
        return sum((m.get("sodium_mg") or 0) for m in meals if _day(m.get("logged_at")) == d)

    def minutes_on(d):
        return sum((e.get("duration_minutes") or 0) for e in exercises if _day(e.get("logged_at")) == d)

    def meal_days(days):
        return [d for d in days if any(_day(m.get("logged_at")) == d for m in meals)]

    def tops(days):
        return [float(v["systolic_bp"]) for v in readings if _day(v.get("logged_at")) in days]

    todays_meals = sorted((m for m in meals if _day(m.get("logged_at")) == today), key=lambda m: m.get("logged_at") or "")
    last_meal = todays_meals[-1] if todays_meals else None
    todays_ex = sorted((e for e in exercises if _day(e.get("logged_at")) == today), key=lambda e: e.get("logged_at") or "")
    last_ex = todays_ex[-1] if todays_ex else None

    logged_meal_days = meal_days(week)
    this_tops, last_tops = tops(set(week)), tops(set(last_week))
    return {
        "hour": local.hour,
        "exercise_paused": exercise_paused,
        "sodium_mg": round(sodium_on(today)),
        "sodium_limit": round(sodium_limit),
        "movement_mins": round(minutes_on(today)),
        "movement_goal": round(movement_goal),
        "sleep_hours": sleep_hours or 0,
        "meals_today": len(todays_meals),
        "vitals_today": any(_day(v.get("logged_at")) == today for v in vitals_logs if _alive(v)),
        "last_meal": (
            {"name": str(last_meal.get("meal_name") or "your meal")[:MEAL_NAME_MAX], "sodium_mg": round(last_meal.get("sodium_mg") or 0)}
            if last_meal
            else None
        ),
        "last_exercise_mins": round(last_ex.get("duration_minutes") or 0) if last_ex else 0,
        # Weekly patterns: days counted only when something was logged that day
        "sodium_over_days": sum(1 for d in logged_meal_days if sodium_on(d) > sodium_limit),
        "meal_days": len(logged_meal_days),
        "goal_days": sum(1 for d in week if minutes_on(d) >= movement_goal),
        "top_avg_week": _avg(this_tops) if len(this_tops) >= 3 else None,
        "top_avg_last_week": _avg(last_tops) if len(last_tops) >= 3 else None,
    }


# ── A, B, E: the fact, why, and one step ────────────────────────────────────────────────────────────────────


def improve_note(title: str, body: str, icon: str, action: Optional[str], kind: str, diff: int, score: int, f: Dict[str, Any]):
    """Give the rules' note real numbers and a step that fits the time of day. `kind` is what moved the score:
    "meal", "exercise", "reading", "stale", "removed" or "" (nothing new). Emergency notes never come here."""
    # A stale score, a removed log and a critical score keep the rules' own words and step
    if kind in ("stale", "removed") or (kind == "" and score < 50):
        return title, body, icon, action
    left = f["sodium_limit"] - f["sodium_mg"]
    sodium_line = (
        f"You have {left:,} mg of your {f['sodium_limit']:,} mg sodium limit left today."
        if left >= 0
        else f"You're {-left:,} mg over your {f['sodium_limit']:,} mg sodium limit today."
    )
    to_go = max(0, f["movement_goal"] - f["movement_mins"])

    if kind == "meal" and f["last_meal"]:
        meal = f["last_meal"]
        if diff:
            title = f"{'Up' if diff > 0 else 'Down'} {abs(diff)} from {meal['name']}."
        body = f"It had {meal['sodium_mg']:,} mg sodium. {sodium_line}"
        action = "low_sodium_ideas" if left < 600 else ("review_meals" if diff < 0 else None)
        return title, body, icon, action

    if kind == "exercise":
        body = (
            f"You've moved {f['movement_mins']} of {f['movement_goal']} minutes today."
            + (" Today's movement goal is reached." if to_go == 0 else f" {to_go} minutes to go.")
        )
        return title, body, icon, (None if to_go == 0 or f["exercise_paused"] else "start_walk")

    if kind == "reading":
        return title, body, icon, action

    # Nothing new moved the score: point to the next useful thing for this time of day
    hour = f["hour"]
    if not f["vitals_today"]:
        return title, "You haven't logged your blood pressure today.", icon, "log_vitals"
    if hour < 12 and not f["sleep_hours"]:
        return title, "Log how long you slept last night.", icon, "log_sleep"
    if f["meals_today"] == 0 and hour >= 13:
        return title, f"No meals logged yet today. {sodium_line}", icon, "log_meal"
    if hour >= 16 and to_go > 0 and not f["exercise_paused"]:
        return title, f"You've moved {f['movement_mins']} of {f['movement_goal']} minutes today.", icon, "start_walk"
    if f["meals_today"]:
        return title, sodium_line, icon, ("low_sodium_ideas" if left < 600 else action)
    return title, body, icon, action


# ── C: the week's patterns, shown on Trends ──────────────────────────────────────────────────────────────────────────────────


def weekly_insights(f: Dict[str, Any]) -> List[Dict[str, str]]:
    """Up to one line each on blood pressure, sodium and movement over the last 7 days, when there's enough logged."""
    lines: List[Dict[str, str]] = []
    week, last = f["top_avg_week"], f["top_avg_last_week"]
    if week:
        if not last:
            text = f"Your top number averaged {week} this week."
        elif abs(week - last) >= 5:
            text = f"Your top number averaged {week} this week, {abs(week - last)} {'lower' if week < last else 'higher'} than last week."
        else:
            text = f"Your top number averaged {week} this week, about the same as last week."
        lines.append({"kind": "pressure", "text": text})
    if f["meal_days"] >= 3:
        text = (
            f"Sodium went over your limit on {f['sodium_over_days']} of the {f['meal_days']} days you logged meals this week."
            if f["sodium_over_days"]
            else f"Sodium stayed within your limit on all {f['meal_days']} days you logged meals this week."
        )
        lines.append({"kind": "sodium", "text": text})
    if f["goal_days"]:
        lines.append({"kind": "movement", "text": f"You reached your movement goal on {f['goal_days']} of the last 7 days."})
    return lines


def weekly_report_status(logs: Dict[str, List[dict]], created_at: Any, now: datetime | None = None) -> Dict[str, int]:
    """What the app needs to decide if the weekly report is ready: days with a log in the last 7, and the account's age."""
    today = _local_now(now).date()
    week = {today - timedelta(days=i) for i in range(7)}
    days = {
        _day(row.get("logged_at"))
        for name in ("meals", "exercises", "vitals", "sleep")
        for row in logs.get(name, [])
        if _alive(row) and row.get("status") != "abandoned"
    }
    created = _day(created_at)
    return {"logged_days": len(days & week), "account_age_days": (today - created).days if created else 0}


# ── D: the AI only rewords, and is checked ────────────────────────────────────────────────────────────────

BANNED = re.compile(
    r"\b(diagnos\w*|cure\w*|treat(ment|s|ed|ing)?|prescri\w*|medication dose|dosage|stop taking|heart attack|stroke)\b",
    re.IGNORECASE,
)
NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")
THINKING = re.compile(r"<think>.*?(</think>|$)", re.DOTALL | re.IGNORECASE)


def checked_ai_line(text: str, facts_text: str) -> Optional[str]:
    """The AI's line if it is safe to show, else None (the rules' line is used instead)."""
    if not text:
        return None
    line = THINKING.sub("", text).strip().strip('"').strip()
    if not line or len(line) > 240 or "\n\n" in line:
        return None
    if BANNED.search(line):
        return None
    allowed = {n.replace(",", "") for n in NUMBER.findall(facts_text)}
    if any(n.replace(",", "") not in allowed for n in NUMBER.findall(line)):
        return None  # it made up or changed a number
    if not line.endswith((".", "!", "?")):
        return None  # cut off mid-sentence
    return line


def ai_prompt(first_name: str, title: str, body: str) -> str:
    facts = " ".join(x for x in (title, body) if x)
    return (
        f"Rewrite this note for {first_name} in a warm, plain, encouraging voice, in at most 2 short sentences. "
        "Keep every number exactly as written and do not add any new number, fact or advice. "
        "Do not mention diagnoses, treatments or medicines.\n\n"
        f"Note: {facts}"
    )
