"""Today's note on the dashboard: the step offered under it matches what the note says."""
from app.services.dashboard import _generate_insight


def scores(*values):
    # Newest first, each from a different day so the comparison uses the previous day.
    return [{"score": v, "computed_at": f"2026-10-{22 - i:02d}T08:00:00Z"} for i, v in enumerate(values)]


def test_new_patients_are_asked_to_log_vitals(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    note = _generate_insight(scores(70), None)
    assert note["action"] == "log_vitals"
    assert note["ai_written"] is False


def test_a_drop_from_missing_data_asks_for_vitals_and_only_a_meal_drop_points_to_meals(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    stale = scores(60, 70)
    stale[0]["contributing_factors"] = {"staleness_points": -5}
    assert _generate_insight(stale, None)["action"] == "log_vitals"
    assert _generate_insight(scores(60, 70), None)["action"] == "log_vitals"  # no known cause
    meal = scores(60, 70)
    meal[0]["contributing_factors"] = {"source": "lifestyle_composite", "trigger": "meal_log"}
    assert _generate_insight(meal, None)["action"] == "review_meals"


def test_a_rise_or_a_steady_good_score_offers_no_step(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert _generate_insight(scores(80, 70), None)["action"] is None
    assert _generate_insight(scores(85, 85), None)["action"] is None


class FakeGroq:
    """Stands in for the groq package and counts how often the AI is asked."""

    calls = 0

    class Groq:
        def __init__(self, api_key, timeout):
            self.chat = self
            self.completions = self

        def create(self, **kwargs):
            FakeGroq.calls += 1
            message = type("M", (), {"content": f"AI note {FakeGroq.calls}"})
            return type("R", (), {"choices": [type("C", (), {"message": message})]})


def ai_on(monkeypatch):
    import sys
    from app.services import dashboard

    FakeGroq.calls = 0
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setitem(sys.modules, "groq", FakeGroq)
    monkeypatch.setattr(dashboard, "_ai_insight_lines", {})
    monkeypatch.setattr(dashboard, "_ai_insight_calls", {})
    return dashboard


def test_reloading_the_dashboard_reuses_todays_ai_note(monkeypatch):
    ai_on(monkeypatch)
    first = _generate_insight(scores(80, 70), None, "Ana", "u1")
    again = _generate_insight(scores(80, 70), None, "Ana", "u1")
    assert first["ai_written"] and again["body"] == first["body"] == "AI note 1"
    assert FakeGroq.calls == 1


def test_a_changed_score_story_gets_a_new_ai_note(monkeypatch):
    ai_on(monkeypatch)
    _generate_insight(scores(80, 70), None, "Ana", "u1")
    _generate_insight(scores(60, 70), None, "Ana", "u1")
    assert FakeGroq.calls == 2


def test_after_the_daily_cap_the_plain_note_is_used(monkeypatch):
    dashboard = ai_on(monkeypatch)
    monkeypatch.setattr(dashboard, "AI_INSIGHT_DAILY_CAP", 1)
    _generate_insight(scores(80, 70), None, "Ana", "u1")
    capped = _generate_insight(scores(60, 70), None, "Ana", "u1")
    assert FakeGroq.calls == 1
    assert capped["ai_written"] is False and capped["body"]
    # Someone else still gets their own
    assert _generate_insight(scores(60, 70), None, "Ben", "u2")["ai_written"] is True
