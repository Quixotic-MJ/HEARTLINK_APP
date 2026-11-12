"""HL-154: family alerts: the "no check-in for 2 days" nudge and the Sunday summary."""
from datetime import datetime, timedelta, timezone

import pytest

from app.services import family, family_alerts as fa

PAT, FAM, FAM2 = (
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333",
)
# Sunday 2026-11-15, 8 PM in Manila (12:00 UTC): digest time
SUNDAY_8PM = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)
# Wednesday 2026-11-11, 10 AM in Manila: not digest time
WEDNESDAY = datetime(2026, 11, 11, 2, 0, tzinfo=timezone.utc)


def iso(dt):
    return dt.isoformat()


class Profiles:
    def __init__(self, now):
        self.rows = {
            PAT: {"id": PAT, "role": "patient", "first_name": "Ana", "last_name": "Reyes", "plan": "premium",
                  "premium_until": iso(now + timedelta(days=30))},
            FAM: {"id": FAM, "role": "patient", "first_name": "Ben"},
            FAM2: {"id": FAM2, "role": "patient", "first_name": "Cora"},
        }

    def get_by_id(self, uid):
        return self.rows.get(uid)

    def update(self, uid, data):
        self.rows[uid].update(data)
        return self.rows[uid]


class Links:
    """Family links, with the same claim rule as the database: set only when empty or older than `before`."""

    def __init__(self, links):
        self.links = links

    def list_all_links(self):
        return self.links

    def claim(self, link_id, field, before, now):
        link = next(l for l in self.links if l["id"] == link_id)
        current = link.get(field)
        if current is None or current < before:
            link[field] = now
            return True
        return False


class Logs:
    def __init__(self, logs):
        self.logs = logs

    def list_user_logs(self, uid, limit=None, cutoff=None):
        return sorted(self.logs, key=lambda l: l["logged_at"], reverse=True)


class Notes:
    def __init__(self):
        self.sent = []

    def create_notification(self, data):
        self.sent.append(data)
        return data


def reading(at, sys_bp=128, dia_bp=82, medicine=None):
    return {"logged_at": iso(at), "systolic_bp": sys_bp, "diastolic_bp": dia_bp, "medication_taken": medicine}


@pytest.fixture
def world(monkeypatch):
    class W:
        pass

    def install(now, logs, links=None):
        w = W()
        w.now = now
        w.profiles = Profiles(now)
        w.links = Links(links if links is not None else [
            {"id": "L1", "patient_id": PAT, "follower_id": FAM, "created_at": iso(now - timedelta(days=30))},
            {"id": "L2", "patient_id": PAT, "follower_id": FAM2, "created_at": iso(now - timedelta(days=30))},
        ])
        w.logs = Logs(logs)
        w.notes = Notes()
        monkeypatch.setattr(fa, "get_profile_repo", lambda: w.profiles)
        monkeypatch.setattr(fa, "get_family_repo", lambda: w.links)
        monkeypatch.setattr(fa, "get_health_logs_repo", lambda: w.logs)
        monkeypatch.setattr(fa, "get_notification_repo", lambda: w.notes)
        return w

    return install


# --- the "no check-in" nudge ---------------------------------------------------------------------------

def test_followers_are_told_once_after_2_days_without_a_reading(world):
    w = world(WEDNESDAY, [reading(WEDNESDAY - timedelta(hours=50))])
    assert fa.run_once(WEDNESDAY) == {"nudges": 2, "digests": 0}
    note = w.notes.sent[0]
    assert note["title"] == "No check-in for 2 days"
    assert note["message"] == "Ana R. hasn't logged a blood pressure reading since Monday. You might check in with them."
    # The next hourly run sends nothing more
    assert fa.run_once(WEDNESDAY + timedelta(hours=1)) == {"nudges": 0, "digests": 0}


def test_no_nudge_before_2_days(world):
    w = world(WEDNESDAY, [reading(WEDNESDAY - timedelta(hours=40))])
    assert fa.run_once(WEDNESDAY)["nudges"] == 0 and w.notes.sent == []


