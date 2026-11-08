"""Saving exercise routines from the portal: field names, step structure and the total time."""
import pytest

from app.services import exercises as exercise_service
from app.services.exercises import clean_step, is_visible_to_patients, routine_payload, total_seconds


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
        "rounds": 3,
        "restSeconds": 5,
        "setupSteps": ["Sit with feet flat", {"instruction": ""}],
    })
    assert out["requirements"] == ["Water bottle", "Sturdy chair without wheels"]
    assert out["skip_if"] == ["Knee pain today"]
    assert out["position"] is None
    assert out["setting"] == "Outdoors"
    assert out["rounds"] == 3 and out["rest_seconds"] == 5
    assert out["setup_steps"] == [{"instruction": "Sit with feet flat", "details": ""}]


def test_patients_only_see_published_pt_approved_exercises():
    approved = {"name": "Movement", "description": "Synthetic movement", "duration_minutes": 1, "rounds": 1,
                "rest_seconds": 0, "position": "Standing", "setting": "Indoors", "status": "published",
                "expert_validated": True, "reviewed_by": "pt-1", "reviewed_at": "2026-11-07",
                "steps": [{"instruction": "Move", "section": "main", "mode": "time", "duration_seconds": 30}]}
    assert is_visible_to_patients(approved)
    assert not is_visible_to_patients({"status": "published", "expert_validated": True})
    assert not is_visible_to_patients({"status": "published", "expert_validated": False})
    assert not is_visible_to_patients({"status": "published"})
    assert not is_visible_to_patients({"status": "draft", "expert_validated": True})


def test_saved_exercises_only_list_ones_patients_can_still_get(monkeypatch):
    class Saved:
        def list_saved_exercises(self, user_id):
            return [
                {"id": "e1", "name": "Movement", "description": "Synthetic", "duration_minutes": 1, "rounds": 1,
                 "rest_seconds": 0, "position": "Standing", "setting": "Indoors", "status": "published",
                 "expert_validated": True, "reviewed_by": "pt-1", "reviewed_at": "2026-11-07",
                 "steps": [{"instruction": "Move", "section": "main", "mode": "time", "duration_seconds": 30}]},
                {"id": "e2", "status": "published", "expert_validated": False},  # lost its PT approval
                {"id": "e3", "status": "archived", "expert_validated": True},
            ]
    monkeypatch.setattr(exercise_service, "get_content_repo", lambda: Saved())
    assert [e["id"] for e in exercise_service.get_saved_exercises("p1")] == ["e1"]


def test_only_the_patient_changes_their_own_saved_exercises():
    from fastapi import HTTPException
    from app.utils.security import verify_user_access
    verify_user_access({"user_id": "p1", "role": "patient"}, "p1")
    with pytest.raises(HTTPException):
        verify_user_access({"user_id": "p2", "role": "patient"}, "p1")
    with pytest.raises(HTTPException):
        verify_user_access({"user_id": "staff", "role": "admin"}, "p1")


def test_calories_burned_scale_with_the_minutes_done():
    # HL-015: the PT's estimate is for the full exercise; half the time burns half.
    routines = [{"id": "walk", "duration_minutes": 20, "calories": 90}, {"id": "yoga", "duration_minutes": 15, "calories": 0}]
    logs = [
        {"routine_id": "walk", "duration_seconds": 600},   # 10 of 20 min -> 45
        {"routine_id": "walk", "duration_minutes": 20},    # full -> 90
        {"routine_id": "walk", "duration_seconds": 7200},  # left running: capped at twice -> 180
        {"routine_id": "yoga", "duration_minutes": 15},    # no estimate -> not counted
        {"routine_id": None, "duration_minutes": 30},      # logged by hand -> not counted
    ]
    assert exercise_service.calories_burned(logs, routines) == (315, 2)
