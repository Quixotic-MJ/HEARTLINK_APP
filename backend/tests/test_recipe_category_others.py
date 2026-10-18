"""HL-030: "Others" recipe category with a required typed name."""
import pytest

from app.services import recipes as recipe_service
from app.services.recipes import create_recipe, resolve_category, update_recipe


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


@pytest.mark.parametrize("category", ["Breakfast", "Lunch", "Dinner", "Snack"])
def test_standard_categories_carry_no_other_name(category):
    assert resolve_category({"category": category, "categoryOther": "ignored"}) == (category, None)


def test_others_keeps_the_typed_name_trimmed():
    assert resolve_category({"category": "Others", "categoryOther": "  Soup  "}) == ("Others", "Soup")
    assert resolve_category({"category": "Others", "category_other": "Dessert"}) == ("Others", "Dessert")


@pytest.mark.parametrize("other", [None, "", "   "])
def test_others_without_a_name_is_refused(other):
    with pytest.raises(ValueError):
        resolve_category({"category": "Others", "categoryOther": other})


def test_others_name_is_capped_at_40_characters():
    _, other = resolve_category({"category": "Others", "categoryOther": "x" * 60})
    assert len(other) == 40


def test_unknown_category_is_not_resolved():
    assert resolve_category({"category": "Brunch"}) is None


def test_create_saves_others_and_its_name(repo):
    create_recipe({"name": "Mung bean soup", "category": "Others", "categoryOther": "Soup"})
    assert repo.created["category"] == "Others"
    assert repo.created["category_other"] == "Soup"


def test_create_unknown_category_still_falls_back_to_breakfast(repo):
    create_recipe({"name": "Oats", "category": "Brunch"})
    assert (repo.created["category"], repo.created["category_other"]) == ("Breakfast", None)


def test_create_others_without_name_is_refused(repo):
    with pytest.raises(ValueError):
        create_recipe({"name": "Mystery", "category": "Others"})
    assert repo.created is None


def test_update_switching_back_to_standard_clears_the_name(repo):
    update_recipe("r1", {"category": "Lunch", "categoryOther": "Soup"})
    assert repo.updated["category"] == "Lunch"
    assert repo.updated["category_other"] is None


def test_update_to_others_saves_the_name(repo):
    update_recipe("r1", {"category": "Others", "categoryOther": "Dessert"})
    assert (repo.updated["category"], repo.updated["category_other"]) == ("Others", "Dessert")


def test_update_without_category_leaves_it_alone(repo):
    update_recipe("r1", {"name": "Renamed"})
    assert "category" not in repo.updated and "category_other" not in repo.updated
