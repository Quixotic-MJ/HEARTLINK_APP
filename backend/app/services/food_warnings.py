"""Allergy and diet warnings on the recipes a patient browses (Explore, meal search, saved recipes, a recipe's page).

The dashboard's picks leave out recipes that clash with the patient's allergies or diet. Everywhere else the patient
can still see every recipe, so each one carries a `warnings` list saying what clashes, and the app shows it.
"""
from typing import Any, Dict, List, Optional, Tuple

from app.db.repositories import get_baseline_repo
from app.services.dashboard import recipe_warnings
from app.utils.security import verify_token


def food_profile(user_id: str) -> Tuple[str, List[str]]:
    """The patient's diet and allergies from their setup answers; nothing when they're missing."""
    try:
        baseline = get_baseline_repo().get_baseline(user_id) or {}
    except Exception:
        return "", []
    return baseline.get("dietary_practice") or "", baseline.get("allergies") or []


def with_warnings(recipes: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
    """Each recipe with its `warnings` for this patient (an empty list when it suits them)."""
    diet, allergies = food_profile(user_id)
    return [{**r, "warnings": recipe_warnings(r, diet, allergies)} for r in recipes]


def patient_id(token: Optional[str]) -> Optional[str]:
    """The signed-in patient's id, or None for staff, a bad token or no token (they get no warnings)."""
    if not token:
        return None
    try:
        payload = verify_token(token)
    except Exception:
        return None
    return payload.get("user_id") if payload.get("role") == "patient" else None
