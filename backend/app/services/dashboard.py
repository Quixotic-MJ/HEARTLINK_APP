import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
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

def _safe_date(val: Any) -> datetime.date:
    if isinstance(val, datetime):
        return val.date()
    elif isinstance(val, str):
        try:
            s = val.replace("Z", "+00:00")
            return datetime.fromisoformat(s).date()
        except Exception:
            return datetime.min.date()
    elif hasattr(val, "year") and hasattr(val, "month") and hasattr(val, "day"):
        return val
    return datetime.min.date()
    
def _safe_datetime(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val.replace(tzinfo=None) if val.tzinfo else val
    elif isinstance(val, str):
        try:
            s = val.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            return dt.replace(tzinfo=None) if dt.tzinfo else dt
        except Exception:
            return datetime.min
    return datetime.min

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


def _recipe_is_safe(recipe: dict, dietary_practice: str, allergies: List[str]) -> bool:
    """Return True if the recipe does NOT contain excluded ingredients or allergies."""
    excluded = DIETARY_EXCLUSIONS.get(dietary_practice, []).copy()
    
    if allergies:
        # Add allergies to the exclusion list, ignoring "None"
        excluded.extend([a.lower() for a in allergies if a.lower() != "none"])

    if not excluded:
        return True  # No restrictions
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


def _generate_insight(user_hss: list, latest_log: dict | None, first_name: str | None = None) -> dict:
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
            real_symptoms = [s for s in latest_log["symptoms"] if s != "None (Feeling fine)"]
            if real_symptoms:
                symptom_count = len(real_symptoms)
                body = f"You logged {symptom_count} symptom(s) recently. Consider reviewing your diet and consulting your care team."
            else:
                body = "Consider reviewing your recent meals and activity levels."
        else:
            body = "Consider reviewing your recent meals and activity levels."
        icon = "trending-down"
    else:
        if latest_score >= 80:
            title = "Your stability score is holding steady."
            body = "You're doing great! Keep maintaining your healthy routine."
            icon = "check-circle"
        elif latest_score < 50:
            title = "Your stability score remains critically low."
            body = "Please consult your care team and strictly monitor your vitals and diet."
            icon = "alert-circle"
        else:
            title = "Your stability score is holding steady."
            body = "Your score hasn't changed, but there's still room for improvement."
            icon = "minus"

    # Try to enhance the body with Groq AI if available
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key and first_name:
        try:
            import groq
            # Strict 1.5s timeout to ensure dashboard never hangs
            client = groq.Groq(api_key=groq_api_key, timeout=1.5)
            
            factors = user_hss[0].get("contributing_factors", {})
            context_str = ""
            if factors:
                points = []
                if factors.get("meal_points"): points.append(f"{factors.get('meal_points', 0):+} pts from meals")
                if factors.get("exercise_points"): points.append(f"{factors.get('exercise_points', 0):+} pts from exercise")
                if factors.get("sleep_points"): points.append(f"{factors.get('sleep_points', 0):+} pts from sleep")
                if factors.get("medication_points"): points.append(f"{factors.get('medication_points', 0):+} pts from medication adherence")
                if factors.get("blood_sugar_points"): points.append(f"{factors.get('blood_sugar_points', 0):+} pts from blood sugar levels")
                if factors.get("weight_gain_points"): points.append(f"{factors.get('weight_gain_points', 0):+} pts from rapid weight changes")
                if factors.get("symptom_points"): points.append(f"{factors.get('symptom_points', 0):+} pts from reported symptoms")
                if factors.get("staleness_penalty"): points.append(f"{factors.get('staleness_penalty', 0):+} pts penalty for missing data")
                if points:
                    context_str = "Today's score was affected by: " + ", ".join(points) + "."
            
            prompt = f"""
            You are HeartLink's empathetic AI health coach. 
            Write a warm, highly personalized, and encouraging 2-sentence insight for {first_name}.
            Do NOT give specific medical or dietary advice. Do not use generic phrases. Be conversational and human.
            
            Context about their Heart Stability Score today:
            - General trend: {body}
            - Itemized changes today: {context_str or "No major activities logged yet."}
            
            Write the message directly to {first_name}.
            """
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a warm, empathetic AI health coach. Output only the message, no quotation marks or preamble. Strictly 2 sentences maximum."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="openai/gpt-oss-20b",
                temperature=0.7,
                max_tokens=60,
            )
            
            ai_body = chat_completion.choices[0].message.content.strip().strip('"')
            if ai_body:
                body = ai_body
                title = "" # Remove legacy rigid title so the AI coach speaks naturally
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            # Silently fallback to the deterministic rule-based body if timeout or error
            pass

    return {"title": title, "body": body, "icon": icon}

