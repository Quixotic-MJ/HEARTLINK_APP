from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.mock_db import (
    profiles,
    css_history,
    daily_health_logs,
    alerts,
    recipes,
    exercise_routines,
    baseline_dietary,
    meal_logs,
    exercise_logs,
    user_thresholds,
)

def _safe_date(val: Any) -> datetime.date:
    if isinstance(val, datetime):
        return val.date()
    elif isinstance(val, str):
        return datetime.fromisoformat(val).date()
    return datetime.now().date()
    
def _safe_datetime(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    elif isinstance(val, str):
        return datetime.fromisoformat(val)
    return datetime.now()

# ─── Dietary exclusion map ─────────────────────────────────────────────────────
# Maps a dietary practice to ingredient keywords that should be excluded.
DIETARY_EXCLUSIONS: Dict[str, List[str]] = {
    "Halal": ["pork", "bacon", "ham", "lard", "gelatin_pork"],
    "Vegetarian": [
        "chicken",
        "pork",
        "beef",
        "salmon",
        "fish",
        "shrimp",
        "bacon",
        "ham",
        "lard",
    ],
    "Vegan": [
        "chicken",
        "pork",
        "beef",
        "salmon",
        "fish",
        "shrimp",
        "bacon",
        "ham",
        "lard",
        "egg",
        "milk",
        "cheese",
        "butter",
        "cream",
        "honey",
    ],
    "Pescatarian": ["chicken", "pork", "beef", "bacon", "ham", "lard"],
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


from datetime import datetime

def _get_comparison_score(user_css: list) -> int:
    """Finds the immediately previous score to provide real-time dynamic feedback."""
    if len(user_css) < 2:
        return 0
    return user_css[1].get("score", 0)

def _compute_trend(user_css: list) -> str:
    """Compute score trend comparing to yesterday (or baseline)."""
    if len(user_css) < 2:
        return "+0"
    latest = user_css[0].get("score", 0)
    previous = _get_comparison_score(user_css)
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
    previous_score = _get_comparison_score(user_css)
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
        l
        for l in daily_health_logs
        if l["user_id"] == user_id and _safe_date(l["logged_at"]) == today
    ]

    # Meals logged today
    meals_today = [
        m
        for m in meal_logs
        if m["user_id"] == user_id and _safe_date(m["logged_at"]) == today and m.get("deleted_at") is None
    ]

    # Exercises logged today
    exercises_today = [
        e
        for e in exercise_logs
        if e["user_id"] == user_id and _safe_date(e["logged_at"]) == today and e.get("deleted_at") is None
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
    print(f"DEBUG get_dashboard_data: looking for {user_id}")
    print(f"DEBUG get_dashboard_data: profiles available = {[p['id'] for p in profiles]}")
    profile = next((p for p in profiles if p["id"] == user_id), None)
    if not profile:
        print("DEBUG get_dashboard_data: profile not found!")
        return {}

    user_css = sorted(
        [c for c in css_history if c["user_id"] == user_id],
        key=lambda x: x["computed_at"],
        reverse=True,
    )
    latest_css = (
        user_css[0]
        if user_css
        else {"score": 0, "tier": "Unknown", "computed_at": None}
    )

    user_logs = sorted(
        [l for l in daily_health_logs if l["user_id"] == user_id],
        key=lambda x: x["logged_at"],
        reverse=True,
    )
    latest_log = user_logs[0] if user_logs else None

    user_alerts = sorted(
        [a for a in alerts if a["user_id"] == user_id],
        key=lambda x: x["created_at"],
        reverse=True,
    )
    latest_alert = user_alerts[0] if user_alerts else None

    # ── Dietary preference filtering ───────────────────────────────────────────
    dietary_entry = next((d for d in baseline_dietary if d["user_id"] == user_id), None)
    dietary_practice = (
        dietary_entry.get("dietary_practice", "") if dietary_entry else ""
    )

    # ── Recommendations: filter by CSS tier AND dietary preference ─────────────
    tier = latest_css.get("tier", "Stable")
    reco_recipes = [
        r
        for r in recipes
        if (r.get("css_tier") == tier or r.get("css_tier") == "Stable")
        and _recipe_matches_diet(r, dietary_practice)
    ]
    reco_exercises = [
        e
        for e in exercise_routines
        if e.get("css_tier") == tier or e.get("css_tier") == "Stable"
    ]

    recommendations = []
    for r in reco_recipes[:2]:
        recommendations.append(
            {
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
                "route": f"/(home)/recipe-details?id={r['id']}",
                "name": r.get("name", ""),
                "calories": r.get("calories", 0),
                "sodium_mg": r.get("sodium_mg", 0),
                "image_url": r.get("image_url", ""),
                "css_tier": r.get("css_tier", "Stable"),
            }
        )
    for e in reco_exercises[:2]:
        recommendations.append(
            {
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
                "route": f"/(home)/exercise-details?id={e['id']}",
            }
        )

    # ── Compute real trend ─────────────────────────────────────────────────────
    trend = _compute_trend(user_css)

    # ── Generate dynamic smart insight ─────────────────────────────────────────
    insight = _generate_insight(user_css, latest_log)

    # ── Today's activity summary ───────────────────────────────────────────────
    today_activity = _get_today_activity(user_id)

    # ── Sodium budget ──────────────────────────────────────────────────────────
    threshold = next((t for t in user_thresholds if t["user_id"] == user_id), None)
    sodium_limit = threshold.get("sodium_limit_mg", 1500) if threshold else 1500

    # ── Unread notifications ───────────────────────────────────────────────────
    from app.mock_db import notifications
    unread_count = sum(1 for n in notifications if n["user_id"] == user_id and not n.get("read", True))

    return {
        "user": {
            "first_name": profile.get("first_name"),
            "last_name": profile.get("last_name"),
            "avatar_url": profile.get("avatar_url"),
        },
        "css_score": latest_css.get("score", 0),
        "css_tier": latest_css.get("tier", "Unknown"),
        "last_sync": latest_css.get("computed_at"),
        "unread_notifications_count": unread_count,
        "latest_vitals": {
            "bpm": latest_log.get("heart_rate_bpm") if latest_log else "--",
            "bp": (
                f"{latest_log.get('systolic_bp', '--')}/{latest_log.get('diastolic_bp', '--')}"
                if latest_log
                else "--/--"
            ),
            "trend": trend,
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


def get_7_day_wrap_up_data(user_id: str) -> Dict[str, Any]:
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)

    # Filter logs
    user_meals = [
        m
        for m in meal_logs
        if m["user_id"] == user_id and _safe_datetime(m["logged_at"]) >= seven_days_ago and m.get("deleted_at") is None
    ]
    user_exercises = [
        e
        for e in exercise_logs
        if e["user_id"] == user_id and _safe_datetime(e["logged_at"]) >= seven_days_ago and e.get("deleted_at") is None
    ]
    user_health = [
        l
        for l in daily_health_logs
        if l["user_id"] == user_id and _safe_datetime(l["logged_at"]) >= seven_days_ago
    ]

    # Totals
    total_sodium = sum(m.get("sodium_mg", 0) for m in user_meals)
    total_sat_fat = sum(m.get("saturated_fat_g", 0) for m in user_meals)
    total_fiber = sum(m.get("fiber_g", 0) for m in user_meals)
    total_active = sum(e.get("duration_minutes", 0) for e in user_exercises)

    # Missed days (health logs)
    logged_dates = {_safe_date(l["logged_at"]) for l in user_health}
    logs_missed = 7 - len(logged_dates)
    if logs_missed < 0:
        logs_missed = 0

    # Symptoms
    symptoms_dict = {}
    for log in user_health:
        for symp in log.get("symptoms", []):
            symptoms_dict[symp] = symptoms_dict.get(symp, 0) + 1
    symptoms_list = [{"name": k, "count": v} for k, v in symptoms_dict.items()]
    symptoms_list.sort(key=lambda x: x["count"], reverse=True)

    # Fill in empty symptoms if we don't have at least 3
    default_symps = ["Chest Discomfort", "Shortness of Breath", "Dizziness"]
    for ds in default_symps:
        if len(symptoms_list) >= 3:
            break
        if not any(s["name"] == ds for s in symptoms_list):
            symptoms_list.append({"name": ds, "count": 0})

    # Days array for chart (last 7 days CSS)
    days_arr = []
    user_css = sorted(
        [c for c in css_history if c["user_id"] == user_id],
        key=lambda x: _safe_datetime(x["computed_at"]),
    )
    avg_css = 0
    css_count = 0

    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        day_str = target_date.strftime("%a")[0]  # 'M', 'T', 'W', etc.

        # Find CSS for this date
        day_css = [
            c["score"] for c in user_css if _safe_date(c["computed_at"]) <= target_date
        ]
        score = day_css[-1] if day_css else 0

        days_arr.append({"day": day_str, "value": score})
        if score > 0:
            avg_css += score
            css_count += 1

    display_css = round(avg_css / css_count) if css_count > 0 else 0

    # Determine positive/negative
    is_positive = display_css >= 60 or display_css == 0
    banner_title = "Great progress!" if is_positive else "Action needed"
    banner_text = (
        "Your cardiovascular stability has been consistently good over the last 7 days."
        if is_positive
        else "Consider reviewing your recent meals and activity levels."
    )

    # Activity Log grouped by day
    # { '2026-07-24': { meals: ['Chicken'], exercises: ['Walking'] } }
    activity_log = {}
    for i in range(7):
        d_str = (now - timedelta(days=i)).date().isoformat()
        activity_log[d_str] = {"meals": [], "exercises": []}

    for m in user_meals:
        d_str = _safe_date(m["logged_at"]).isoformat()
        if d_str in activity_log:
            activity_log[d_str]["meals"].append(m.get("meal_name", "Meal"))

    for e in user_exercises:
        d_str = _safe_date(e["logged_at"]).isoformat()
        if d_str in activity_log:
            activity_log[d_str]["exercises"].append(e.get("routine_name", "Exercise"))

    # Convert activity log to sorted list for frontend
    activity_log_list = []
    for d_str, data in sorted(activity_log.items(), reverse=True):
        if data["meals"] or data["exercises"]:
            activity_log_list.append(
                {"date": d_str, "meals": data["meals"], "exercises": data["exercises"]}
            )

    # Gamification: Streak calculation (Option A: logged vitals)
    streak_calendar = []
    streak_count = 0
    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        logged_this_day = target_date in logged_dates
        streak_calendar.append(logged_this_day)

    for i in range(6, -1, -1):
        if streak_calendar[i]:
            streak_count += 1
        elif i == 6:
            continue # Haven't logged today yet, streak not broken
        else:
            break

    # Gamification: Trends vs last week (mocked for simplicity)
    trends = {
        "css": 5 if is_positive else -3,
        "sodium": -12 if total_sodium < 15000 else 8,
        "active": 30 if total_active > 100 else -10,
    }

    return {
        "css": display_css,
        "sodium": total_sodium,
        "active": total_active,
        "missed": logs_missed,
        "satFat": round(total_sat_fat, 1),
        "fiber": total_fiber,
        "bannerTitle": banner_title,
        "bannerText": banner_text,
        "symptoms": symptoms_list[:3],
        "days": days_arr,
        "barColor": "#639922" if is_positive else "#e24b4a",
        "isPositive": is_positive,
        "activity_log": activity_log_list,
        "streak_count": streak_count,
        "streak_calendar": streak_calendar,
        "trends": trends
    }