def test_a_new_reading_resets_the_nudge(world):
    w = world(WEDNESDAY, [reading(WEDNESDAY - timedelta(hours=50))])
    fa.run_once(WEDNESDAY)
    # Ana logs, then goes quiet for 2 more days: followers are told again
    later = WEDNESDAY + timedelta(days=3)
    w.logs.logs.append(reading(WEDNESDAY + timedelta(hours=10)))
    assert fa.run_once(later)["nudges"] == 2


def test_the_patient_can_turn_nudges_off(world):
    w = world(WEDNESDAY, [reading(WEDNESDAY - timedelta(days=4))])
    w.profiles.rows[PAT]["family_nudges_enabled"] = False
    assert fa.run_once(WEDNESDAY)["nudges"] == 0


def test_nothing_is_sent_without_premium(world):
    w = world(SUNDAY_8PM, [reading(SUNDAY_8PM - timedelta(days=4))])
    w.profiles.rows[PAT]["premium_until"] = iso(SUNDAY_8PM - timedelta(days=1))
    assert fa.run_once(SUNDAY_8PM) == {"nudges": 0, "digests": 0}


def test_a_new_follow_waits_2_days_from_when_it_started(world):
    links = [{"id": "L1", "patient_id": PAT, "follower_id": FAM, "created_at": iso(WEDNESDAY - timedelta(hours=10))}]
    w = world(WEDNESDAY, [], links)
    assert fa.run_once(WEDNESDAY)["nudges"] == 0
    assert fa.run_once(WEDNESDAY + timedelta(hours=40))["nudges"] == 1
    assert "since you started following" in w.notes.sent[0]["message"]


def test_two_servers_at_once_send_one_message(world):
    """Staging and live share the database: the claim means only the first run sends."""
    w = world(WEDNESDAY, [reading(WEDNESDAY - timedelta(hours=50))])
    fa.run_once(WEDNESDAY)
    fa.run_once(WEDNESDAY)
    assert len(w.notes.sent) == 2  # one per follower, not two each


# --- the Sunday summary -------------------------------------------------------------------------------

def test_the_sunday_summary_says_the_week_in_plain_words(world):
    logs = [
        reading(SUNDAY_8PM - timedelta(days=5), 141, 90, medicine=True),   # Tuesday
        reading(SUNDAY_8PM - timedelta(days=3), 125, 80, medicine=True),
        reading(SUNDAY_8PM - timedelta(days=1), 118, 76, medicine=False),
        reading(SUNDAY_8PM - timedelta(days=12), 190, 120),                 # last week: left out
    ]
    w = world(SUNDAY_8PM, logs)
    assert fa.run_once(SUNDAY_8PM)["digests"] == 2
    digest = next(n for n in w.notes.sent if n["title"] == "Ana R.'s week")
    assert digest["message"] == ("Ana R.'s week: 3 readings, average 128/82, highest 141/90 on Tuesday; logged on 3 of 7 days; "
                                 "medicine taken at 2 of 3 check-ins.")
    # Once a week: the next hourly run on Sunday sends nothing
    assert fa.run_once(SUNDAY_8PM + timedelta(hours=1))["digests"] == 0


def test_no_summary_before_sunday_7pm(world):
    world(SUNDAY_8PM, [reading(SUNDAY_8PM - timedelta(days=1))])
    assert fa.run_once(SUNDAY_8PM - timedelta(hours=2))["digests"] == 0  # Sunday 6 PM
    assert fa.run_once(WEDNESDAY)["digests"] == 0


def test_an_empty_week_says_so(world):
    assert fa.digest_message("Ana R.", []) == "Ana R. didn't log anything this week."


def test_nudge_switch_is_on_by_default_and_saved(monkeypatch):
    """The patient's switch on the Family sharing screen."""
    class P(Profiles):
        pass

    profiles = P(WEDNESDAY)
    monkeypatch.setattr(family, "get_profile_repo", lambda: profiles)
    monkeypatch.setattr(family, "get_family_repo", lambda: type("R", (), {
        "get_open_invite": lambda self, pid, now: None, "list_followers": lambda self, pid: []})())
    assert family.sharing_status(PAT)["nudges_enabled"] is True
    assert family.set_nudges(PAT, False) == {"nudges_enabled": False}
    assert profiles.rows[PAT]["family_nudges_enabled"] is False
    assert family.sharing_status(PAT)["nudges_enabled"] is False
