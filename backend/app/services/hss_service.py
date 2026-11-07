"""Rules shared across the score: the level names and the app's emergency thresholds."""


def determine_tier(hss: int) -> str:
    """Returns the qualitative tier for a given HSS (1-100)."""
    if hss >= 80:
        return "Stable"
    elif hss >= 60:
        return "Moderate"
    elif hss >= 50:
        return "Elevated Risk"
    else:
        return "Critical"


def is_emergency_reading(systolic: float, diastolic: float) -> bool:
    """The app's emergency thresholds (log-symptoms.tsx, companionService.ts), unchanged."""
    return systolic >= 180 or diastolic >= 120 or systolic < 90 or diastolic < 60


def _sodium_limit(user_id: str) -> float:
    """The patient's daily sodium limit (their saved one, else the guideline for them); 1,500 mg if unknown."""
    try:
        from app.db.repositories import get_baseline_repo
        from app.services.nutrition_targets import targets_for_user
        targets = targets_for_user(user_id, get_baseline_repo().get_thresholds(user_id)) or {}
        value = (targets.get("sodium_mg") or {}).get("value")
        return float(value) if value else 1500.0
    except Exception:
        return 1500.0
