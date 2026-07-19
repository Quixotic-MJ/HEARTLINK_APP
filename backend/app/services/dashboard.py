from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.mock_db import (
    profiles, css_history, daily_health_logs, alerts, recipes,
    exercise_routines, baseline_dietary, meal_logs, exercise_logs,
    user_thresholds,
)


# ─── Dietary exclusion map ─────────────────────────────────────────────────────
# Maps a dietary practice to ingredient keywords that should be excluded.
DIETARY_EXCLUSIONS: Dict[str, List[str]] = {
    "Halal":      ["pork", "bacon", "ham", "lard", "gelatin_pork"],
    "Vegetarian": ["chicken", "pork", "beef", "salmon", "fish", "shrimp", "bacon", "ham", "lard"],
    "Vegan":      ["chicken", "pork", "beef", "salmon", "fish", "shrimp", "bacon", "ham", "lard",
                   "egg", "milk", "cheese", "butter", "cream", "honey"],
    "Pescatarian":["chicken", "pork", "beef", "bacon", "ham", "lard"],
}


def _recipe_matches_diet(recipe: dict, dietary_practice: str) -> bool:
    """Return True if the recipe does NOT contain excluded ingredients."""
    excluded = DIETARY_EXCLUSIONS.get(dietary_practice, [])
    if not excluded:
        return True  # No restrictions (e.g. "Standard Filipino")
    ingredient_keys = [k.lower() for k in recipe.get("ingredients", {}).keys()]
    recipe_tags = [t.lower() for t in recipe.get("tags", [])]
    recipe_name_lower = recipe.get("name", "").lower()
    for word in excluded:
        # Check ingredient keys
        for key in ingredient_keys:
            if word in key:
                return False
        # Check tags
        for tag in recipe_tags:
            if word in tag:
                return False
        # Check recipe name
        if word in recipe_name_lower:
            return False
    return True


def _compute_trend(user_css: list) -> str:
    """Compute score trend from the two most recent CSS entries."""
    if len(user_css) < 2:
        return "+0"
    latest = user_css[0].get("score", 0)
    previous = user_css[1].get("score", 0)
    diff = latest - previous
    if diff > 0:
        return f"+{diff}"
    return str(diff)  # Already includes minus sign for negatives


def _generate_insight(user_css: list, latest_log: dict | None) -> dict:
    """Generate a dynamic smart insight based on actual data."""
    if len(user_css) < 2:
        return {
            "title": "Start tracking to unlock insights.",
            "body": "Log your vitals and meals daily so HeartLink can give you personalized insights.",
            "icon": "info",
        }

    latest_score = user_css[0].get("score", 0)
    previous_score = user_css[1].get("score", 0)
    diff = latest_score - previous_score

    if diff > 0:
        title = f"Your stability score improved by {diff} points."
        body = "Consistent tracking is paying off. Keep logging your vitals and meals."
        icon = "trending-up"
    elif diff < 0:
        title = f"Your stability score dropped by {abs(diff)} points."
        if latest_log and latest_log.get("symptoms"):
            symptom_count = len(latest_log["symptoms"])
            body = f"You logged {symptom_count} symptom(s) recently. Consider reviewing your diet and consulting your care team."
        else:
            body = "Consider reviewing your recent meals and activity levels."
        icon = "trending-down"
    else:
        title = "Your stability score is holding steady."
        body = "No change detected. Keep maintaining your current routine."
        icon = "minus"

    return {"title": title, "body": body, "icon": icon}


def _get_today_activity(user_id: str) -> dict:
    """Summarize today's logged activity."""
    today = datetime.now().date()

    # Vitals logged today
    vitals_today = [
        l for l in daily_health_logs
        if l["user_id"] == user_id and l["logged_at"].date() == today
    ]

    # Meals logged today
    meals_today = [
        m for m in meal_logs
        if m["user_id"] == user_id and m["logged_at"].date() == today
    ]

    # Exercises logged today
    exercises_today = [
        e for e in exercise_logs
        if e["user_id"] == user_id and e["logged_at"].date() == today
    ]

    total_sodium = sum(m.get("sodium_mg", 0) for m in meals_today)
    total_calories = sum(m.get("calories", 0) for m in meals_today)
    total_exercise_min = sum(e.get("duration_minutes", 0) for e in exercises_today)

    return {
        "vitals_logged": len(vitals_today) > 0,
        "meals_count": len(meals_today),
        "exercises_count": len(exercises_today),
        "total_sodium_mg": total_sodium,
        "total_calories": total_calories,
        "total_exercise_minutes": total_exercise_min,
    }


