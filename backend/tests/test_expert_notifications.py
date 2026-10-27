"""HL-082: medical experts get their own notifications (OT-07, option A)."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.db.repositories.admin import SupabaseAdminRepository
from app.services import admin_notifications as notes_service
from app.services.admin_notifications import notify_waiting_content, recipient_keys
from app.utils.time import utc_now

ADMIN, DIET, PT, CARDIO, PATIENT = (
    "aaaaaaaa-0000-0000-0000-000000000001",
    "aaaaaaaa-0000-0000-0000-000000000002",
    "aaaaaaaa-0000-0000-0000-000000000003",
    "aaaaaaaa-0000-0000-0000-000000000004",
    "aaaaaaaa-0000-0000-0000-000000000005",
)
PROFILES = {
    ADMIN: {"id": ADMIN, "role": "admin", "account_status": "active"},
    DIET: {"id": DIET, "role": "medical_expert", "expert_type": "Dietitian", "account_status": "active"},
    PT: {"id": PT, "role": "medical_expert", "expert_type": "Physical Therapist", "account_status": "active"},
    CARDIO: {"id": CARDIO, "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
    PATIENT: {"id": PATIENT, "role": "patient", "account_status": "active"},
}


class Profiles:
    def get_by_id(self, uid):
        return PROFILES.get(uid)


class Sent:
    def __init__(self):
        self.rows = []

    def create_admin_notification(self, data):
        self.rows.append(data)
        return data


@pytest.fixture
def sent(monkeypatch):
    box = Sent()
    monkeypatch.setattr(notes_service, "get_admin_repo", lambda: box)
    monkeypatch.setattr("app.services.live_events.publish", lambda *_: None)
    return box


# --- who gets told ------------------------------------------------------------------------------------------

def test_a_recipe_someone_else_saved_waits_for_the_dietitians(sent):
    notify_waiting_content("recipe", {"id": "r1", "name": "Tinola", "expert_validated": False, "status": "draft"}, None, ADMIN)
    n = sent.rows[0]
    assert n["recipient_roles"] == ["expert:Dietitian"] and n["type"] == "content" and n["route"] == "/foods"
    assert "Tinola" in n["message"] and n["actor_id"] == ADMIN


def test_an_exercise_waits_for_the_physical_therapists(sent):
    notify_waiting_content("exercise", {"id": "e1", "name": "Wall push-ups", "expert_validated": False}, None, ADMIN)
    assert sent.rows[0]["recipient_roles"] == ["expert:Physical Therapist"] and sent.rows[0]["route"] == "/exercises"


@pytest.mark.parametrize("item, approver", [
    ({"id": "r1", "name": "Tinola", "expert_validated": True}, None),  # already approved
    ({"id": "r1", "name": "Tinola", "expert_validated": False}, DIET),  # the Dietitian's own save (or send-back)
    ({"id": "r1", "name": "Tinola", "expert_validated": False, "status": "archived"}, None),  # archived: nothing to approve
    (None, None),
])
def test_no_notice_when_nothing_waits(sent, item, approver):
    notify_waiting_content("recipe", item, approver, ADMIN)
    assert sent.rows == []


def test_a_non_uuid_actor_is_left_out_but_the_notice_still_goes(sent):
    notify_waiting_content("recipe", {"id": "r1", "name": "Tinola", "expert_validated": False}, None, "admin")
    assert "actor_id" not in sent.rows[0]


def test_guidance_goes_to_dietitians_and_pts_and_replies_to_everyone_but_the_writer(sent, monkeypatch):
    from app.services import patient_notes

    class NotesRepo:
        def create(self, data):
            return {"id": "n1", "deleted_at": None, **data}

    monkeypatch.setattr(patient_notes, "get_patient_notes_repo", lambda: NotesRepo())
    monkeypatch.setattr(patient_notes, "get_profile_repo", lambda: Profiles())
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles())

    patient_notes.add_note(PATIENT, "guidance", "Keep sodium low this week.", {"user_id": CARDIO, "role": "medical_expert"})
    g = sent.rows[-1]
    assert g["recipient_roles"] == ["expert:Dietitian", "expert:Physical Therapist"]
    assert g["type"] == "notes" and g["route"] == f"/patients/{PATIENT}" and g["actor_id"] == CARDIO

    patient_notes.add_note(PATIENT, "message", "Swapped the dinner recipe.", {"user_id": DIET, "role": "medical_expert"})
    m = sent.rows[-1]
    assert m["recipient_roles"] == ["expert:Cardiologist", "expert:Dietitian", "expert:Physical Therapist"]
    assert m["actor_id"] == DIET  # other Dietitians see it; the writer doesn't (see the listing test)
    assert "Swapped" not in m["message"]  # the bell doesn't repeat the note itself


# --- who sees what ------------------------------------------------------------------------------------------

def test_recipient_keys():
    assert recipient_keys("admin", None) == {"admin"}
    assert recipient_keys("medical_expert", "Dietitian") == {"medical_expert", "expert:Dietitian"}


class Query:
    def __init__(self, rows):
        self.rows = rows

    def __getattr__(self, _):
        return lambda *a, **k: self

    def execute(self):
        return type("R", (), {"data": self.rows})()


def repo_with(rows, reads=()):
    repo = SupabaseAdminRepository.__new__(SupabaseAdminRepository)
    tables = {"admin_notifications": rows, "admin_notification_reads": [{"notification_id": r} for r in reads]}
    repo.client = type("C", (), {"table": lambda self, name: Query(tables[name])})()
    return repo


NOW = utc_now().isoformat()
ROWS = [
    {"id": "1", "recipient_roles": ["admin"], "type": "feedback", "created_at": NOW},
    {"id": "2", "recipient_roles": ["expert:Dietitian"], "type": "content", "created_at": NOW, "actor_id": ADMIN},
    {"id": "3", "recipient_roles": ["expert:Dietitian", "expert:Physical Therapist"], "type": "notes", "created_at": NOW, "actor_id": CARDIO},
    {"id": "4", "recipient_roles": ["expert:Cardiologist", "expert:Dietitian", "expert:Physical Therapist"], "type": "notes",
     "created_at": NOW, "actor_id": DIET},
    {"id": "5", "recipient_roles": ["expert:Dietitian"], "type": "content", "created_at": (utc_now() - timedelta(days=4)).isoformat()},
]


def ids(result):
    return [n["id"] for n in result["items"]]


def test_each_person_sees_only_their_own_notifications():
    repo = repo_with(ROWS, reads=["2"])
    assert ids(repo.list_admin_notifications("admin", ADMIN)) == ["1"]  # admins: as before, nothing for experts
    diet = repo.list_admin_notifications("medical_expert", DIET, expert_type="Dietitian")
    assert ids(diet) == ["2", "3"]  # not their own reply (4), not the archived one (5)
    assert diet["unread_count"] == 1
    assert ids(repo.list_admin_notifications("medical_expert", PT, expert_type="Physical Therapist")) == ["3", "4"]
    assert ids(repo.list_admin_notifications("medical_expert", CARDIO, expert_type="Cardiologist")) == ["4"]  # the reply, not their own guidance (3)
    assert ids(repo.list_admin_notifications("medical_expert", DIET, True, "Dietitian")) == ["2", "3", "5"]


def test_marking_read_only_works_on_your_own():
    repo = repo_with(ROWS)
    assert repo.mark_admin_notification_read("1", "medical_expert", DIET, "Dietitian") is False
    assert repo.mark_admin_notification_read("2", "medical_expert", DIET, "Dietitian") is True


# --- the endpoints ------------------------------------------------------------------------------------------

@pytest.fixture
def client(monkeypatch):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: Profiles())
    monkeypatch.setattr("app.api.admin_api.admin_notifications_api.get_profile_repo", lambda: Profiles())
    calls = []

    class Repo:
        def list_admin_notifications(self, role, uid, include_archived=False, expert_type=None):
            calls.append(("list", role, expert_type))
            return {"items": [], "unread_count": 0, "total": 0}

        def mark_all_admin_notifications_read(self, role, uid, expert_type=None):
            calls.append(("all", role, expert_type))
            return True

    monkeypatch.setattr("app.api.admin_api.admin_notifications_api.get_admin_repo", lambda: Repo())

    def headers(uid):
        token = create_access_token({"user_id": uid, "role": PROFILES[uid]["role"]})
        return {"Authorization": f"Bearer {token}"}

    yield TestClient(app), headers, calls
    app.dependency_overrides.update(saved)


def test_experts_can_open_their_bell(client):
    http, headers, calls = client
    assert http.get("/api/admin/notifications", headers=headers(PT)).status_code == 200
    assert http.put("/api/admin/notifications/mark-all-read", headers=headers(PT)).status_code == 200
    assert calls == [("list", "medical_expert", "Physical Therapist"), ("all", "medical_expert", "Physical Therapist")]
    assert http.get("/api/admin/notifications", headers=headers(ADMIN)).status_code == 200
    assert calls[-1] == ("list", "admin", None)


def test_patients_still_cant(client):
    http, headers, _ = client
    assert http.get("/api/admin/notifications", headers=headers(PATIENT)).status_code == 403
