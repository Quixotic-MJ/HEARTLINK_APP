from fastapi import APIRouter, Request, HTTPException, Body, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Literal, Optional
from app.services.recipes import (
    RecipeReviewConflict,
    get_recipes, 
    get_recipe, 
    save_recipe_for_user, 
    unsave_recipe_for_user,
    get_saved_recipes,
    create_recipe,
    update_recipe,
    delete_recipe,
    is_visible_to_patients,
    review_recipe,
)
from app.utils.security import (
    expert_id_if,
    get_current_user,
    get_optional_token,
    has_active_permission,
    require_permission,
    verify_token,
)
from app.utils.activity_helper import record_admin_activity
from app.services.admin_notifications import notify_waiting_content
from app.services.food_warnings import patient_id, with_warnings

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])

security = HTTPBearer(auto_error=False)


class RecipeReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    decision: Literal["approve", "changes_requested"]
    expected_updated_at: str = Field(alias="expectedUpdatedAt", min_length=1)
    note: Optional[str] = Field(default=None, max_length=500)


def _can_read_unpublished(token: Optional[str]) -> bool:
    if not token:
        return False
    try:
        return has_active_permission(verify_token(token), "recipes:review")
    except Exception:
        return False

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
def read_recipes(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    recipes = get_recipes()
    token = get_optional_token(request, credentials)
    if _can_read_unpublished(token):
        return recipes
    visible = [r for r in recipes if is_visible_to_patients(r)]
    # A signed-in patient sees every recipe, each with what clashes with their allergies or diet
    pid = patient_id(token)
    return with_warnings(visible, pid) if pid else visible

@router.get("/saved/{user_id}", response_model=List[Dict[str, Any]])
def read_saved_recipes(user_id: str, current_user: dict = Depends(get_current_user)):
    from app.utils.security import verify_user_access
    verify_user_access(current_user, user_id)
    saved = get_saved_recipes(user_id)
    return with_warnings(saved, user_id) if current_user.get("role") == "patient" else saved

@router.get("/{recipe_id}", response_model=Dict[str, Any])
def read_recipe(recipe_id: str, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    token = get_optional_token(request, credentials)
    if not _can_read_unpublished(token) and not is_visible_to_patients(recipe):
        raise HTTPException(status_code=404, detail="Recipe not found")

    pid = patient_id(token)
    return with_warnings([recipe], pid)[0] if pid else recipe

@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
def add_recipe(data: Dict[str, Any] = Body(...), current_user: dict = Depends(require_permission("recipes:author"))):
    admin_id = current_user.get("user_id") if current_user else None
    try:
        new_recipe = create_recipe(data, created_by=admin_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not new_recipe or not new_recipe.get("id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create recipe. Please check all nutritional and general fields."
        )
    record_admin_activity(
        admin_user_id=admin_id or "admin",
        action="created",
        target_type="recipe",
        target_id=new_recipe.get("id"),
        target_name=new_recipe.get("name")
    )
    # HL-082: tell the Dietitians when it now waits for their approval
    notify_waiting_content("recipe", new_recipe, expert_id_if(current_user, "Dietitian"), admin_id)
    return new_recipe

@router.put("/{recipe_id}", response_model=Dict[str, Any])
def edit_recipe(recipe_id: str, data: Dict[str, Any] = Body(...), current_user: dict = Depends(require_permission("recipes:author"))):
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    old_status = recipe.get("status")
    expected_updated_at = data.get("expectedUpdatedAt")
    if not isinstance(expected_updated_at, str) or not expected_updated_at.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expectedUpdatedAt is required to save this recipe revision.",
        )
    author_data = {key: value for key, value in data.items() if key != "expectedUpdatedAt"}
    try:
        updated_recipe = update_recipe(
            recipe_id,
            author_data,
            expected_updated_at=expected_updated_at,
        )
    except RecipeReviewConflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recipe changed after you opened it. Refresh before saving.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not updated_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    new_status = updated_recipe.get("status")
    action = "updated"
    if old_status != new_status:
        if new_status == "published":
            action = "published"
        elif new_status == "archived":
            action = "archived"
        elif new_status == "draft" and old_status == "archived":
            action = "restored"

    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action=action,
        target_type="recipe",
        target_id=updated_recipe.get("id"),
        target_name=updated_recipe.get("name")
    )
    notify_waiting_content("recipe", updated_recipe, expert_id_if(current_user, "Dietitian"), admin_id)
    return updated_recipe

@router.delete("/{recipe_id}")
def remove_recipe(recipe_id: str, current_user: dict = Depends(require_permission("recipes:author"))):
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    success = delete_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found")
    admin_id = current_user.get("user_id") if current_user else "admin"
    record_admin_activity(
        admin_user_id=admin_id,
        action="deleted",
        target_type="recipe",
        target_id=recipe_id,
        target_name=recipe.get("name")
    )
    return {"success": True, "message": "Recipe deleted successfully"}


@router.post("/{recipe_id}/review", response_model=Dict[str, Any])
def review_recipe_version(
    recipe_id: str,
    data: RecipeReviewRequest,
    current_user: dict = Depends(require_permission("recipes:review")),
):
    dietitian_id = expert_id_if(current_user, "Dietitian")
    if not dietitian_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a Dietitian may review recipes.")
    try:
        reviewed = review_recipe(
            recipe_id,
            decision=data.decision,
            expected_updated_at=data.expected_updated_at,
            dietitian_id=dietitian_id,
            note=data.note,
        )
    except RecipeReviewConflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recipe changed after you opened it. Refresh before reviewing.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not reviewed:
        raise HTTPException(status_code=404, detail="Recipe not found")
    record_admin_activity(
        admin_user_id=dietitian_id,
        action="approved" if data.decision == "approve" else "changes_requested",
        target_type="recipe",
        target_id=reviewed.get("id"),
        target_name=reviewed.get("name"),
    )
    return reviewed

@router.post("/{recipe_id}/save/{user_id}")
def save_recipe(recipe_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    if not caller_id or caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only save recipes for your own account.",
        )
    save_recipe_for_user(user_id, recipe_id)
    return {"success": True, "message": "Recipe saved"}

@router.delete("/{recipe_id}/save/{user_id}")
def unsave_recipe(recipe_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("user_id")
    if not caller_id or caller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only remove saved recipes for your own account.",
        )
    unsave_recipe_for_user(user_id, recipe_id)
    return {"success": True, "message": "Recipe removed from saved"}
