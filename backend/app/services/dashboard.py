from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.mock_db import (
    profiles,
    hss_history,
    daily_health_logs,
    alerts,
    recipes,
    exercise_routines,
    baseline_onboarding,
    meal_logs,
    exercise_logs,
    sleep_logs,
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
    ingredients = recipe.get("ingredients", [])
    ingredient_keys = [str(item.get("name", "")).lower() for item in ingredients if isinstance(item, dict)]
    recipe_tags = [str(t).lower() for t in recipe.get("tags", [])]
    recipe_name_lower = str(recipe.get("name", "")).lower()
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

def _get_comparison_score(user_hss: list) -> int:
    """Finds the immediately previous score to provide real-time dynamic feedback."""
    if len(user_hss) < 2:
        return user_hss[0].get("score", 0) if user_hss else 0
    return user_hss[1].get("score", 0)

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


def _generate_insight(user_hss: list, latest_log: dict | None) -> dict:
    """Generate a dynamic smart insight based on actual data."""
    if len(user_hss) < 2:
        return {
            "title": "Start tracking to unlock insights.",
            "body": "Log your vitals and meals daily so HeartLink can give you personalized insights.",
            "icon": "info",
        }

    latest_score = user_hss[0].get("score", 0)
    previous_score = _get_comparison_score(user_hss)
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
        if e["user_id"] == user_id and _safe_date(e["logged_at"]) == today and e.get("deleted_at") is None and e.get("status", "completed") != "abandoned"
    ]

    # Sleep logged today
    sleeps_today = [
        s
        for s in sleep_logs
        if s["user_id"] == user_id and _safe_date(s["logged_at"]) == today and s.get("deleted_at") is None
    ]

    total_sodium = sum(m.get("sodium_mg", 0) for m in meals_today)
    total_calories = sum(m.get("calories", 0) for m in meals_today)
    total_exercise_min = sum(e.get("duration_minutes", 0) for e in exercises_today)
    total_sleep_hours = sum(s.get("duration_hours", 0) for s in sleeps_today)

    return {
        "vitals_logged": len(vitals_today) > 0,
        "meals_count": len(meals_today),
        "exercises_count": len(exercises_today),
        "sleep_logged": len(sleeps_today) > 0,
        "total_sodium_mg": total_sodium,
        "total_calories": total_calories,
        "total_exercise_minutes": total_exercise_min,
        "total_sleep_hours": total_sleep_hours,
    }


