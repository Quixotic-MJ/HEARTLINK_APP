"""HL-057: checkup reminder and hidden items, behind PATIENT_REVIEW_FEEDBACK_ENABLED (off by default)."""
from datetime import timedelta

import pytest

from app.services import review_feedback as feedback
from app.utils.time import utc_now


class Cases:
    def __init__(self, cases=(), sections=None):
        self.cases, self.sections, self.hidden = list(cases), sections or {}, []

    def list_patient_cases(self, patient_id):
        return [c for c in self.cases if c["patient_id"] == patient_id]

    def list_sections(self, review_case_id=None, section=None, **k):
        return [s for s in self.sections.get(review_case_id, []) if s["section"] == section]

    def hide_recommendation(self, patient_id, item_type, item_id, review_case_id=None):
        self.hidden.append({"patient_id": patient_id, "item_type": item_type, "item_id": item_id})

    def list_hidden_recommendations(self, patient_id):
        return [h for h in self.hidden if h["patient_id"] == patient_id]


class Notifications:
    def __init__(self):
        self.sent = []

    def create_notification(self, data):
        self.sent.append(data)
        return data


@pytest.fixture
def world(monkeypatch):
    monkeypatch.delenv("PATIENT_REVIEW_FEEDBACK_ENABLED", raising=False)
    done = (utc_now() - timedelta(days=3)).isoformat()
    cases = Cases(
        [{"id": "c1", "patient_id": "p1", "status": "complete", "completed_at": done}],
        {"c1": [{"section": "cardiology", "checkup_flag": "within_2_weeks"}]},
    )
    notes = Notifications()
    monkeypatch.setattr(feedback, "get_case_review_repo", lambda: cases)
    monkeypatch.setattr(feedback, "get_notification_repo", lambda: notes)
    return {"cases": cases, "notes": notes}


def switch_on(monkeypatch):
    monkeypatch.setenv("PATIENT_REVIEW_FEEDBACK_ENABLED", "on")


def test_the_setting_is_off_by_default_so_patients_see_nothing(world):
    assert feedback.is_enabled() is False
    feedback.notify_checkup({"id": "c1", "patient_id": "p1"}, "asap")
    feedback.record_not_suitable({"id": "c1", "patient_id": "p1"},
                                 [{"item_type": "recipe", "item_id": "r1", "verdict": "no"}])
    assert world["notes"].sent == []
    assert feedback.checkup_reminder("p1") is None
    assert feedback.hidden_items("p1") == set()
    # Recorded all the same (HL-056), ready for when the setting is switched on.
    assert len(world["cases"].hidden) == 1


def test_when_on_a_checkup_request_sends_a_reminder_and_shows_the_banner(world, monkeypatch):
    switch_on(monkeypatch)
    feedback.notify_checkup({"id": "c1", "patient_id": "p1"}, "within_2_weeks")
    feedback.notify_checkup({"id": "c1", "patient_id": "p1"}, "not_needed")
    assert [n["title"] for n in world["notes"].sent] == ["Time for a checkup"]
    assert world["notes"].sent[0]["type"] == "reminder"
    assert feedback.checkup_reminder("p1")["urgency"] == "within_2_weeks"


def test_the_banner_ends_two_weeks_after_the_review(world, monkeypatch):
    switch_on(monkeypatch)
    world["cases"].cases[0]["completed_at"] = (utc_now() - timedelta(days=15)).isoformat()
    assert feedback.checkup_reminder("p1") is None


def test_when_on_only_not_suitable_items_are_hidden(world, monkeypatch):
    switch_on(monkeypatch)
    feedback.record_not_suitable({"id": "c1", "patient_id": "p1"}, [
        {"item_type": "recipe", "item_id": "r1", "verdict": "no"},
        {"item_type": "exercise", "item_id": "e1", "verdict": "changes"},
        {"item_type": "exercise", "item_id": "e2", "verdict": "ok"},
    ])
    assert feedback.hidden_items("p1") == {("recipe", "r1")}
    assert feedback.hidden_items("someone-else") == set()
