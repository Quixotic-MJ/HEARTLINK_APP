"""HL-087: family sharing (Premium for the patient)."""
from datetime import timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.services import family
from app.utils.time import utc_now

PAT, FAM, OTHER = (
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333",
)


def ago(**kw):
    return (utc_now() - timedelta(**kw)).isoformat()


class Profiles:
    def __init__(self):
        until = (utc_now() + timedelta(days=5)).isoformat()
        self.rows = {
            PAT: {"id": PAT, "role": "patient", "account_status": "active", "first_name": "Ana", "last_name": "Reyes",
                  "plan": "premium", "premium_until": until},
            FAM: {"id": FAM, "role": "patient", "account_status": "active", "first_name": "Ben", "last_name": "Reyes",
                  "plan": "free", "account_kind": "family"},
            OTHER: {"id": OTHER, "role": "patient", "account_status": "active", "first_name": "Cora", "last_name": "",
                    "plan": "free"},
        }

    def get_by_id(self, uid):
        return self.rows.get(uid)

    def update(self, uid, data):
        self.rows[uid].update(data)
        return self.rows[uid]


class FamilyRepo:
    def __init__(self):
        self.invites, self.links = [], []

    def cancel_open_invites(self, patient_id, now):
        for i in self.invites:
            if i["patient_id"] == patient_id and not i.get("used_at"):
                i["cancelled_at"] = now

    def create_invite(self, patient_id, code, expires_at):
        row = {"id": f"inv{len(self.invites)}", "patient_id": patient_id, "code": code, "expires_at": expires_at}
        self.invites.append(row)
        return row

    def get_open_invite(self, patient_id, now):
        rows = [i for i in self.invites if i["patient_id"] == patient_id and not i.get("used_at")
                and not i.get("cancelled_at") and i["expires_at"] > now]
        return rows[-1] if rows else None

    def get_invite_by_code(self, code):
        return next((i for i in self.invites if i["code"] == code), None)

    def use_invite(self, invite_id, follower_id, now):
        i = next(i for i in self.invites if i["id"] == invite_id)
        if i.get("used_at"):
            return False
        i.update(used_at=now, used_by=follower_id)
        return True

    def list_followers(self, patient_id):
        return [l for l in self.links if l["patient_id"] == patient_id]

    def list_following(self, follower_id):
        return [l for l in self.links if l["follower_id"] == follower_id]

    def get_link(self, patient_id, follower_id):
        return next((l for l in self.links if l["patient_id"] == patient_id and l["follower_id"] == follower_id), None)

    def add_link(self, patient_id, follower_id):
        row = {"patient_id": patient_id, "follower_id": follower_id, "created_at": utc_now().isoformat()}
        self.links.append(row)
        return row

    def delete_link(self, patient_id, follower_id):
        before = len(self.links)
        self.links = [l for l in self.links if not (l["patient_id"] == patient_id and l["follower_id"] == follower_id)]
        return len(self.links) < before


class Notes:
    def __init__(self):
        self.sent = []

    def create_notification(self, data):
        self.sent.append(data)
        return data


class Rows:
    def __init__(self, **lists):
        self.lists = lists

    def __getattr__(self, name):
        return lambda *a, **k: self.lists.get(name, [])


class HealthLogs:
    def list_user_logs(self, uid, limit=None, cutoff=None):
        rows = sorted(LOGS, key=lambda r: r["logged_at"], reverse=True)
        return rows[:limit] if limit else rows

    def list_alerts(self, user_id=None, status_filter=None):
        return [{"alert_type": "Hypertensive Crisis", "severity": "critical", "created_at": ago(days=3)}]


LOGS = [
    {"logged_at": ago(days=3), "systolic_bp": 150, "diastolic_bp": 95, "heart_rate_bpm": 82},
    {"logged_at": ago(days=1), "systolic_bp": 138, "diastolic_bp": 88, "heart_rate_bpm": None},
    {"logged_at": ago(hours=2), "systolic_bp": None, "diastolic_bp": None},
    {"logged_at": ago(hours=1), "systolic_bp": 200, "diastolic_bp": 130, "deleted_at": ago(minutes=30)},
]


@pytest.fixture
def world(monkeypatch):
    w = type("W", (), {})()
    w.profiles, w.repo, w.notes = Profiles(), FamilyRepo(), Notes()
    monkeypatch.setattr(family, "get_profile_repo", lambda: w.profiles)
    monkeypatch.setattr(family, "get_family_repo", lambda: w.repo)
    monkeypatch.setattr(family, "get_notification_repo", lambda: w.notes)

    monkeypatch.setattr(family, "get_health_logs_repo", lambda: HealthLogs())
    monkeypatch.setattr(family, "get_hss_repo", lambda: Rows(list_hss_history=[{"computed_at": ago(days=1), "score": 71}]))
    return w


def linked(w):
    code = family.create_invite(PAT)["code"]
    family.follow(FAM, code)
    return code


# --- invites ---------------------------------------------------------------------------------------------

