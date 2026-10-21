"""HL-037: patients only get Dietitian-approved recipes, and only a Dietitian approves."""
import pytest

from app.services import recipes as recipe_service
from app.services.recipes import create_recipe, is_visible_to_patients, update_recipe


class FakeContentRepo:
    def __init__(self):
        self.created = None
        self.updated = None

    def create_recipe(self, data):
        self.created = data
        return {"id": "r1", **data}

    def update_recipe(self, recipe_id, data):
        self.updated = data
        return {"id": recipe_id, **data}


@pytest.fixture
def repo(monkeypatch):
    fake = FakeContentRepo()
    monkeypatch.setattr(recipe_service, "get_content_repo", lambda: fake)
    return fake


def test_patients_only_see_published_dietitian_approved_recipes():
    assert is_visible_to_patients({"status": "published", "expert_validated": True})
    assert not is_visible_to_patients({"status": "published", "expert_validated": False})
    assert not is_visible_to_patients({"status": "published"})
    assert not is_visible_to_patients({"status": "draft", "expert_validated": True})


def test_a_dietitian_approving_records_who_and_when_and_clears_the_note(repo):
    update_recipe("r1", {"expertValidated": True, "reviewNote": "old note"}, dietitian_id="diet-1")
    assert repo.updated["expert_validated"] is True
    assert repo.updated["reviewed_by"] == "diet-1" and repo.updated["reviewed_at"]
    assert repo.updated["review_note"] is None


def test_a_dietitian_can_send_it_back_with_a_note(repo):
    update_recipe("r1", {"expertValidated": False, "reviewNote": "  Prep time is too short  "}, dietitian_id="diet-1")
    assert repo.updated["expert_validated"] is False
    assert repo.updated["reviewed_by"] is None and repo.updated["reviewed_at"] is None
    assert repo.updated["review_note"] == "Prep time is too short"


def test_only_a_dietitian_can_approve_and_other_saves_send_it_back(repo):
    create_recipe({"name": "Tinola", "expertValidated": True})
    assert repo.created["expert_validated"] is False and repo.created["reviewed_by"] is None

    # An admin fixing the recipe keeps the Dietitian's note but needs a fresh approval.
    update_recipe("r1", {"prepTimeMinutes": 40, "reviewNote": "admin can't change this"})
    assert repo.updated["expert_validated"] is False
    assert repo.updated["reviewed_by"] is None and repo.updated["reviewed_at"] is None
    assert "review_note" not in repo.updated