def _calculate_streak_data(meal_logs, exercise_logs, daily_health_logs, sleep_logs) -> Dict[str, Any]:
    now = datetime.now()
    
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
    check_date = now.date()
    
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
    today = datetime.now().date()

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
    total_fiber = sum((m.get("fiber_g") or 0) for m in meals_today)
    
    total_exercise_min = sum((e.get("duration_minutes") or 0) for e in exercises_today)
    total_sleep_hours = sum((s.get("duration_hours") or 0) for s in sleeps_today)

    # Meds adherence today
    meds_taken = any(l.get("medication_taken") for l in vitals_today)

    # Context, Severe Symptoms, Weight Gain, Blood Sugar
    vitals_context = vitals_today[0].get("context") if vitals_today else None
    severe_symptom_count = sum(1 for l in vitals_today if any(s in l.get("symptoms", []) for s in ["Chest Discomfort / Tightness", "Shortness of Breath"]))
    rapid_weight_gain = False # Requires alert fetch, implemented in hss_service
    blood_sugar = vitals_today[0].get("blood_sugar") if vitals_today else None

    return {
        "vitals_logged": len(vitals_today) > 0,
        "meals_count": len(meals_today),
        "exercises_count": len(exercises_today),
        "sleep_logged": len(sleeps_today) > 0,
        "total_sodium_mg": total_sodium,
        "total_calories": total_calories,
        "total_saturated_fat_g": total_saturated_fat,
        "total_fiber_g": total_fiber,
        "total_exercise_minutes": total_exercise_min,
        "total_sleep_hours": total_sleep_hours,
        "medication_taken": meds_taken,
        "vitals_context": vitals_context,
        "severe_symptom_count": severe_symptom_count,
        "latest_blood_sugar": blood_sugar,
        "streak_data": _calculate_streak_data(meal_logs, exercise_logs, daily_health_logs, sleep_logs),
    }