def test_a_premium_patient_gets_a_6_character_code_for_24_hours(world):
    invite = family.create_invite(PAT)
    assert len(invite["code"]) == 6 and set(invite["code"]) <= set(family.CODE_ALPHABET)
    assert not set(invite["code"]) & set("0O1IL")
    hours = (family.parse_utc(invite["expires_at"]) - utc_now()).total_seconds() / 3600
    assert 23.9 < hours <= 24
    # a new code replaces the old one
    second = family.create_invite(PAT)
    assert family.sharing_status(PAT)["invite"]["code"] == second["code"]
    with pytest.raises(HTTPException) as e:
        family.follow(FAM, invite["code"])
    assert e.value.status_code == 400


def test_free_patients_cant_make_a_code(world):
    with pytest.raises(HTTPException) as e:
        family.create_invite(OTHER)
    assert e.value.status_code == 403 and e.value.detail["code"] == "premium_required"


def test_codes_work_once_not_after_24_hours_and_not_for_yourself(world):
    invite = family.create_invite(PAT)
    with pytest.raises(HTTPException) as e:
        family.follow(PAT, invite["code"])
    assert "your own code" in e.value.detail
    family.follow(FAM, invite["code"].lower()[:3] + "-" + invite["code"].lower()[3:])  # typed loosely: still works
    with pytest.raises(HTTPException) as e:
        family.follow(OTHER, invite["code"])
    assert e.value.detail == family.BAD_CODE
    late = family.create_invite(PAT)
    world.repo.invites[-1]["expires_at"] = ago(minutes=1)
    with pytest.raises(HTTPException) as e:
        family.follow(OTHER, late["code"])
    assert e.value.detail == family.BAD_CODE
    with pytest.raises(HTTPException) as e:
        family.follow(OTHER, "ZZZZZZ")
    assert e.value.detail == family.BAD_CODE


def test_up_to_5_followers(world):
    for i in range(5):
        world.repo.add_link(PAT, f"f{i}")
    with pytest.raises(HTTPException) as e:
        family.create_invite(PAT)
    assert e.value.status_code == 409


def test_the_patient_is_told_when_someone_follows(world):
    linked(world)
    assert family.sharing_status(PAT)["followers"][0]["name"] == "Ben R."
    note = world.notes.sent[-1]
    assert note["user_id"] == PAT and "Ben R." in note["message"] and "Family sharing" in note["message"]


# --- what the follower sees -------------------------------------------------------------------------------

def test_followers_see_a_read_only_summary(world):
    linked(world)
    assert family.following(FAM) == [{"id": PAT, "name": "Ana R.", "since": world.repo.links[0]["created_at"], "paused": False}]
    s = family.summary(FAM, PAT)
    assert (s["latest_bp"]["systolic"], s["latest_bp"]["diastolic"]) == (138, 88)  # the deleted 200/130 is left out
    assert s["latest_pulse"]["bpm"] == 82 and s["score"]["value"] == 71
    assert s["last_check_in"] == LOGS[2]["logged_at"]
    assert len(s["days"]) == 30 and s["days"][-2]["systolic"] == 138 and s["days"][-2]["score"] == 71
    assert s["open_alerts"][0]["type"] == "Hypertensive Crisis"
    assert set(s) == {"id", "name", "paused", "latest_bp", "latest_pulse", "score", "last_check_in", "days", "open_alerts"}


def test_only_followers_see_it(world):
    linked(world)
    with pytest.raises(HTTPException) as e:
        family.summary(OTHER, PAT)
    assert e.value.status_code == 403


def test_sharing_pauses_when_premium_ends_and_comes_back(world):
    linked(world)
    world.profiles.rows[PAT]["premium_until"] = ago(days=1)
    assert family.summary(FAM, PAT) == {"id": PAT, "name": "Ana R.", "paused": True}
    assert family.following(FAM)[0]["paused"] is True
    world.profiles.rows[PAT]["premium_until"] = (utc_now() + timedelta(days=30)).isoformat()
    assert family.summary(FAM, PAT)["paused"] is False


def test_removing_a_follower_ends_access_at_once(world):
    linked(world)
    family.remove_follower(PAT, FAM)
    with pytest.raises(HTTPException):
        family.summary(FAM, PAT)
    assert family.following(FAM) == []


def test_a_follower_can_stop_following(world):
    linked(world)
    family.stop_following(FAM, PAT)
    assert family.sharing_status(PAT)["followers"] == []


def test_account_kind_is_patient_or_family(world):
    assert family.set_account_kind(FAM, "patient") == {"account_kind": "patient"}
    assert world.profiles.rows[FAM]["account_kind"] == "patient"
    with pytest.raises(HTTPException):
        family.set_account_kind(FAM, "admin")


# --- emergency readings ------------------------------------------------------------------------------------

