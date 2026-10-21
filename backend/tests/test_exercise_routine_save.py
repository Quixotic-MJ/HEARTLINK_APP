"""Saving exercise routines from the portal: field names, step structure and the total time."""
import pytest

from app.services import exercises as exercise_service
from app.services.exercises import clean_step, create_routine, is_visible_to_patients, routine_payload, total_seconds, update_routine


class FakeContentRepo:
    def __init__(self):
        self.created = None
        self.updated = None

    def create_routine(self, data):
        self.created = data
        return {"id": "e1", **data}

    def update_routine(self, routine_id, data):
        self.updated = data
        return {"id": routine_id, **data}


@pytest.fixture
def repo(monkeypatch):
    fake = FakeContentRepo()
    monkeypatch.setattr(exercise_service, "get_content_repo", lambda: fake)
    return fake


def test_portal_field_names_become_table_columns_and_unknown_fields_are_dropped():
    out = routine_payload({
        "name": " Seated leg lifts ",
        "hssTarget": "Moderate (60-79)",
        "mediaUrl": "/uploads/a.jpg",
        "videoUrl": "https://youtu.be/x",
        "guideImages": [{"url": "/uploads/1.jpg"}, "/uploads/2.jpg"],
        "expertValidated": True,
        "duration": 12,
        "somethingElse": "dropped",
    })
    assert out["name"] == "Seated leg lifts"
    assert out["hss_tier"] == "Moderate"
    assert out["media_url"] == "/uploads/a.jpg"
    assert out["video_url"] == "https://youtu.be/x"
    assert out["guide_images"] == ["/uploads/1.jpg", "/uploads/2.jpg"]
    assert out["expert_validated"] is True
    assert "mediaUrl" not in out and "somethingElse" not in out


def test_steps_keep_their_section_and_a_count_works_out_its_own_time():
    step = clean_step({"instruction": "Lift one leg", "section": "main", "mode": "count", "reps": 10, "seconds_per_rep": 3, "both_sides": True})
    assert step["duration_seconds"] == 30
    assert step["both_sides"] is True
    legacy = clean_step("Walk at an easy pace")
    assert legacy["section"] == "main" and legacy["mode"] == "time"
    assert clean_step({"instruction": "  "}) is None
    assert clean_step({"instruction": "Breathe in", "breath": "in"})["breath"] == "in"
    assert "breath" not in clean_step({"instruction": "x", "breath": "nonsense"})


def test_total_time_comes_from_the_parts():
    steps = [
        clean_step({"instruction": "Warm up", "section": "warmup", "duration_seconds": 120}),
        clean_step({"instruction": "Lift", "mode": "count", "reps": 10, "seconds_per_rep": 3, "both_sides": True}),
        clean_step({"instruction": "Cool down", "section": "cooldown", "duration_seconds": 60}),
    ]
    # 120 + 3 rounds of 60 + 2 rests of 30 + 60
    assert total_seconds(steps, 3, 30) == 120 + 180 + 60 + 60
    out = routine_payload({"type": "Stationary", "steps": steps, "rounds": 3, "restSeconds": 30, "duration": 99})
    assert out["duration_minutes"] == 7


def test_breathing_keeps_the_time_entered():
    out = routine_payload({"type": "Breathing", "steps": [{"instruction": "Breathe in", "duration_seconds": 4}], "rounds": 1, "duration": 10})
    assert out["duration_minutes"] == 10


def test_lists_and_choices_are_cleaned():
    out = routine_payload({
        "requirements": ["Water bottle", " Water bottle ", "", "Sturdy chair without wheels"],
        "skipIf": [{"value": "Knee pain today"}],
        "position": "Floating",
        "setting": "Outdoors",
        "rounds": 99,
        "restSeconds": -5,
        "setupSteps": ["Sit with feet flat", {"instruction": ""}],
    })
    assert out["requirements"] == ["Water bottle", "Sturdy chair without wheels"]
    assert out["skip_if"] == ["Knee pain today"]
    assert out["position"] is None
    assert out["setting"] == "Outdoors"
    assert out["rounds"] == 20 and out["rest_seconds"] == 0
    assert out["setup_steps"] == [{"instruction": "Sit with feet flat", "details": ""}]


def test_a_pt_approving_it_records_who_and_when(repo):
    create_routine({"name": "Walk", "expertValidated": True}, pt_id="pt-1")
    assert repo.created["expert_validated"] is True
    assert repo.created["reviewed_by"] == "pt-1"
    assert repo.created["reviewed_at"]

    update_routine("e1", {"expertValidated": False}, pt_id="pt-1")
    assert repo.updated["reviewed_by"] is None and repo.updated["reviewed_at"] is None


def test_only_a_pt_can_approve_and_other_saves_send_it_back_to_waiting(repo):
    # HL-026: an admin ticking the switch does not approve it.
    create_routine({"name": "Walk", "expertValidated": True})
    assert repo.created["expert_validated"] is False and repo.created["reviewed_by"] is None

    # Any non-PT edit of an approved exercise needs a PT to check it again.
    update_routine("e1", {"name": "Brisk walk"})
    assert repo.updated["expert_validated"] is False
    assert repo.updated["reviewed_by"] is None and repo.updated["reviewed_at"] is None


def test_a_pt_update_only_changes_what_was_sent(repo):
    update_routine("e1", {"status": "published"}, pt_id="pt-1")
    assert repo.updated == {"status": "published"}


def test_patients_only_see_published_pt_approved_exercises():
    assert is_visible_to_patients({"status": "published", "expert_validated": True})
    assert not is_visible_to_patients({"status": "published", "expert_validated": False})
    assert not is_visible_to_patients({"status": "published"})
    assert not is_visible_to_patients({"status": "draft", "expert_validated": True})


def test_saved_exercises_only_list_ones_patients_can_still_get(monkeypatch):
    class Saved:
        def list_saved_exercises(self, user_id):
            return [
                {"id": "e1", "status": "published", "expert_validated": True},
                {"id": "e2", "status": "published", "expert_validated": False},  # lost its PT approval
                {"id": "e3", "status": "archived", "expert_validated": True},
            ]
    monkeypatch.setattr(exercise_service, "get_content_repo", lambda: Saved())
    assert [e["id"] for e in exercise_service.get_saved_exercises("p1")] == ["e1"]


def test_only_the_patient_changes_their_own_saved_exercises():
    from fastapi import HTTPException
    from app.api.exercises.exercises import _own_account_only
    _own_account_only({"user_id": "p1", "role": "patient"}, "p1")
    with pytest.raises(HTTPException):
        _own_account_only({"user_id": "p2", "role": "patient"}, "p1")
