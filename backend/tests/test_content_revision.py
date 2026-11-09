"""HL-136: publishing keeps the expert's approval, content changes don't, and a stale page can't overwrite a newer save."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.recipes_api import recipes_api
from app.main import app
from app.services import exercises as exercise_service
from app.services import recipes as recipe_service
from app.services.content_revision import ContentChanged, check_revision
from app.utils import security

OPENED = "2026-11-09T01:00:00+00:00"
APPROVED = {"name": "Ginisang Monggo", "status": "draft", "expert_validated": True, "reviewed_by": "d1",
            "reviewed_at": OPENED, "updated_at": OPENED}


class Repo:
    def __init__(self):
        self.current = dict(APPROVED)
        self.updated = None

    def get_recipe(self, _id):
        return dict(self.current)

    get_routine = get_recipe

    def update_recipe(self, item_id, data):
        self.updated = data
        return {"id": item_id, **self.current, **data}

    update_routine = update_recipe


@pytest.fixture
def repo(monkeypatch):
    fake = Repo()
    monkeypatch.setattr(recipe_service, "get_content_repo", lambda: fake)
    monkeypatch.setattr(exercise_service, "get_content_repo", lambda: fake)
    return fake


def test_an_admin_publishing_an_approved_recipe_keeps_the_approval(repo):
    recipe_service.update_recipe("r1", {"status": "published"})
    assert repo.updated == {"status": "published"}


def test_an_admin_publishing_an_approved_exercise_keeps_the_approval(repo):
    exercise_service.update_routine("e1", {"status": "published"})
    assert repo.updated.get("status") == "published" and "expert_validated" not in repo.updated


def test_an_admin_changing_the_content_sends_it_back_for_approval(repo):
    recipe_service.update_recipe("r1", {"name": "Monggo with less salt", "status": "published"})
    assert repo.updated["expert_validated"] is False and repo.updated["reviewed_by"] is None


def test_an_admin_cant_approve_even_with_a_status_only_save(repo):
    repo.current["expert_validated"] = False
    recipe_service.update_recipe("r1", {"status": "published", "expertValidated": True})
    assert repo.updated == {"status": "published"}  # stays waiting: only a Dietitian approves


def test_a_dietitian_still_approves(repo):
    repo.current["expert_validated"] = False
    recipe_service.update_recipe("r1", {"expertValidated": True, "status": "published"}, dietitian_id="d1")
    assert repo.updated["expert_validated"] is True and repo.updated["reviewed_by"] == "d1"


@pytest.mark.parametrize("save", [recipe_service.update_recipe, exercise_service.update_routine])
def test_a_page_opened_before_someone_elses_save_is_refused(repo, save):
    with pytest.raises(ContentChanged):
        save("x1", {"status": "archived", "expectedUpdatedAt": "2026-11-08T23:00:00+00:00"})
    assert repo.updated is None
    save("x1", {"status": "archived", "expectedUpdatedAt": OPENED})  # the same version: saved
    assert repo.updated["status"] == "archived"


def test_the_check_is_skipped_when_the_page_doesnt_send_it():
    check_revision({"updated_at": OPENED}, {"status": "draft"})
    check_revision(None, {"expectedUpdatedAt": OPENED})
    check_revision({"updated_at": "2026-11-09T01:00:00Z"}, {"expectedUpdatedAt": OPENED})  # same time, other format


def test_the_route_answers_409_with_a_clear_message(repo, monkeypatch):
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    admin = {"id": "a1", "role": "admin", "account_status": "active"}
    monkeypatch.setattr(security, "get_profile_repo", lambda: SimpleNamespace(get_by_id=lambda _uid: dict(admin)))
    monkeypatch.setattr(recipes_api, "get_recipe", lambda _id: dict(APPROVED, id="r1"))
    token = security.create_access_token({"user_id": "a1", "role": "admin"})
    try:
        response = TestClient(app).put("/api/recipes/r1", headers={"Authorization": f"Bearer {token}"},
                                       json={"status": "archived", "expectedUpdatedAt": "2026-11-08T23:00:00+00:00"})
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)
    assert response.status_code == 409 and "Refresh first" in response.json()["detail"]
