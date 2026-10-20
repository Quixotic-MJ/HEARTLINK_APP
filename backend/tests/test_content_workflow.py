import copy

import pytest
from fastapi import HTTPException

from app.services import content_workflow


class FakeContentRepository:
    def __init__(self, recipe):
        self.recipe = recipe

    def get_recipe(self, content_id):
        return self.recipe if str(self.recipe["id"]) == str(content_id) else None

    def update_recipe(self, content_id, patch):
        assert str(content_id) == str(self.recipe["id"])
        self.recipe.update(patch)
        return self.recipe

    def list_recipes(self):
        return [self.recipe]


class FakeWorkflowRepository:
    def __init__(self):
        self.reviews = []
        self.versions = []

    def list_reviews(self, content_type=None, content_id=None):
        return [
            review for review in self.reviews
            if (not content_type or review["content_type"] == content_type)
            and (not content_id or str(review["content_id"]) == str(content_id))
        ]

    def create_review(self, data):
        record = {"id": f"review-{len(self.reviews) + 1}", "reviewed_at": "2026-10-19T00:00:00Z", **data}
        self.reviews.append(record)
        return record

    def list_versions(self, content_type, content_id):
        return self.versions


class FakeProfileRepository:
    def __init__(self, specialization):
        self.specialization = specialization

    def get_by_id(self, user_id):
        return {"id": user_id, "role": "medical_expert", "expert_type": self.specialization}


@pytest.fixture
def complete_recipe():
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Test recipe",
        "category": "Lunch",
        "yield_description": "Makes 2 bowls",
        "servings": 2,
        "serving_description": "1 bowl (300 g)",
        "prep_time_minutes": 20,
        "ingredients": [{
            "name": "Mongo",
            "household_amount": "1",
            "household_unit": "cup",
            "metric_amount": 200,
            "metric_unit": "g",
        }],
        "steps": ["Cook until tender."],
        "nutrient_source": "DOST-FNRI Philippine Food Composition Tables",
        "nutrient_source_record_id": "FNRI-TEST-1",
        "nutrition_totals": {"calories": 400},
        "intended_audiences": ["general_wellness", "hypertension_support"],
        "allergen_notes": "None known",
        "contraindication_notes": "None known",
        "evidence_sources": [{"title": "FNRI", "url": "https://example.test/fnri"}],
        "content_version": 1,
        "requires_cardiologist_review": False,
        "expert_validated": False,
        "status": "draft",
    }


def install_fakes(monkeypatch, recipe, specialization="Dietitian"):
    content_repo = FakeContentRepository(copy.deepcopy(recipe))
    workflow_repo = FakeWorkflowRepository()
    monkeypatch.setattr(content_workflow, "get_content_repo", lambda: content_repo)
    monkeypatch.setattr(content_workflow, "get_content_workflow_repo", lambda: workflow_repo)
    monkeypatch.setattr(content_workflow, "get_profile_repo", lambda: FakeProfileRepository(specialization))
    return content_repo, workflow_repo


def test_submit_review_approve_and_publish_exact_version(monkeypatch, complete_recipe):
    content_repo, workflow_repo = install_fakes(monkeypatch, complete_recipe)

    submitted = content_workflow.submit_for_review(
        "recipe", complete_recipe["id"], {"user_id": "admin-1", "role": "admin"}
    )
    assert submitted["item"]["status"] == "in_review"

    reviewed = content_workflow.add_review(
        "recipe",
        complete_recipe["id"],
        {
            "decision": "approved",
            "comments": "Serving and source records checked.",
            "evidence_checked": ["https://example.test/fnri"],
        },
        {"user_id": "dietitian-1", "role": "medical_expert"},
    )
    assert reviewed["item"]["status"] == "approved"
    assert reviewed["approval"]["approved"] is True
    assert workflow_repo.reviews[0]["content_version"] == 1

    published = content_workflow.publish(
        "recipe", complete_recipe["id"], {"user_id": "super-1", "role": "super_admin"}
    )
    assert published["item"]["status"] == "published"
    assert content_repo.recipe["expert_validated"] is True


def test_wrong_specialization_cannot_review_recipe(monkeypatch, complete_recipe):
    complete_recipe["status"] = "in_review"
    install_fakes(monkeypatch, complete_recipe, specialization="Physical Therapist")

    with pytest.raises(HTTPException) as exc_info:
        content_workflow.add_review(
            "recipe",
            complete_recipe["id"],
            {
                "decision": "approved",
                "comments": "Attempted review.",
                "evidence_checked": ["source"],
            },
            {"user_id": "pt-1", "role": "medical_expert"},
        )
    assert exc_info.value.status_code == 403


def test_publish_is_blocked_without_current_version_approval(monkeypatch, complete_recipe):
    complete_recipe["status"] = "approved"
    install_fakes(monkeypatch, complete_recipe)

    with pytest.raises(HTTPException) as exc_info:
        content_workflow.publish(
            "recipe", complete_recipe["id"], {"user_id": "super-1", "role": "super_admin"}
        )
    assert exc_info.value.status_code == 409
