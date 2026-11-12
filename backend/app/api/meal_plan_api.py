"""HL-155: the weekly meal plan and shopping list (app/services/meal_plan.py). Premium; the caller comes from the sign-in token."""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.services import meal_plan
from app.services.premium import require_premium

router = APIRouter(prefix="/api/meal-plan", tags=["Meal plan"])


@router.get("")
def read_meal_plan(
    week: Optional[str] = Query(None, description="Any date in the week, e.g. 2026-11-16 (default: this week)"),
    shuffle: int = Query(0, description="0 for the first plan; 'Make a new plan' asks for the next number"),
    current_user: dict = Depends(require_premium),
):
    return meal_plan.plan_for(current_user.get("user_id"), week, shuffle)
