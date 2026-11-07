"""HL-093: the pre-exercise safety check pauses active exercise, and only that."""
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.services import coach_note, exercise_screening
from app.services.dashboard import exercise_suits


class FakeRepo:
    def __init__(self):
        self.rows = {}

    def get(self, user_id):
        return self.rows.get(user_id)

    def save(self, user_id, row):
        self.rows[user_id] = {"user_id": user_id, **row}


@pytest.fixture
def repo(monkeypatch):
    fake = FakeRepo()
    monkeypatch.setattr(exercise_screening, "_repo", lambda: fake)
    return fake


ALL_NO = {q: False for q in exercise_screening.QUESTION_IDS}


def test_not_answered_yet_doesnt_pause(repo):
    assert exercise_screening.status_for("u1") == {"answered": False, "needs_assessment": False, "cleared": False, "paused": False}


def test_all_no_doesnt_pause(repo):
    assert exercise_screening.save_answers("u1", ALL_NO)["paused"] is False
    assert exercise_screening.status_for("u1")["answered"] is True


@pytest.mark.parametrize("question", exercise_screening.QUESTION_IDS)
def test_any_yes_pauses_until_a_professional_clears_it(repo, question):
    assert exercise_screening.save_answers("u1", {**ALL_NO, question: True})["paused"] is True
    cleared = exercise_screening.clear("u1")
    assert cleared["paused"] is False and cleared["needs_assessment"] is True and cleared["cleared"] is True


def test_new_answers_need_their_own_clearance(repo):
    exercise_screening.save_answers("u1", {**ALL_NO, "fainting": True})
    exercise_screening.clear("u1")
    assert exercise_screening.save_answers("u1", {**ALL_NO, "chest_pain": True})["paused"] is True


def test_every_question_must_be_answered(repo):
    with pytest.raises(HTTPException) as e:
        exercise_screening.save_answers("u1", {"fainting": False})
    assert e.value.status_code == 422


def test_clearing_needs_answers_first(repo):
    with pytest.raises(HTTPException):
        exercise_screening.clear("u1")


def test_a_read_failure_never_breaks_the_dashboard(monkeypatch):
    def boom():
        raise RuntimeError("table missing")

    monkeypatch.setattr(exercise_screening, "_repo", boom)
    assert exercise_screening.status_for("u1")["paused"] is False


def test_only_breathing_is_suggested_during_a_pause():
    assert exercise_suits({"type": "Breathing"}, "Stable", True) is True
    assert exercise_suits({"type": "Stationary"}, "Stable", True) is False


def test_todays_note_doesnt_suggest_a_walk_during_a_pause():
    evening = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)
    vitals = [{"systolic_bp": 118, "diastolic_bp": 76, "logged_at": evening.isoformat()}]
    meals = [{"meal_name": "Rice", "sodium_mg": 10, "logged_at": evening.isoformat()}]

    def note(paused):
        f = coach_note.day_facts(
            meal_logs=meals, exercise_logs=[], vitals_logs=vitals, sleep_hours=7, sodium_limit=2000, movement_goal=30,
            exercise_paused=paused, now=evening,
        )
        return coach_note.improve_note("Holding.", "Steady.", "check-circle", None, "", 0, 82, f)

    assert note(False)[3] == "start_walk"
    assert note(True)[3] != "start_walk"
