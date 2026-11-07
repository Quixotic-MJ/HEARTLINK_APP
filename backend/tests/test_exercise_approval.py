"""Routine authoring, exact-revision review and atomic publication withdrawal."""
from copy import deepcopy

import pytest

from app.services import exercises
from app.db.repositories.content import SupabaseContentRepository

OPENED_AT = "2026-11-07T01:00:00+00:00"


def complete_routine(**changes):
    return {"id": "e1", "name": "Synthetic beginner movement", "description": "Reviewed instructions",
            "type": "Stationary", "intensity": "Low", "duration_minutes": 1,
            "position": "Standing", "setting": "Indoors", "rounds": 1, "rest_seconds": 0,
            "steps": [{"instruction": "Move gently", "section": "main", "mode": "time",
                       "duration_seconds": 30, "both_sides": False}],
            "status": "draft", "expert_validated": False, "reviewed_by": None, "reviewed_at": None,
            "updated_at": OPENED_AT, **changes}


class Repo:
    def __init__(self, **changes):
        self.row = complete_routine(**changes)
        self.writes = []
        self.race = False

    def get_routine(self, _):
        return deepcopy(self.row)

    def create_routine(self, data):
        self.writes.append(data)
        self.row = {"id": "e1", "updated_at": OPENED_AT, **data}
        return deepcopy(self.row)

    def update_routine(self, _, data, expected_updated_at=None):
        if self.race or expected_updated_at != self.row["updated_at"]:
            return None
        self.writes.append(deepcopy(data))
        self.row.update(data, updated_at="2026-11-07T01:01:00+00:00")
        return deepcopy(self.row)


@pytest.fixture
def repo(monkeypatch):
    fake = Repo()
    monkeypatch.setattr(exercises, "get_content_repo", lambda: fake)
    return fake


def test_new_routines_always_start_as_unapproved_drafts(repo):
    result = exercises.create_routine({"name": "Synthetic routine", "status": "published"})
    assert result["status"] == "draft" and result["expert_validated"] is False
    assert result["reviewed_by"] is None and result["reviewed_at"] is None


@pytest.mark.parametrize("field", ["expertValidated", "expert_validated", "reviewNote", "reviewed_by", "reviewed_at"])
def test_author_cannot_smuggle_a_review(repo, field):
    with pytest.raises(ValueError, match="review action"):
        exercises.create_routine({field: True})
    with pytest.raises(ValueError, match="review action"):
        exercises.update_routine("e1", {field: True}, expected_updated_at=OPENED_AT)
    assert repo.writes == []


def test_pt_approves_exact_revision_and_admin_publishes_separately(repo):
    reviewed = exercises.review_routine("e1", decision="approve", expected_updated_at=OPENED_AT, pt_id="pt-1")
    assert reviewed["status"] == "draft" and reviewed["reviewed_by"] == "pt-1"
    assert not exercises.is_visible_to_patients(reviewed)
    published = exercises.update_routine("e1", {"status": "published"}, expected_updated_at=reviewed["updated_at"])
    assert exercises.is_visible_to_patients(published)


@pytest.mark.parametrize("changes", [{"steps": []}, {"steps": ["Move gently"]}, {"position": None},
                                     {"setting": None}, {"duration_minutes": None}, {"name": ""},
                                     {"duration_minutes": 20}, {"rounds": 99}])
def test_incomplete_stored_routines_cannot_be_approved(repo, changes):
    repo.row.update(changes)
    with pytest.raises(ValueError, match="incomplete"):
        exercises.review_routine("e1", decision="approve", expected_updated_at=OPENED_AT, pt_id="pt-1")
    assert repo.writes == []


def test_old_approval_does_not_make_an_incomplete_timeline_discoverable():
    routine = complete_routine(status="published", expert_validated=True, reviewed_by="pt-1", reviewed_at=OPENED_AT, steps=["Untimed old instruction"])
    assert not exercises.is_visible_to_patients(routine)


def test_published_edit_withdraws_and_invalidates_in_the_same_write(repo):
    repo.row.update(status="published", expert_validated=True, reviewed_by="pt-1", reviewed_at=OPENED_AT)
    result = exercises.update_routine("e1", {"name": "Revised movement"}, expected_updated_at=OPENED_AT)
    assert result["status"] == "draft" and not result["expert_validated"]
    assert result["reviewed_by"] is None and result["reviewed_at"] is None
    assert len(repo.writes) == 1 and repo.writes[0]["status"] == "draft"


def test_partial_round_edit_uses_the_complete_stored_timeline(repo):
    result = exercises.update_routine("e1", {"rounds": 3}, expected_updated_at=OPENED_AT)
    assert result["duration_minutes"] == 2


def test_unapproved_publication_is_rejected(repo):
    with pytest.raises(ValueError, match="approval is required"):
        exercises.update_routine("e1", {"status": "published"}, expected_updated_at=OPENED_AT)
    assert repo.writes == []


@pytest.mark.parametrize("race", [False, True])
def test_stale_author_and_review_writes_fail_without_mutation(repo, race):
    repo.race = race
    expected = OPENED_AT if race else "older-revision"
    with pytest.raises(exercises.RoutineReviewConflict):
        exercises.update_routine("e1", {"name": "Stale edit"}, expected_updated_at=expected)
    with pytest.raises(exercises.RoutineReviewConflict):
        exercises.review_routine("e1", decision="approve", expected_updated_at=expected, pt_id="pt-1")
    assert repo.writes == []


def test_changes_requested_requires_and_retains_a_note(repo):
    with pytest.raises(ValueError, match="note is required"):
        exercises.review_routine("e1", decision="changes_requested", expected_updated_at=OPENED_AT, pt_id="pt-1")
    result = exercises.review_routine("e1", decision="changes_requested", expected_updated_at=OPENED_AT,
                                     pt_id="pt-1", note="  Clarify the equipment.  ")
    assert result["review_note"] == "Clarify the equipment." and result["status"] == "draft"


def test_saving_an_untimed_legacy_step_does_not_invent_a_dose(repo):
    created = exercises.create_routine({"name": "Untimed", "steps": ["Move gently"]})
    assert created["steps"][0]["duration_seconds"] is None


@pytest.mark.parametrize("data", [{"rounds": 1.5}, {"rounds": 99}, {"restSeconds": -5},
                                  {"steps": [{"instruction": "Move", "duration_seconds": 9999}]}])
def test_dose_is_rejected_instead_of_silently_changed(repo, data):
    with pytest.raises(ValueError):
        exercises.create_routine(data)


def test_a_valid_count_keeps_the_same_dose_when_opened_and_saved_again():
    raw = {"steps": [{"instruction": "Move", "mode": "count", "reps": 100, "seconds_per_rep": 60}]}
    first = exercises.routine_payload(raw)
    assert exercises.routine_payload(first)["steps"] == first["steps"]


def test_repository_compare_and_set_never_falls_back_to_a_second_id():
    filters = []
    tables = []

    class Query:
        def update(self, data):
            return self

        def eq(self, key, value):
            filters.append((key, value))
            return self

        def execute(self):
            return type("Response", (), {"data": []})()

    class Client:
        def table(self, name):
            tables.append(name)
            return Query()

    uid = "11111111-1111-1111-1111-111111111111"
    assert SupabaseContentRepository(Client()).update_routine(uid, {"status": "draft"}, OPENED_AT) is None
    assert tables == ["exercise_routines"]
    assert filters == [("id", uid), ("updated_at", OPENED_AT)]
