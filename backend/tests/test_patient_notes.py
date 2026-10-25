"""HL-039 / HL-013 / HL-040: Cardiologist dashboard, guidance and the Dietitian / PT thread."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token, revoked_token_hashes

PATIENT_ID = "11111111-1111-1111-1111-111111111111"
OTHER_PATIENT_ID = "22222222-2222-2222-2222-222222222222"
PROFILES = {
    "diet-1": {"id": "diet-1", "role": "medical_expert", "expert_type": "Dietitian", "account_status": "active",
               "first_name": "Dana", "last_name": "Diet"},
    "pt-1": {"id": "pt-1", "role": "medical_expert", "expert_type": "Physical Therapist", "account_status": "active",
             "first_name": "Pat", "last_name": "Therapist"},
    "pt-2": {"id": "pt-2", "role": "medical_expert", "expert_type": "Physical Therapist", "account_status": "active"},
    "cardio-1": {"id": "cardio-1", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active",
                 "first_name": "Cora", "last_name": "Heart"},
    "admin-1": {"id": "admin-1", "role": "admin", "account_status": "active"},
    PATIENT_ID: {"id": PATIENT_ID, "role": "patient", "account_status": "active", "created_at": "2026-10-01T00:00:00+00:00"},
    OTHER_PATIENT_ID: {"id": OTHER_PATIENT_ID, "role": "patient", "account_status": "active", "created_at": "2026-10-02T00:00:00+00:00"},
}


class FakeProfileRepo:
    def get_by_id(self, user_id):
        return PROFILES.get(user_id)

    def list_all(self, role_filter=None, exclude_archived=True):
        return [p for p in PROFILES.values() if not role_filter or p["role"] == role_filter]


class FakeNotesRepo:
    def __init__(self):
        self.rows = {}

    def list_for_patient(self, patient_id, kinds, limit=200):
        rows = [r for r in self.rows.values() if r["patient_id"] == patient_id and r["kind"] in kinds and not r["deleted_at"]]
        return sorted(rows, key=lambda r: r["created_at"], reverse=True)[:limit]

    def list_latest_guidance(self, limit=5):
        rows = [r for r in self.rows.values() if r["kind"] == "guidance" and not r["deleted_at"]]
        return sorted(rows, key=lambda r: r["created_at"], reverse=True)[:limit]

    def get(self, note_id):
        row = self.rows.get(note_id)
        return dict(row) if row else None

    def create(self, data):
        row = {"id": str(uuid.uuid4()), "deleted_at": None, **data}
        self.rows[row["id"]] = row
        return dict(row)

    def soft_delete(self, note_id):
        row = self.rows.get(note_id)
        if not row or row["deleted_at"]:
            return False
        row["deleted_at"] = "2026-10-22T00:00:00+00:00"
        return True


class FakeHealthRepo:
    def list_all_logs(self):
        return [
            {"user_id": PATIENT_ID, "systolic_bp": 150, "diastolic_bp": 95, "heart_rate_bpm": 80, "logged_at": "2026-10-20T08:00:00+00:00"},
            # Newer, but no blood pressure: the list keeps the last real reading
            {"user_id": PATIENT_ID, "systolic_bp": None, "diastolic_bp": None, "logged_at": "2026-10-21T08:00:00+00:00"},
            {"user_id": PATIENT_ID, "systolic_bp": 120, "diastolic_bp": 80, "logged_at": "2026-10-10T08:00:00+00:00"},
            {"user_id": OTHER_PATIENT_ID, "systolic_bp": 118, "diastolic_bp": 76, "logged_at": "2026-10-21T09:00:00+00:00"},
        ]

    def list_alerts(self, user_id=None, status_filter=None):
        alerts = [
            {"user_id": OTHER_PATIENT_ID, "status": "Under Review"},
            {"user_id": OTHER_PATIENT_ID, "status": "Under Review"},
            {"user_id": PATIENT_ID, "status": "Resolved"},
        ]
        return [a for a in alerts if (not user_id or a["user_id"] == user_id) and (not status_filter or a["status"] == status_filter)]

    def list_user_logs(self, user_id, limit=None):
        return [
            {"id": "h1", "systolic_bp": 150, "diastolic_bp": 95, "logged_at": "2026-10-20T08:00:00+00:00"},
            {"id": "h2", "context": "symptom_lock_cleared", "logged_at": "2026-10-20T09:00:00+00:00"},
        ]


class FakeHssRepo:
    def list_all_hss_records(self):
        return [
            {"user_id": PATIENT_ID, "score": 62, "tier": "Moderate", "computed_at": "2026-10-20T08:00:00+00:00"},
            {"user_id": PATIENT_ID, "score": 80, "tier": "Stable", "computed_at": "2026-10-01T08:00:00+00:00"},
        ]

    def list_hss_history(self, user_id, limit=None):
        return [{"score": 62, "tier": "Moderate", "computed_at": "2026-10-20T08:00:00+00:00"}]


class FakeLogsRepo:
    def __init__(self, rows):
        self.rows = rows

    def list_user_logs(self, user_id, limit=None):
        return self.rows

    def list_user_meals(self, user_id, limit=None):
        return self.rows


@pytest.fixture(autouse=True)
def notes_repo(monkeypatch):
    revoked_token_hashes.clear()
    fake = FakeNotesRepo()
    profiles = FakeProfileRepo()
    monkeypatch.setattr("app.utils.security.get_profile_repo", lambda: profiles)
    monkeypatch.setattr("app.services.patient_notes.get_profile_repo", lambda: profiles)
    monkeypatch.setattr("app.services.patient_notes.get_patient_notes_repo", lambda: fake)
    monkeypatch.setattr("app.services.patient_overview.get_profile_repo", lambda: profiles)
    monkeypatch.setattr("app.services.patient_overview.get_health_logs_repo", lambda: FakeHealthRepo())
    monkeypatch.setattr("app.services.patient_overview.get_hss_repo", lambda: FakeHssRepo())
    monkeypatch.setattr("app.services.patient_overview.get_meals_repo", lambda: FakeLogsRepo([{"meal_name": "Tinola"}]))
    monkeypatch.setattr("app.services.patient_overview.get_exercises_repo", lambda: FakeLogsRepo([{"routine_name": "Walk"}]))
    monkeypatch.setattr("app.services.patient_overview.get_sleep_repo",
                        lambda: FakeLogsRepo([{"duration_hours": 7}, {"duration_hours": 3, "is_deleted": True}]))
    monkeypatch.setattr("app.api.admin_api.patient_care_api.record_admin_activity", lambda **k: None)
    # Other test modules install app-wide dependency overrides at import time; use the real guards here.
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield fake
    app.dependency_overrides.update(saved)
    revoked_token_hashes.clear()


def _call(method, path, user_id, **kwargs):
    token = create_access_token({"user_id": user_id, "role": PROFILES[user_id]["role"]})
    client = TestClient(app, base_url="https://testserver")
    return client.request(method, path, headers={"Authorization": f"Bearer {token}"}, **kwargs)


NOTES = f"/api/admin/patients/{PATIENT_ID}/notes"


def _post(user_id, kind, body="Keep sodium under 1,500 mg; walking is fine, no heavy lifting."):
    return _call("POST", NOTES, user_id, json={"kind": kind, "body": body})


# --- Who may post what ---------------------------------------------------------------------------

@pytest.mark.parametrize("user_id, kind, expected", [
    ("cardio-1", "guidance", 200),
    ("diet-1", "guidance", 403),
    ("pt-1", "guidance", 403),
    ("cardio-1", "message", 403),
    ("diet-1", "message", 200),
    ("pt-1", "message", 200),
    # Admins read everything but don't sign notes
    ("admin-1", "guidance", 403),
    ("admin-1", "message", 403),
])
def test_who_can_post_each_kind(user_id, kind, expected):
    assert _post(user_id, kind).status_code == expected


def test_patients_cannot_use_the_notes_api():
    assert _call("GET", NOTES, PATIENT_ID).status_code == 403
    assert _post(PATIENT_ID, "message").status_code == 403


def test_a_note_is_attributed_and_timestamped():
    res = _post("diet-1", "message", "  Swapped her breakfast to oats.  ")
    note = res.json()
    assert note["body"] == "Swapped her breakfast to oats."
    assert note["author_name"] == "Dana Diet"
    assert note["author_expert_type"] == "Dietitian"
    assert note["kind"] == "message" and note["created_at"] and note["is_mine"] is True


@pytest.mark.parametrize("payload", [
    {"kind": "message", "body": "   "},
    {"kind": "message"},
    {"kind": "message", "body": "x" * 4001},
    {"kind": "diagnosis", "body": "Hello"},
])
def test_bad_notes_are_refused(payload):
    assert _call("POST", NOTES, "diet-1", json=payload).status_code == 400


def test_notes_on_someone_who_is_not_a_patient_are_refused():
    assert _call("POST", "/api/admin/patients/diet-1/notes", "cardio-1", json={"kind": "guidance", "body": "Hi"}).status_code == 404
    assert _call("GET", "/api/admin/patients/nobody/notes", "cardio-1").status_code == 404


# --- Who may read --------------------------------------------------------------------------------

@pytest.mark.parametrize("user_id", ["cardio-1", "diet-1", "pt-1", "admin-1"])
def test_every_expert_and_admin_reads_guidance_and_messages(user_id):
    _post("cardio-1", "guidance")
    _post("pt-1", "message", "Started her on the 10-minute walk.")
    res = _call("GET", NOTES, user_id)
    assert res.status_code == 200
    body = res.json()
    assert [n["author_expert_type"] for n in body["guidance"]] == ["Cardiologist"]
    assert [n["author_expert_type"] for n in body["messages"]] == ["Physical Therapist"]


def test_notes_stay_on_their_own_patient():
    _post("cardio-1", "guidance")
    body = _call("GET", f"/api/admin/patients/{OTHER_PATIENT_ID}/notes", "diet-1").json()
    assert body == {"guidance": [], "messages": []}


def test_an_expert_with_no_type_reads_nothing():
    PROFILES["odd-1"] = {"id": "odd-1", "role": "medical_expert", "expert_type": None, "account_status": "active"}
    try:
        assert _call("GET", NOTES, "odd-1").status_code == 403
        assert _call("GET", "/api/admin/patients", "odd-1").status_code == 403
    finally:
        del PROFILES["odd-1"]


def test_latest_guidance_for_the_approval_panels_has_no_messages():
    _post("cardio-1", "guidance", "First")
    _post("diet-1", "message", "Not guidance")
    res = _call("GET", "/api/admin/patients/guidance/latest?limit=3", "pt-1")
    assert res.status_code == 200
    assert [n["body"] for n in res.json()] == ["First"]
    assert res.json()[0]["patient_id"] == PATIENT_ID


# --- Removing notes ------------------------------------------------------------------------------

def test_only_the_author_removes_a_note_and_it_is_kept_as_deleted(notes_repo):
    note_id = _post("pt-1", "message").json()["id"]
    assert _call("DELETE", f"{NOTES}/{note_id}", "pt-2").status_code == 403
    assert _call("DELETE", f"{NOTES}/{note_id}", "diet-1").status_code == 403
    assert _call("DELETE", f"{NOTES}/{note_id}", "admin-1").status_code == 403

    assert _call("DELETE", f"{NOTES}/{note_id}", "pt-1").status_code == 200
    assert notes_repo.rows[note_id]["deleted_at"]  # soft delete: the row is still there
    assert _call("GET", NOTES, "diet-1").json()["messages"] == []
    assert _call("DELETE", f"{NOTES}/{note_id}", "pt-1").status_code == 404


def test_a_note_cannot_be_removed_through_another_patient():
    note_id = _post("cardio-1", "guidance").json()["id"]
    assert _call("DELETE", f"/api/admin/patients/{OTHER_PATIENT_ID}/notes/{note_id}", "cardio-1").status_code == 404


# --- Cardiologist dashboard ----------------------------------------------------------------------

def test_patient_list_shows_latest_bp_score_and_open_alerts():
    res = _call("GET", "/api/admin/patients", "cardio-1")
    assert res.status_code == 200
    items = {p["id"]: p for p in res.json()}
    assert set(items) == {PATIENT_ID, OTHER_PATIENT_ID}

    first = items[PATIENT_ID]
    assert (first["latest_bp"]["systolic"], first["latest_bp"]["diastolic"]) == (150, 95)
    assert (first["score"], first["tier"]) == (62, "Moderate")
    assert first["open_alerts"] == 0  # resolved alerts don't count

    other = items[OTHER_PATIENT_ID]
    assert other["open_alerts"] == 2 and other["score"] is None
    # Patients with open alerts come first
    assert res.json()[0]["id"] == OTHER_PATIENT_ID


@pytest.mark.parametrize("user_id", ["cardio-1", "diet-1", "pt-1", "admin-1"])
def test_staff_who_read_vitals_can_open_the_patient_list(user_id):
    assert _call("GET", "/api/admin/patients", user_id).status_code == 200


def test_patient_list_is_closed_to_patients():
    assert _call("GET", "/api/admin/patients", PATIENT_ID).status_code == 403


@pytest.mark.parametrize("user_id, sections", [
    ("cardio-1", {"health", "sleep", "scores", "alerts", "meals", "exercise"}),
    ("admin-1", {"health", "sleep", "scores", "alerts", "meals", "exercise"}),
    ("diet-1", {"health", "sleep", "scores", "alerts", "meals"}),
    ("pt-1", {"health", "sleep", "scores", "alerts", "exercise"}),
])
def test_patient_logs_follow_the_expert_type(user_id, sections):
    res = _call("GET", f"/api/admin/patients/{PATIENT_ID}/logs", user_id)
    assert res.status_code == 200
    body = res.json()
    assert set(body["sections"]) == sections
    for section in {"meals", "exercise"} - sections:
        assert section not in body


def test_cardiologist_logs_skip_deleted_sleep_and_check_in_resets():
    body = _call("GET", f"/api/admin/patients/{PATIENT_ID}/logs", "cardio-1").json()
    assert [s["duration_hours"] for s in body["sleep"]] == [7]
    assert [h["id"] for h in body["health"]] == ["h1"]
    assert body["meals"] == [{"meal_name": "Tinola"}] and body["exercise"] == [{"routine_name": "Walk"}]
    assert body["scores"][0]["score"] == 62


def test_patient_logs_for_unknown_patient_are_404():
    assert _call("GET", "/api/admin/patients/diet-1/logs", "cardio-1").status_code == 404
