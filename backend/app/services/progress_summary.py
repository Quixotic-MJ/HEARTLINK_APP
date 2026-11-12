"""The AI summary on Trends (2026-11-12): a plain recap of the chosen period (7, 14 or 30 days) to help the patient
understand their progress and habits. It isn't coaching: no advice, no diagnosis, no risk percentage.

1. `period_facts` works out the facts from the patient's own logs (this period, and the same length just before it).
2. `summary_lines` turns them into short plain sentences. These are shown when the AI isn't used or isn't safe.
3. The AI (Groq) may only reword those sentences into a short paragraph. `checked_summary` drops anything with a new or
   changed number, a medical word or advice, and the plain sentences show instead.

The Dashboard's Today's note no longer uses AI (it's the app's own rules, including the emergency note).
"""
from __future__ import annotations

import logging
import os
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.services import coach_note
from app.services.coach_note import _alive, _day, _local_now

logger = logging.getLogger(__name__)

SUMMARY_DAYS = (7, 14, 30)
SUMMARY_MAX_CHARS = 480
# Each patient gets at most this many new AI summaries a day; the same facts reuse today's summary
AI_SUMMARY_DAILY_CAP = int(os.getenv("AI_SUMMARY_DAILY_CAP", "8"))
_ai_summaries: Dict[tuple, str] = {}
_ai_summary_calls: Dict[str, tuple] = {}

# Advice belongs to the patient's doctor and the app's own steps, not to the summary
ADVICE = re.compile(r"\b(you should|should|try to|try|make sure|recommend\w*|consider|need to|must|aim for|keep up)\b", re.IGNORECASE)
# The Heart risk stays on its own card with its own explanation (HEART_RISK.md); the summary never talks about it
RISK = re.compile(r"\brisk\w*\b", re.IGNORECASE)


def _days(end: date, n: int) -> List[date]:
    return [end - timedelta(days=i) for i in range(n - 1, -1, -1)]


def period_facts(
    *,
    days: int,
    vitals_logs: List[dict],
    meal_logs: List[dict],
    exercise_logs: List[dict],
    sleep_logs: List[dict],
    scores: List[dict],
    sodium_limit: float,
    movement_goal: float,
    now: datetime | None = None,
) -> Dict[str, Any]:
    """The period's facts. Logs may reach back further (two periods are compared); deleted and abandoned ones don't count."""
    today = _local_now(now).date()
    period = _days(today, days)
    before = _days(today - timedelta(days=days), days)
    this, last = set(period), set(before)

    readings = [v for v in vitals_logs if _alive(v) and v.get("systolic_bp") and v.get("diastolic_bp")]
    meals = [m for m in meal_logs if _alive(m)]
    exercises = [e for e in exercise_logs if _alive(e) and e.get("status", "completed") != "abandoned"]
    sleeps = [s for s in sleep_logs if _alive(s) and (s.get("duration_hours") or 0) > 0]

    def on(rows, d):
        return [r for r in rows if _day(r.get("logged_at")) == d]

    def bp(dayset):
        rows = [v for v in readings if _day(v.get("logged_at")) in dayset]
        if not rows:
            return None
        return {
            "readings": len(rows),
            "top": round(sum(float(v["systolic_bp"]) for v in rows) / len(rows)),
            "bottom": round(sum(float(v["diastolic_bp"]) for v in rows) / len(rows)),
        }

    meal_days = [d for d in period if on(meals, d)]
    sodium_within = sum(1 for d in meal_days if sum((m.get("sodium_mg") or 0) for m in on(meals, d)) <= sodium_limit)
    minutes = {d: sum((e.get("duration_minutes") or 0) for e in on(exercises, d)) for d in period}
    sleep_nights = {d: sum(float(s.get("duration_hours") or 0) for s in on(sleeps, d)) for d in period}
    sleep_nights = {d: h for d, h in sleep_nights.items() if h > 0}

    # The habits score at the end of each day (the last record that day)
    by_day: Dict[date, tuple] = {}
    for r in scores:
        d = _day(r.get("computed_at"))
        if d in this and r.get("score") is not None:
            at = str(r.get("computed_at") or "")
            if d not in by_day or at > by_day[d][0]:
                by_day[d] = (at, int(r["score"]))
    scored = [by_day[d][1] for d in sorted(by_day)]

    logged_days = {
        d for d in period
        if on(readings, d) or on(meals, d) or on(exercises, d) or d in sleep_nights
    }
    counts = {
        "blood pressure": len({_day(v.get("logged_at")) for v in readings} & this),
        "meals": len(meal_days),
        "movement": sum(1 for d in period if minutes[d] > 0),
        "sleep": len(sleep_nights),
    }
    steadiest = max(counts, key=lambda k: counts[k]) if any(counts.values()) else None
    return {
        "days": days,
        "logged_days": len(logged_days),
        "bp": bp(this),
        "bp_before": bp(last),
        "score_start": scored[0] if scored else None,
        "score_end": scored[-1] if scored else None,
        "meal_days": len(meal_days),
        "sodium_within_days": sodium_within,
        "sodium_limit": round(sodium_limit),
        "movement_days": counts["movement"],
        "goal_days": sum(1 for d in period if minutes[d] >= movement_goal),
        "movement_goal": round(movement_goal),
        "movement_minutes": round(sum(minutes.values())),
        "sleep_nights": len(sleep_nights),
        "sleep_avg_hours": round(sum(sleep_nights.values()) / len(sleep_nights), 1) if sleep_nights else None,
        "steadiest": steadiest if steadiest and counts[steadiest] >= 2 else None,
        "steadiest_days": counts[steadiest] if steadiest else 0,
    }


