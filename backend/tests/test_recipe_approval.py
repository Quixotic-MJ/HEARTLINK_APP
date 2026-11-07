"""Recipe authorship, exact-review, publication, and withdrawal behavior."""
from copy import deepcopy

import pytest

from app.services import recipes as recipe_service
from app.db.repositories.content import SupabaseContentRepository
from app.services.recipes import (
    RecipeReviewConflict,
    create_recipe,
    is_visible_to_patients,
    review_recipe,
    update_recipe,
)


OPENED_AT = "2026-11-07T01:00:00+00:00"
NEXT_AT = "2026-11-07T01:01:00+00:00"


def complete_recipe(**overrides):
    return {
        "id": "r1",
        "name": "Chicken tinola",
        "category": "Dinner",
        "category_other": None,
        "ingredients": [{"name": "Chicken", "amount": 500, "unit": "g"}],
        "steps": ["Simmer until cooked."],
        "servings": 4,
        "prep_time_minutes": 40,
        "sodium_mg": 320,
        "calories": 280,
        "status": "draft",
        "expert_validated": False,
        "reviewed_by": None,
        "reviewed_at": None,
        "review_note": None,
        "updated_at": OPENED_AT,
        **overrides,
    }


class FakeContentRepo:
    def __init__(self, recipe=None):
        self.rows = {"r1": complete_recipe() if recipe is None else deepcopy(recipe)}
        self.created = None
        self.updated = None
        self.expected_updated_at = None
        self.race_before_update = False
        self.fail_update = False

    def get_recipe(self, recipe_id):
        row = self.rows.get(recipe_id)
        return deepcopy(row) if row else None

    def create_recipe(self, data):
        self.created = deepcopy(data)
        row = {"id": "created", "updated_at": OPENED_AT, **deepcopy(data)}
        self.rows[row["id"]] = row
        return deepcopy(row)

    def update_recipe(self, recipe_id, data, expected_updated_at=None):
        self.updated = deepcopy(data)
        self.expected_updated_at = expected_updated_at
        row = self.rows.get(recipe_id)
        if not row:
            return None
        if self.fail_update:
            return None
        if self.race_before_update:
            row["updated_at"] = "2026-11-07T01:00:30+00:00"
        if expected_updated_at and row.get("updated_at") != expected_updated_at:
            return None
        row.update(deepcopy(data))
        row["updated_at"] = NEXT_AT
        return deepcopy(row)


@pytest.fixture
def repo(monkeypatch):
    fake = FakeContentRepo()
    monkeypatch.setattr(recipe_service, "get_content_repo", lambda: fake)
    return fake


def test_patients_only_see_published_current_dietitian_reviews():
    approved = complete_recipe(
        status="published",
        expert_validated=True,
        reviewed_by="diet-1",
        reviewed_at=OPENED_AT,
    )
    assert is_visible_to_patients(approved)
    assert not is_visible_to_patients({**approved, "status": "draft"})
    assert not is_visible_to_patients({**approved, "expert_validated": False})
    assert not is_visible_to_patients({**approved, "reviewed_by": None})
    assert not is_visible_to_patients({**approved, "reviewed_at": None})


def test_admin_creation_is_always_an_unapproved_draft(repo):
    created = create_recipe({"name": "Tinola", "status": "published"}, created_by="admin-1")
    assert created["status"] == "draft"
    assert created["expert_validated"] is False
    assert created["reviewed_by"] is None and created["reviewed_at"] is None


@pytest.mark.parametrize("field", ["expertValidated", "expert_validated", "reviewNote", "reviewed_by"])
def test_author_routes_reject_review_fields(repo, field):
    with pytest.raises(ValueError, match="review action"):
        create_recipe({"name": "Tinola", field: True})
    with pytest.raises(ValueError, match="review action"):
        update_recipe("r1", {field: True})


def test_dietitian_approval_records_the_exact_opened_version_and_stays_draft(repo):
    reviewed = review_recipe(
        "r1",
        decision="approve",
        expected_updated_at=OPENED_AT,
        dietitian_id="diet-1",
    )
    assert reviewed["status"] == "draft"
    assert reviewed["expert_validated"] is True
    assert reviewed["reviewed_by"] == "diet-1" and reviewed["reviewed_at"]
    assert reviewed["review_note"] is None
    assert repo.expected_updated_at == OPENED_AT
    assert not is_visible_to_patients(reviewed)


def test_dietitian_can_request_changes_with_an_actionable_note(repo):
    reviewed = review_recipe(
        "r1",
        decision="changes_requested",
        expected_updated_at=OPENED_AT,
        dietitian_id="diet-1",
        note="  Add the missing condiment amount.  ",
    )
    assert reviewed["expert_validated"] is False
    assert reviewed["reviewed_by"] is None and reviewed["reviewed_at"] is None
    assert reviewed["review_note"] == "Add the missing condiment amount."