def get_dashboard_data(user_id: str) -> Dict[str, Any]:
    print(f"DEBUG get_dashboard_data: looking for {user_id}")
    print(f"DEBUG get_dashboard_data: profiles available = {[p['id'] for p in profiles]}")
    profile = next((p for p in profiles if p["id"] == user_id), None)
    if not profile:
        print("DEBUG get_dashboard_data: profile not found!")
        return {}

    user_hss = sorted(
        [c for c in hss_history if c["user_id"] == user_id],
        key=lambda x: x["computed_at"],
        reverse=True,
    )
    latest_hss = (
        user_hss[0]
        if user_hss
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
    dietary_entry = next((d for d in baseline_onboarding if d["user_id"] == user_id), None)
    dietary_practice = (
        dietary_entry.get("dietary_practice", "") if dietary_entry else ""
    )

    # ── Recommendations: filter by HSS tier AND dietary preference ─────────────
    tier = latest_hss.get("tier", "Stable")
    reco_recipes = [
        r
        for r in recipes
        if (r.get("hss_tier") == tier or r.get("hss_tier") == "Stable")
        and _recipe_matches_diet(r, dietary_practice)
    ]
    reco_exercises = [
        e
        for e in exercise_routines
        if e.get("hss_tier") == tier or e.get("hss_tier") == "Stable"
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
                "hss_tier": r.get("hss_tier", "Stable"),
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
    trend = _get_trend_direction(user_hss)

    # ── Generate dynamic smart insight ─────────────────────────────────────────
    insight = _generate_insight(user_hss, latest_log)

    # ── Today's activity summary ───────────────────────────────────────────────
    today_activity = _get_today_activity(user_id)

    # ── Nutrition budget ──────────────────────────────────────────────────────────
    threshold = next((t for t in user_thresholds if t["user_id"] == user_id), None)
    sodium_limit = threshold.get("sodium_limit_mg", None) if threshold else None
    calorie_limit = threshold.get("daily_calories", None) if threshold else None

    # ── Unread notifications ───────────────────────────────────────────────────
    from app.mock_db import notifications
    unread_count = sum(1 for n in notifications if n["user_id"] == user_id and not n.get("read", True))

    return {
        "user": {
            "first_name": profile.get("first_name"),
            "last_name": profile.get("last_name"),
            "avatar_url": profile.get("avatar_url"),
        },
        "hss_score": latest_hss.get("score", 0),
        "hss_tier": latest_hss.get("tier", "Unknown"),
        "last_sync": latest_hss.get("computed_at"),
        "unread_notifications_count": unread_count,
        "latest_vitals": {
            "bpm": latest_log.get("heart_rate_bpm") if latest_log and latest_log.get("heart_rate_bpm") else "--",
            "bp": (
                f"{latest_log.get('systolic_bp')}/{latest_log.get('diastolic_bp')}"
                if latest_log and latest_log.get('systolic_bp') and latest_log.get('diastolic_bp')
                else "--/--"
            ),
            "trend": trend,
            "logged_at": latest_log.get("logged_at") if latest_log else None,
        },
        "latest_alert": latest_alert,
        "recommendations": recommendations,
        "insight": insight,
        "today_activity": today_activity,
        "nutrition_budget": {
            "sodium": {
                "consumed_mg": today_activity["total_sodium_mg"],
                "limit_mg": sodium_limit,
            },
            "calories": {
                "consumed": today_activity["total_calories"],
                "limit": calorie_limit,
            },
        },
    }


def get_7_day_wrap_up_data(user_id: str) -> Dict[str, Any]:
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # Filter logs for CURRENT week (days 1-7)
    user_meals_current = [m for m in meal_logs if m["user_id"] == user_id and seven_days_ago <= _safe_datetime(m["logged_at"]) <= now and m.get("deleted_at") is None]
    user_exercises_current = [e for e in exercise_logs if e["user_id"] == user_id and seven_days_ago <= _safe_datetime(e["logged_at"]) <= now and e.get("deleted_at") is None and e.get("status", "completed") != "abandoned"]
    user_health_current = [l for l in daily_health_logs if l["user_id"] == user_id and seven_days_ago <= _safe_datetime(l["logged_at"]) <= now and l.get("deleted_at") is None]
    user_sleep_current = [s for s in sleep_logs if s["user_id"] == user_id and seven_days_ago <= _safe_datetime(s["logged_at"]) <= now and s.get("deleted_at") is None]

    # Filter logs for PREVIOUS week (days 8-14)
    user_meals_prev = [m for m in meal_logs if m["user_id"] == user_id and fourteen_days_ago <= _safe_datetime(m["logged_at"]) < seven_days_ago and m.get("deleted_at") is None]
    user_exercises_prev = [e for e in exercise_logs if e["user_id"] == user_id and fourteen_days_ago <= _safe_datetime(e["logged_at"]) < seven_days_ago and e.get("deleted_at") is None and e.get("status", "completed") != "abandoned"]

    # Current Totals
    total_sodium = sum(m.get("sodium_mg", 0) for m in user_meals_current)
    total_sat_fat = sum(m.get("saturated_fat_g", 0) for m in user_meals_current)
    total_fiber = sum(m.get("fiber_g", 0) for m in user_meals_current)
    total_active = sum(e.get("duration_minutes", 0) for e in user_exercises_current)

    # Previous Totals
    prev_sodium = sum(m.get("sodium_mg", 0) for m in user_meals_prev)
    prev_active = sum(e.get("duration_minutes", 0) for e in user_exercises_prev)

    # Missed days (health logs)
    logged_dates = {_safe_date(l["logged_at"]) for l in user_health_current}
    logs_missed = max(0, 7 - len(logged_dates))

    # Symptoms (Current week, no ghost symptoms)
    symptoms_dict = {}
    for log in user_health_current:
        for symp in log.get("symptoms", []):
            if symp != "None (Feeling fine)":
                symptoms_dict[symp] = symptoms_dict.get(symp, 0) + 1
    symptoms_list = [{"name": k, "count": v} for k, v in symptoms_dict.items() if v > 0]
    symptoms_list.sort(key=lambda x: x["count"], reverse=True)

    # Days array for chart (last 7 days HSS)
    days_arr = []
    user_hss = sorted([c for c in hss_history if c["user_id"] == user_id], key=lambda x: _safe_datetime(x["computed_at"]))
    
    avg_hss = 0
    hss_count = 0
    
    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        day_str = target_date.strftime("%a")[0]  # 'M', 'T', 'W', etc.

        day_hss = [c["score"] for c in user_hss if _safe_date(c["computed_at"]) <= target_date]
        score = day_hss[-1] if day_hss else 0
        days_arr.append({"day": day_str, "value": score})
        if score > 0:
            avg_hss += score
            hss_count += 1

    display_hss = round(avg_hss / hss_count) if hss_count > 0 else 0

    # Calculate previous 7 days HSS for trend
    prev_avg_hss = 0
    prev_hss_count = 0
    for i in range(13, 6, -1):
        target_date = (now - timedelta(days=i)).date()
        day_hss = [c["score"] for c in user_hss if _safe_date(c["computed_at"]) <= target_date]
        score = day_hss[-1] if day_hss else 0
        if score > 0:
            prev_avg_hss += score
            prev_hss_count += 1
    prev_display_hss = round(prev_avg_hss / prev_hss_count) if prev_hss_count > 0 else 0

    # Determine positive/negative
    is_positive = display_hss >= 60 or display_hss == 0
    banner_title = "Great progress!" if is_positive else "Action needed"
    banner_text = (
        "Your cardiovascular stability has been consistently good over the last 7 days."
        if is_positive
        else "Consider reviewing your recent meals and activity levels."
    )

    # Activity Log
    activity_log = {}
    for i in range(7):
        d_str = (now - timedelta(days=i)).date().isoformat()
        activity_log[d_str] = {"meals": [], "exercises": []}
    
    for m in user_meals_current:
        d_str = _safe_date(m["logged_at"]).isoformat()
        if d_str in activity_log:
            activity_log[d_str]["meals"].append(m.get("meal_name", "Meal"))
    
    for e in user_exercises_current:
        d_str = _safe_date(e["logged_at"]).isoformat()
        if d_str in activity_log:
            activity_log[d_str]["exercises"].append(e.get("routine_name", "Exercise"))

    activity_log_list = []
    for d_str, data in sorted(activity_log.items(), reverse=True):
        if data["meals"] or data["exercises"]:
            activity_log_list.append({"date": d_str, "meals": data["meals"], "exercises": data["exercises"]})

    # Streak calculation
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
            continue
        else:
            break

    # Trends calculation
    trends = {
        "hss_score": (display_hss - prev_display_hss) if prev_hss_count > 0 else None,
        "sodium": (total_sodium - prev_sodium) if user_meals_prev else None,
        "active": (total_active - prev_active) if user_exercises_prev else None,
    }

    # Vitals Aggregation
    sys_sum, dia_sum, hr_sum, vitals_count = 0, 0, 0, 0
    for log in user_health_current:
        s = log.get("systolic_bp")
        d = log.get("diastolic_bp")
        h = log.get("heart_rate_bpm")
        if s and d and h:
            sys_sum += s
            dia_sum += d
            hr_sum += h
            vitals_count += 1
    
    avg_vitals = None
    if vitals_count > 0:
        avg_vitals = {
            "systolic": round(sys_sum / vitals_count),
            "diastolic": round(dia_sum / vitals_count),
            "heart_rate": round(hr_sum / vitals_count),
            "readings": vitals_count
        }

    # Sleep Aggregation
    sleep_sum, sleep_count = 0, 0
    for s in user_sleep_current:
        dur = s.get("duration_hours")
        if dur is not None and dur > 0:
            sleep_sum += dur
            sleep_count += 1

    avg_sleep = None
    if sleep_count > 0:
        avg_sleep = {
            "duration_hours": round(sleep_sum / sleep_count, 1),
            "days_logged": sleep_count
        }

    return {
        "hss_score": display_hss,
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
        "trends": trends,
        "avg_vitals": avg_vitals,
        "avg_sleep": avg_sleep
    }
