"""Trends asks for logs since a cutoff; the cutoff must be a timestamp the database accepts."""
import re

from app.services import analytics


class Recorder:
    def __init__(self, seen):
        self.seen = seen

    def __getattr__(self, name):
        def call(*args, **kwargs):
            if "cutoff" in kwargs:
                self.seen.append(kwargs["cutoff"])
            return {} if name == "get_thresholds" else []
        return call


def test_cutoff_is_a_valid_utc_timestamp(monkeypatch):
    seen = []
    fake = lambda: Recorder(seen)
    monkeypatch.setattr(analytics, "get_hss_repo", fake)
    monkeypatch.setattr(analytics, "get_baseline_repo", fake)
    monkeypatch.setattr("app.services.health_logs.get_health_logs_repo", fake)
    for name in ("get_sleep_repo", "get_exercises_repo", "get_meals_repo"):
        monkeypatch.setattr(f"app.db.repositories.{name}", fake)
    for name in ("get_profile_repo", "get_baseline_repo"):  # daily food limits (HL-016)
        monkeypatch.setattr(f"app.services.nutrition_targets.{name}", fake)

    analytics.get_analytics("p1", days=7)

    assert seen, "no repository was asked for logs since a cutoff"
    for cutoff in seen:
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", cutoff), cutoff