def test_changes_requested_requires_a_note(repo):
    with pytest.raises(ValueError, match="note is required"):
        review_recipe(
            "r1",
            decision="changes_requested",
            expected_updated_at=OPENED_AT,
            dietitian_id="diet-1",
            note="  ",
        )


@pytest.mark.parametrize(
    "missing",
    [
        {"ingredients": []},
        {"steps": []},
        {"sodium_mg": None},
        {"calories": None},
    ],
)
def test_incomplete_stored_recipe_cannot_be_approved(monkeypatch, missing):
    fake = FakeContentRepo(complete_recipe(**missing))
    monkeypatch.setattr(recipe_service, "get_content_repo", lambda: fake)
    with pytest.raises(ValueError, match="cannot be approved"):
        review_recipe(
            "r1",
            decision="approve",
            expected_updated_at=OPENED_AT,
            dietitian_id="diet-1",
        )
    assert fake.updated is None


def test_review_rejects_a_version_that_changed_after_open(repo):
    with pytest.raises(RecipeReviewConflict):
        review_recipe(
            "r1",
            decision="approve",
            expected_updated_at="2026-11-07T00:59:00+00:00",
            dietitian_id="diet-1",
        )
    assert repo.updated is None


def test_review_compare_and_set_closes_the_race_between_read_and_write(repo):
    repo.race_before_update = True
    with pytest.raises(RecipeReviewConflict):
        review_recipe(
            "r1",
            decision="approve",
            expected_updated_at=OPENED_AT,
            dietitian_id="diet-1",
        )


def test_author_update_rejects_a_version_that_changed_after_open(repo):
    with pytest.raises(RecipeReviewConflict):
        update_recipe(
            "r1",
            {"name": "Stale revision"},
            expected_updated_at="2026-11-07T00:59:00+00:00",
        )
    assert repo.updated is None


def test_author_compare_and_set_closes_the_race_between_read_and_write(repo):
    repo.race_before_update = True
    with pytest.raises(RecipeReviewConflict):
        update_recipe(
            "r1",
            {"name": "Racing revision"},
            expected_updated_at=OPENED_AT,
        )


def test_successful_published_content_edit_withdraws_and_invalidates_atomically(monkeypatch):
    fake = FakeContentRepo(
        complete_recipe(
            status="published",
            expert_validated=True,
            reviewed_by="diet-1",
            reviewed_at=OPENED_AT,
        )
    )
    monkeypatch.setattr(recipe_service, "get_content_repo", lambda: fake)
    updated = update_recipe("r1", {"name": "Revised chicken tinola", "status": "published"})
    assert updated["status"] == "draft"
    assert updated["expert_validated"] is False
    assert updated["reviewed_by"] is None and updated["reviewed_at"] is None
    assert fake.updated["status"] == "draft"
    assert fake.updated["expert_validated"] is False


def test_failed_content_write_leaves_the_published_row_unchanged(monkeypatch):
    original = complete_recipe(
        status="published",
        expert_validated=True,
        reviewed_by="diet-1",
        reviewed_at=OPENED_AT,
    )
    fake = FakeContentRepo(original)
    fake.fail_update = True
    monkeypatch.setattr(recipe_service, "get_content_repo", lambda: fake)
    assert update_recipe("r1", {"name": "Unsaved revision"}) is None
    assert fake.rows["r1"] == original


def test_admin_publishes_an_approved_unchanged_draft(repo):
    repo.rows["r1"].update(
        expert_validated=True,
        reviewed_by="diet-1",
        reviewed_at=OPENED_AT,
    )
    published = update_recipe("r1", {"status": "published"})
    assert published["status"] == "published"
    assert published["expert_validated"] is True
    assert is_visible_to_patients(published)


def test_admin_cannot_publish_an_unapproved_draft(repo):
    with pytest.raises(ValueError, match="Dietitian approval"):
        update_recipe("r1", {"status": "published"})
    assert repo.updated is None


def test_uuid_compare_and_set_miss_does_not_fall_through_to_a_legacy_row():
    class Query:
        def __init__(self, client):
            self.client = client
            self.filters = []

        def update(self, payload):
            self.client.queries.append(self)
            return self

        def eq(self, field, value):
            self.filters.append((field, value))
            return self

        def execute(self):
            return type("Response", (), {"data": []})()

    class Client:
        def __init__(self):
            self.queries = []

        def table(self, name):
            return Query(self)

    client = Client()
    repository = SupabaseContentRepository(client)
    recipe_id = "11111111-1111-1111-1111-111111111111"
    assert repository.update_recipe(recipe_id, {"status": "draft"}, OPENED_AT) is None
    assert len(client.queries) == 1
    assert ("id", recipe_id) in client.queries[0].filters
    assert ("updated_at", OPENED_AT) in client.queries[0].filters
