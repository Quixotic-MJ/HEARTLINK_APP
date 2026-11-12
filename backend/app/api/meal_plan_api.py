"""HL-155: the weekly meal plan and shopping list (app/services/meal_plan.py). Premium; the caller comes from the sign-in token.
HL-159: the patient's own changes to single meals (a swap to another approved recipe, or "My own meal")."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.services import meal_plan
from app.services.premium import require_premium

router = APIRouter(prefix="/api/meal-plan", tags=["Meal plan"])


class OwnMeal(BaseModel):
    name: str = Field(..., max_length=200)
    sodium_mg: float
    calories: Optional[float] = None


class MealChange(BaseModel):
    date: str = Field(..., description="The day, e.g. 2026-11-17")
    meal: str
    recipe_id: Optional[str] = None
    own: Optional[OwnMeal] = None


@router.get("")
def read_meal_plan(
    week: Optional[str] = Query(None, description="Any date in the week, e.g. 2026-11-16 (default: this week)"),
    shuffle: int = Query(0, description="0 for the first plan; 'Make a new plan' asks for the next number"),
    current_user: dict = Depends(require_premium),
):
    return meal_plan.plan_for(current_user.get("user_id"), week, shuffle)


@router.get("/options")
def read_meal_options(
    date: str = Query(..., description="The day, e.g. 2026-11-17"),
    meal: str = Query(..., description="Breakfast, Lunch or Dinner"),
    shuffle: int = Query(0),
    current_user: dict = Depends(require_premium),
):
    """Approved recipes that suit the patient and fit that day's sodium, to swap in."""
    return meal_plan.options_for(current_user.get("user_id"), date, meal, shuffle)


@router.put("/changes", status_code=204)
def change_meal(body: MealChange, current_user: dict = Depends(require_premium)):
    meal_plan.change_meal(
        current_user.get("user_id"),
        body.date,
        body.meal,
        recipe_id=body.recipe_id,
        own=body.own.model_dump() if body.own else None,
    )


@router.delete("/changes", status_code=204)
def undo_changes(
    date: Optional[str] = Query(None, description="With meal: put that one meal back"),
    meal: Optional[str] = Query(None),
    week: Optional[str] = Query(None, description="Without date and meal: undo every change in that week"),
    current_user: dict = Depends(require_premium),
):
    if date or meal:
        meal_plan.put_back(current_user.get("user_id"), date or "", meal or "")
    else:
        meal_plan.undo_week(current_user.get("user_id"), week)