def _plural(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


def summary_lines(f: Dict[str, Any]) -> List[str]:
    """The plain recap, one fact per sentence. Empty when nothing was logged in the period."""
    days = f["days"]
    if not f["logged_days"]:
        return []
    lines = [f"You logged something on {f['logged_days']} of the last {days} days."]
    a, b = f["score_start"], f["score_end"]
    if a is not None and b is not None:
        if b == a:
            lines.append(f"Your habits score stayed at {b}.")
        else:
            lines.append(f"Your habits score went from {a} to {b}.")
    bp, before = f["bp"], f["bp_before"]
    if bp:
        line = f"Your blood pressure averaged {bp['top']}/{bp['bottom']} over {_plural(bp['readings'], 'reading')}"
        if before:
            change = bp["top"] - before["top"]
            if abs(change) >= 5:
                line += f", {abs(change)} {'lower' if change < 0 else 'higher'} on top than the {days} days before"
            else:
                line += f", about the same as the {days} days before"
        lines.append(line + ".")
    if f["meal_days"]:
        lines.append(
            f"Sodium stayed within your {f['sodium_limit']:,} mg limit on {f['sodium_within_days']} of the "
            f"{_plural(f['meal_days'], 'day')} you logged meals."
        )
    if f["movement_days"]:
        lines.append(
            f"You moved for {f['movement_minutes']} minutes in total and reached your {f['movement_goal']}-minute goal on "
            f"{_plural(f['goal_days'], 'day')}."
        )
    if f["sleep_nights"]:
        lines.append(f"You slept {f['sleep_avg_hours']:g} hours a night on average over {_plural(f['sleep_nights'], 'night')}.")
    if f["steadiest"]:
        lines.append(f"Your most regular log was {f['steadiest']}, on {_plural(f['steadiest_days'], 'day')}.")
    return lines


def checked_summary(text: str, facts_text: str) -> Optional[str]:
    """The AI's summary if it is safe to show, else None: the same checks as Today's note had (no new or changed
    numbers, no medical words, not cut off), plus no advice and a longer limit for a short paragraph."""
    if not text:
        return None
    paragraph = coach_note.THINKING.sub("", text).strip().strip('"').strip()
    if not paragraph or len(paragraph) > SUMMARY_MAX_CHARS or "\n\n" in paragraph:
        return None
    if coach_note.BANNED.search(paragraph) or ADVICE.search(paragraph) or RISK.search(paragraph):
        return None
    allowed = {n.replace(",", "") for n in coach_note.NUMBER.findall(facts_text)}
    if any(n.replace(",", "") not in allowed for n in coach_note.NUMBER.findall(paragraph)):
        return None
    if not paragraph.endswith((".", "!")):
        return None
    return paragraph


def ai_prompt(first_name: str, lines: List[str]) -> str:
    return (
        f"Write a short, warm summary for {first_name} of these facts about their own heart-health logs, in at most 3 "
        "plain sentences. Describe their progress and habits only. Keep every number exactly as written and do not add "
        "any new number or fact. Do not give advice or tell them what to do. Do not mention diagnoses, treatments, "
        "medicines or risks.\n\nFacts: " + " ".join(lines)
    )


def _ask_ai(client, prompt: str) -> str:
    chat = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                # /no_think: Qwen models otherwise write their reasoning first
                "content": "/no_think You write short, factual progress summaries for a heart-health app. Output only the "
                "summary, with no quotation marks, preamble or reasoning.",
            },
            {"role": "user", "content": prompt},
        ],
        model="qwen/qwen3.8-27b",
        temperature=0.4,
        max_tokens=220,
    )
    return chat.choices[0].message.content or ""


