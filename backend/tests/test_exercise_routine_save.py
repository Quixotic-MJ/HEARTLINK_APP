"""Saving exercise routines from the portal: field names, step structure and the total time."""
import pytest

from app.services import exercises as exercise_service
from app.services.exercises import clean_step, create_routine, routine_payload, total_seconds, update_routine


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


def test_an_expert_marking_it_checked_records_who_and_when(repo):
    create_routine({"name": "Walk", "expertValidated": True}, reviewer_id="expert-1")
    assert repo.created["reviewed_by"] == "expert-1"
    assert repo.created["reviewed_at"]

    update_routine("e1", {"expertValidated": False}, reviewer_id="expert-1")
    assert repo.updated["reviewed_by"] is None and repo.updated["reviewed_at"] is None


def test_an_update_only_changes_what_was_sent(repo):
    update_routine("e1", {"status": "published"})
    assert repo.updated == {"status": "published"}