def get_dashboard_data(user_id: str) -> Dict[str, Any]:
    profile = next((p for p in profiles if p["id"] == user_id), None)
    if not profile:
        return {}

    user_css = sorted([c for c in css_history if c["user_id"] == user_id], key=lambda x: x["computed_at"], reverse=True)
    latest_css = user_css[0] if user_css else {"score": 0, "tier": "Unknown", "computed_at": None}

    user_logs = sorted([l for l in daily_health_logs if l["user_id"] == user_id], key=lambda x: x["logged_at"], reverse=True)
    latest_log = user_logs[0] if user_logs else None

    user_alerts = sorted([a for a in alerts if a["user_id"] == user_id], key=lambda x: x["created_at"], reverse=True)
    latest_alert = user_alerts[0] if user_alerts else None

    # ── Dietary preference filtering ───────────────────────────────────────────
    dietary_entry = next((d for d in baseline_dietary if d["user_id"] == user_id), None)
    dietary_practice = dietary_entry.get("dietary_practice", "") if dietary_entry else ""

    # ── Recommendations: filter by CSS tier AND dietary preference ─────────────
    tier = latest_css.get("tier", "Stable")
    reco_recipes = [
        r for r in recipes
        if (r.get("css_tier") == tier or r.get("css_tier") == "Stable")
        and _recipe_matches_diet(r, dietary_practice)
    ]
    reco_exercises = [e for e in exercise_routines if e.get("css_tier") == tier or e.get("css_tier") == "Stable"]

    recommendations = []
    for r in reco_recipes[:2]:
        recommendations.append({
            "id": r["id"],
            "type": "recipe",
            "tag": "Heart-healthy",
            "title": r["name"],
            "subtitle": f"Sodium: {r.get('sodium_mg', 0)}mg",
            "icon": "bowl-mix-outline",
            "bg": "#14532d",
            "tagBg": "rgba(255,255,255,0.12)",
            "tagText": "rgba(255,255,255,0.8)",
            "subColor": "#86efac",
            "route": f"/(home)/recipe-details?id={r['id']}"
        })
    for e in reco_exercises[:2]:
        recommendations.append({
            "id": e["id"],
            "type": "exercise",
            "tag": "Exercise",
            "title": e["name"],
            "subtitle": e["description"][:30] + "...",
            "icon": "yoga",
            "bg": "#1e293b",
            "tagBg": "rgba(255,255,255,0.12)",
            "tagText": "rgba(255,255,255,0.8)",
            "subColor": "#94a3b8",
            "route": f"/(home)/exercise-details?id={e['id']}"
        })

    # ── Compute real trend ─────────────────────────────────────────────────────
    trend = _compute_trend(user_css)

    # ── Generate dynamic smart insight ─────────────────────────────────────────
    insight = _generate_insight(user_css, latest_log)

    # ── Today's activity summary ───────────────────────────────────────────────
    today_activity = _get_today_activity(user_id)

    # ── Sodium budget ──────────────────────────────────────────────────────────
    threshold = next((t for t in user_thresholds if t["user_id"] == user_id), None)
    sodium_limit = threshold.get("sodium_limit_mg", 1500) if threshold else 1500

    return {
        "user": {
            "first_name": profile.get("first_name"),
            "last_name": profile.get("last_name"),
            "avatar_url": profile.get("avatar_url"),
        },
        "css_score": latest_css.get("score", 0),
        "css_tier": latest_css.get("tier", "Unknown"),
        "last_sync": latest_css.get("computed_at"),
        "latest_vitals": {
            "bpm": latest_log.get("heart_rate_bpm") if latest_log else "--",
            "bp": f"{latest_log.get('systolic_bp', '--')}/{latest_log.get('diastolic_bp', '--')}" if latest_log else "--/--",
            "trend": trend
        },
        "latest_alert": latest_alert,
        "recommendations": recommendations,
        "insight": insight,
        "today_activity": today_activity,
        "sodium_budget": {
            "consumed_mg": today_activity["total_sodium_mg"],
            "limit_mg": sodium_limit,
        },
    }

