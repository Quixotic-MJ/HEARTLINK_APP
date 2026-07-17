from typing import Dict, Any
from app.mock_db import profiles, css_history, daily_health_logs, alerts, recipes, exercise_routines

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

    # Recommendations: mix of recipes and exercises matching the CSS tier if possible
    tier = latest_css.get("tier", "Stable")
    reco_recipes = [r for r in recipes if r.get("css_tier") == tier or r.get("css_tier") == "Stable"]
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
            "subColor": "#86efac"
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
            "subColor": "#94a3b8"
        })

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
            "trend": "+0"
        },
        "latest_alert": latest_alert,
        "recommendations": recommendations
    }
