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


def test_the_dashboard_note_never_asks_the_ai(monkeypatch):
    """2026-11-12: the AI summary moved to Trends; Today's note is the app's own rules, even with an AI key set."""
    import sys

    class NoAI:
        class Groq:
            def __init__(self, *a, **k):
                raise AssertionError("the Dashboard must not call the AI")

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setitem(sys.modules, "groq", NoAI)
    note = _generate_insight(scores(80, 70), None, "Ana", "u1")
    assert note["ai_written"] is False and note["title"]