def _ai_allowed(user_id: str, today: str) -> bool:
    day, count = _ai_summary_calls.get(user_id, (today, 0))
    if day != today:
        count = 0
    if count >= AI_SUMMARY_DAILY_CAP:
        return False
    _ai_summary_calls[user_id] = (today, count + 1)
    return True


def _remember(key: tuple, text: str) -> None:
    for old in [k for k in _ai_summaries if k[1] != key[1]]:
        del _ai_summaries[old]
    _ai_summaries[key] = text


def summarize(f: Dict[str, Any], first_name: Optional[str], user_id: str, now: datetime | None = None) -> Dict[str, Any]:
    """{days, lines, text, ai_written}: the plain lines always, and the AI's paragraph as `text` when it passed the checks."""
    lines = summary_lines(f)
    result = {"days": f["days"], "lines": lines, "text": " ".join(lines), "ai_written": False}
    key_api = os.environ.get("GROQ_API_KEY")
    if not lines or not key_api or not first_name:
        return result
    today = _local_now(now).date().isoformat()
    cache_key = (user_id, today, f["days"], result["text"])
    text = _ai_summaries.get(cache_key)
    try:
        if text is None and _ai_allowed(user_id, today):
            import groq

            client = groq.Groq(api_key=key_api, timeout=6.0)
            text = checked_summary(_ask_ai(client, ai_prompt(first_name, lines)), result["text"])
            if text:
                _remember(cache_key, text)
    except Exception as e:  # the plain lines show instead
        logger.warning("AI summary failed: %s", type(e).__name__)
        text = None
    if text:
        result.update(text=text, ai_written=True)
    return result


def build_summary(user_id: str, days: int) -> Dict[str, Any]:
    """Loads two periods of logs and returns the Trends summary."""
    from app.db.repositories import (
        get_baseline_repo, get_exercises_repo, get_hss_repo, get_meals_repo, get_profile_repo, get_sleep_repo,
    )
    from app.services.health_logs import get_health_logs
    from app.services.nutrition_targets import targets_for_user
    from app.utils.time import utc_now

    cutoff = (utc_now() - timedelta(days=days * 2 + 1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    thresholds = get_baseline_repo().get_thresholds(user_id)
    targets = targets_for_user(user_id, thresholds)
    f = period_facts(
        days=days,
        vitals_logs=get_health_logs(user_id, cutoff=cutoff),
        meal_logs=get_meals_repo().list_user_meals(user_id, cutoff=cutoff),
        exercise_logs=get_exercises_repo().list_user_logs(user_id, cutoff=cutoff),
        sleep_logs=get_sleep_repo().list_user_logs(user_id, cutoff=cutoff),
        scores=get_hss_repo().list_hss_history(user_id, cutoff=cutoff),
        sodium_limit=targets["sodium_mg"]["value"],
        movement_goal=(thresholds or {}).get("active_minutes_goal") or 30,
    )
    profile = get_profile_repo().get_by_id(user_id) or {}
    return summarize(f, profile.get("first_name"), user_id)
