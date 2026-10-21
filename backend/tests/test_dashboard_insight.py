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


def test_a_drop_from_missing_data_asks_for_vitals_and_other_drops_point_to_meals(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    stale = scores(60, 70)
    stale[0]["contributing_factors"] = {"staleness_points": -5}
    assert _generate_insight(stale, None)["action"] == "log_vitals"
    assert _generate_insight(scores(60, 70), None)["action"] == "review_meals"


def test_a_rise_or_a_steady_good_score_offers_no_step(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert _generate_insight(scores(80, 70), None)["action"] is None
    assert _generate_insight(scores(85, 85), None)["action"] is None