@pytest.mark.parametrize("data, emergency", [
    ({"systolic_bp": 180, "diastolic_bp": 100}, True),
    ({"systolic_bp": 150, "diastolic_bp": 120}, True),
    ({"systolic_bp": 89, "diastolic_bp": 65}, True),
    ({"systolic_bp": 110, "diastolic_bp": 59}, True),
    ({"systolic_bp": 179, "diastolic_bp": 119}, False),
    ({"systolic_bp": 90, "diastolic_bp": 60}, False),
    ({"symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 7}}, True),
    ({"symptoms": ["Chest Discomfort / Tightness"], "severity_map": {"Chest Discomfort / Tightness": 6}}, False),
    ({"symptoms": ["Shortness of Breath"], "context": "resting"}, True),
    ({"symptoms": ["Shortness of Breath"], "context": "after_exercise"}, False),
    ({}, False),
])
def test_emergency_rules_match_the_app(data, emergency):
    assert family.is_emergency(data) is emergency


def test_followers_are_told_about_an_emergency_reading(world):
    linked(world)
    world.notes.sent.clear()
    assert family.notify_followers(PAT, {"systolic_bp": 190, "diastolic_bp": 125, "logged_at": "2026-10-27T11:05:00+00:00"}) == 1
    note = world.notes.sent[0]
    assert note["user_id"] == FAM and note["type"] == "alert"
    assert note["message"] == "Ana R. logged a reading at an emergency level (190/125 at 7:05 PM). Check on them; if they need help now, call 911."


def test_no_alerts_while_sharing_is_paused(world):
    linked(world)
    world.notes.sent.clear()
    world.profiles.rows[PAT]["plan"] = "free"
    assert family.notify_followers(PAT, {"systolic_bp": 190, "diastolic_bp": 125}) == 0 and world.notes.sent == []


def test_notifying_never_raises(world, monkeypatch):
    monkeypatch.setattr(family, "get_profile_repo", lambda: (_ for _ in ()).throw(RuntimeError("db down")))
    assert family.notify_followers(PAT, {"systolic_bp": 190, "diastolic_bp": 125}) == 0


# --- the endpoints -----------------------------------------------------------------------------------------

@pytest.fixture
def client(monkeypatch, world):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: world.profiles)

    def as_user(uid):
        return {"Authorization": f"Bearer {create_access_token({'user_id': uid, 'role': 'patient'})}"}

    yield TestClient(app), as_user
    app.dependency_overrides.update(saved)


def test_share_and_follow_through_the_api(client, world):
    http, as_user = client
    code = http.post("/api/family/invite", headers=as_user(PAT)).json()["code"]
    res = http.post("/api/family/follow", json={"code": code}, headers=as_user(FAM))
    assert res.status_code == 200 and res.json() == {"id": PAT, "name": "Ana R."}
    assert http.get(f"/api/family/following/{PAT}/summary", headers=as_user(FAM)).json()["paused"] is False
    assert http.get(f"/api/family/following/{PAT}/summary", headers=as_user(OTHER)).status_code == 403
    assert http.delete(f"/api/family/followers/{FAM}", headers=as_user(PAT)).status_code == 200
    assert http.get(f"/api/family/following/{PAT}/summary", headers=as_user(FAM)).status_code == 403


def test_a_free_patient_is_told_sharing_is_premium(client):
    http, as_user = client
    res = http.post("/api/family/invite", headers=as_user(OTHER))
    assert res.status_code == 403 and res.json()["detail"]["code"] == "premium_required"


def test_an_emergency_save_still_answers_and_followers_hear_after(client, world, monkeypatch):
    import app.db.repositories as repos
    http, as_user = client
    code = family.create_invite(PAT)["code"]
    family.follow(FAM, code)
    world.notes.sent.clear()
    monkeypatch.setattr("app.api.health_logs.health_logs.create_health_log",
                        lambda uid, data: {"id": "log1", "logged_at": "2026-10-27T11:05:00+00:00", **data})
    monkeypatch.setattr(repos, "get_hss_repo", lambda: Rows(create_hss_record={}))
    monkeypatch.setattr(repos, "get_health_logs_repo", lambda: Rows(create_alert={}))

    res = http.post(f"/api/health-logs/{PAT}", json={"systolic_bp": 190, "diastolic_bp": 125}, headers=as_user(PAT))
    assert res.status_code == 200 and res.json()["success"] is True
    assert [n["user_id"] for n in world.notes.sent] == [FAM]

    world.notes.sent.clear()
    res = http.post(f"/api/health-logs/{PAT}", json={"systolic_bp": 128, "diastolic_bp": 82}, headers=as_user(PAT))
    assert res.status_code == 200 and world.notes.sent == []  # a normal reading tells nobody

    # even if notifying breaks, the save is answered as normal
    monkeypatch.setattr(family, "get_family_repo", lambda: (_ for _ in ()).throw(RuntimeError("db down")))
    res = http.post(f"/api/health-logs/{PAT}", json={"systolic_bp": 190, "diastolic_bp": 125}, headers=as_user(PAT))
    assert res.status_code == 200 and res.json()["success"] is True
