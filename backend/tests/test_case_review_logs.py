"""2026-11-18: case review shows each expert the food and exercise the patient logged, in detail, for their own part.
The Dietitian sees food, the Physical Therapist exercise, the Cardiologist both; Admins only the counts."""
import pytest

from app.services import review_sections
from app.services.review_sections import log_counts, timeline_for

TIMELINE = [
    {"type": "Vitals", "timestamp": "2026-11-17T00:00:00Z", "data": {"systolic": 128, "diastolic": 82}},
    {"type": "Meal", "timestamp": "2026-11-16T23:00:00Z", "data": {"meal_name": "Arroz caldo", "sodium_mg": 600}},
    {"type": "Meal", "timestamp": "2026-11-16T04:00:00Z", "data": {"meal_name": "Pork adobo", "sodium_mg": 1100}},
    {"type": "Exercise", "timestamp": "2026-11-15T23:00:00Z", "data": {"routine_name": "Chair march", "status": "completed"}},
    {"type": "Sleep", "timestamp": "2026-11-15T22:00:00Z", "data": {"duration_hours": 7}},
]


def kinds(rows):
    return {r["type"] for r in rows}


@pytest.mark.parametrize("role, expert_type, expected", [
    ("medical_expert", "Cardiologist", {"Vitals", "Meal", "Exercise", "Sleep"}),
    ("medical_expert", "Dietitian", {"Vitals", "Meal", "Sleep"}),
    ("medical_expert", "Physical Therapist", {"Vitals", "Exercise", "Sleep"}),
    ("admin", None, {"Vitals", "Sleep"}),
    ("medical_expert", None, {"Vitals", "Sleep"}),
])
def test_each_role_sees_its_part(role, expert_type, expected):
    assert kinds(timeline_for(TIMELINE, role, expert_type)) == expected


def test_counts_cover_every_log_whoever_looks():
    assert log_counts(TIMELINE) == {"Meal": 2, "Exercise": 1, "Sleep": 1}


def test_recommended_items_carry_their_details(monkeypatch):
    class Content:
        def list_recipes(self):
            return [{"id": "r1", "name": "Tinola", "status": "published", "expert_validated": True, "hss_tier": "Stable",
                     "sodium_mg": 420, "calories": 310, "saturated_fat_g": 1.5, "category": "Lunch", "image_url": "https://x/t.jpg"}]

        def list_routines(self):
            return [{"id": "e1", "name": "Box breathing", "status": "published", "expert_validated": True, "hss_tier": "Stable",
                     "type": "Breathing", "intensity": "None", "duration_minutes": 5, "position": "Seated", "media_url": None}]

    monkeypatch.setattr(review_sections, "get_content_repo", lambda: Content())
    monkeypatch.setattr(review_sections, "recipe_visible", lambda r: True)
    monkeypatch.setattr(review_sections, "is_visible_to_patients", lambda r: True)
    monkeypatch.setattr(review_sections, "exercise_check_for", lambda rc: None)
    monkeypatch.setattr("app.services.dashboard.recipe_warnings", lambda r, diet, allergies: [])

    recs = review_sections.recommendations_for({"app_tier": "Stable", "input_snapshot": {}})
    assert recs["recipes"] == [{"id": "r1", "name": "Tinola", "sodium_mg": 420, "calories": 310, "saturated_fat_g": 1.5,
                                "category": "Lunch", "image_url": "https://x/t.jpg"}]
    assert recs["exercises"][0] == {"id": "e1", "name": "Box breathing", "type": "Breathing", "intensity": "None",
                                    "duration_minutes": 5, "position": "Seated", "image_url": None}