def get_dashboard_data(user_id: str, recipe_limit: int = 2, exercise_limit: int = 2) -> Dict[str, Any]:
    profile_repo = get_profile_repo()
    profile = profile_repo.get_by_id(user_id)
    if not profile:
        return {}

    canonical_id = profile.get("id") or user_id

    hss_repo = get_hss_repo()
    user_hss = hss_repo.list_hss_history(canonical_id)
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
    from datetime import datetime
    now_utc = datetime.utcnow()
    for log in user_logs:
        log_time_str = log.get("logged_at")
        if not log_time_str:
            continue
        try:
            log_time = datetime.fromisoformat(log_time_str.replace("Z", "+00:00")).replace(tzinfo=None)
            if (now_utc - log_time).total_seconds() > 24 * 3600:
                break
            
            if log.get("context") == "symptom_lock_cleared":
                # User manually cleared the lock after their most recent severe symptom!
                break
            
            symptoms = log.get("symptoms", [])
            severity_map = log.get("severity_map", {})
            context_val = log.get("context")
            is_chest_pain = "Chest Discomfort / Tightness" in symptoms and severity_map.get("Chest Discomfort / Tightness", 1) >= 7
            is_sob_rest = "Shortness of Breath" in symptoms and context_val == "resting"
            
            if is_chest_pain or is_sob_rest:
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
    sodium_limit = threshold.get("sodium_limit_mg", None) if threshold else None
    calorie_limit = threshold.get("daily_calories", None) if threshold else None

    # ── Recommendations: filter by HSS tier AND dietary preference ─────────────
    content_repo = get_content_repo()
    recipes = content_repo.list_recipes()
    exercise_routines = content_repo.list_routines()

    tier = latest_hss.get("tier", "Stable")
    reco_recipes = [
        r
        for r in recipes
        if r.get("status") == "published"
        and (r.get("hss_tier") == tier or r.get("hss_tier") == "Stable")
        and r.get("id") not in today_recipe_ids
        and _recipe_is_safe(r, dietary_practice, allergies)
    ]

    # Dynamic budget prioritization (HL-ENG-21 / Pillar D):
    # If remaining sodium budget is < 500 mg, prioritize low-sodium expert-reviewed recipes
    effective_sodium_limit = sodium_limit if sodium_limit is not None else 2000
    remaining_sodium = effective_sodium_limit - today_activity["total_sodium_mg"]
    if remaining_sodium < 500:
        reco_recipes.sort(key=lambda r: (not bool(r.get("expert_validated", False)), r.get("sodium_mg") or 0))
    else:
        reco_recipes.sort(key=lambda r: not bool(r.get("expert_validated", False)))

    reco_exercises = [
        e
        for e in exercise_routines
        if (e.get("hss_tier") == tier or e.get("hss_tier") == "Stable")
        and e.get("status") == "published"
        and e.get("id") not in today_exercise_ids
    ]

    recommendations = []
    for r in reco_recipes[:recipe_limit]:
        is_expert = bool(r.get("expert_validated", False))
        recommendations.append(
            {
                "id": r["id"],
                "type": "recipe",
                "tag": "Expert Verified" if is_expert else "Heart-healthy",
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
                "tag": "Exercise",
                "title": e["name"],
                "subtitle": e.get("description", "")[:30] + "...",
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
    insight = _generate_insight(user_hss, latest_log, profile.get("first_name"))



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
        "streak": today_activity["streak_data"],
        "has_recent_severe_symptom": has_recent_severe_symptom,
    }


def get_7_day_wrap_up_data(user_id: str, local_date_str: str = None) -> Dict[str, Any]:
    profile = get_profile_repo().get_by_id(user_id)
    canonical_id = profile.get("id") if profile else user_id

    if local_date_str:
        try:
            now = datetime.strptime(local_date_str, "%Y-%m-%d")
        except ValueError:
            now = datetime.now()
    else:
        now = datetime.now()
        
    seven_days_ago = now - timedelta(days=6) # 7 days inclusive
    fourteen_days_ago = now - timedelta(days=13) # previous 7 days

    # Helper filters
    def in_current_week(date_str):
        if not date_str: return False
        return seven_days_ago.date() <= _safe_date(date_str) <= now.date()
        
    def in_prev_week(date_str):
        if not date_str: return False
        return fourteen_days_ago.date() <= _safe_date(date_str) < seven_days_ago.date()

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
    logged_symptoms_dates = {_safe_date(l["logged_at"]) for l in user_health_current if any(s != "None (Feeling fine)" for s in l.get("symptoms", []))}
    
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

    hss_current = get_avg_hss(seven_days_ago.date(), now.date())
    hss_prev = get_avg_hss(fourteen_days_ago.date(), seven_days_ago.date() - timedelta(days=1))

    # Daily Records & Consistency
    daily_records = []
    days_logged = 0
    
    streak_data = _calculate_streak_data(meal_logs, exercise_logs, daily_health_logs, sleep_logs)

    for i in range(7):
        target_date = seven_days_ago.date() + timedelta(days=i)
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
            "time": _safe_datetime(e["logged_at"]).strftime("%I:%M %p"),
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
            "time": _safe_datetime(m["logged_at"]).strftime("%I:%M %p"),
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
                "time": _safe_datetime(l["logged_at"]).strftime("%I:%M %p"),
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
                "time": _safe_datetime(s["logged_at"]).strftime("%I:%M %p"),
                "hours": s.get("duration_hours"),
                "quality": s.get("quality")
            })

    symptoms_records = []
    for l in sorted(user_health_current, key=lambda x: _safe_datetime(x["logged_at"])):
        symps = [s for s in l.get("symptoms", []) if s != "None (Feeling fine)"]
        if symps:
            for s in symps:
                symptoms_records.append({
                    "date": _safe_date(l["logged_at"]).strftime("%b %d"),
                    "time": _safe_datetime(l["logged_at"]).strftime("%I:%M %p"),
                    "name": s,
                    "severity": l.get("severity_map", {}).get(s, 0),
                    "context": l.get("context", "")
                })

    hss_records = []
    for i in range(7):
        target_date = seven_days_ago.date() + timedelta(days=i)
        day_scores = [c["score"] for c in user_hss if _safe_date(c["computed_at"]) <= target_date]
        if day_scores and day_scores[-1] > 0:
             hss_records.append({
                 "date": target_date.strftime("%b %d"),
                 "score": day_scores[-1]
             })

    # Group records by day for the daily timeline view
    daily_records_grouped = []
    for i in range(7):
        target_date = seven_days_ago.date() + timedelta(days=i)
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
            "end": now.strftime("%b %d"),
            "display": f"{seven_days_ago.strftime('%b %d')} – {now.strftime('%b %d')}"
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
