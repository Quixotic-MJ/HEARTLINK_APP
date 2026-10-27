"""HL-084: HeartLink Premium: status, trial, demo checkout, admin controls and the Premium gate."""
from datetime import timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.services import premium
from app.utils.time import parse_utc, utc_now


class Profiles:
    def __init__(self, rows):
        self.rows = {r["id"]: dict(r) for r in rows}

    def get_by_id(self, uid):
        row = self.rows.get(uid)
        return dict(row) if row else None

    def update(self, uid, data):
        self.rows[uid].update(data)
        return dict(self.rows[uid])

    update_profile = update

    def list_all(self, role_filter=None, exclude_archived=True):
        return [dict(r) for r in self.rows.values() if not role_filter or r.get("role") == role_filter]


class PremiumStore:
    def __init__(self):
        self.config = {"monthly_price_php": 99, "yearly_price_php": 899, "trial_days": 7, "checkout_enabled": True}
        self.events = []

    def get_config(self):
        return dict(self.config)

    def update_config(self, data):
        self.config.update({k: v for k, v in data.items() if k in self.config})
        return dict(self.config)

    def add_event(self, event):
        self.events.insert(0, {"created_at": utc_now().isoformat(), **event})

    def list_events(self, limit=50):
        return self.events[:limit]


@pytest.fixture
def repos(monkeypatch):
    profiles = Profiles([
        {"id": "pat", "role": "patient", "first_name": "Ana", "last_name": "Cruz", "account_status": "active", "plan": "free"},
        {"id": "pat2", "role": "patient", "first_name": "Ben", "account_status": "active", "plan": "free"},
        {"id": "boss", "role": "admin", "first_name": "Ada", "account_status": "active"},
        {"id": "doc", "role": "medical_expert", "expert_type": "Cardiologist", "account_status": "active"},
    ])
    store = PremiumStore()
    for target in ("app.services.premium", "app.utils.security", "app.api.premium_api", "app.api.admin_api.admin_premium_api"):
        monkeypatch.setattr(f"{target}.get_profile_repo", lambda: profiles, raising=False)
    monkeypatch.setattr("app.services.premium.get_premium_repo", lambda: store)
    monkeypatch.setattr("app.api.admin_api.admin_premium_api.record_admin_activity", lambda **k: None)
    return profiles, store


@pytest.fixture
def client(repos):
    from app.main import app
    from app.utils.security import create_access_token, revoked_token_hashes
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    revoked_token_hashes.clear()
    as_user = lambda uid, role: {"Authorization": f"Bearer {create_access_token({'user_id': uid, 'role': role})}"}
    yield TestClient(app), as_user
    app.dependency_overrides.update(saved)


def days_until(row):
    return (parse_utc(row["premium_until"]) - utc_now()).days


# --- who counts as Premium ------------------------------------------------------------------------------

@pytest.mark.parametrize("profile, expected", [
    ({"plan": "premium", "premium_until": (utc_now() + timedelta(days=1)).isoformat()}, True),
    ({"plan": "premium", "premium_until": (utc_now() - timedelta(minutes=1)).isoformat()}, False),  # ended
    ({"plan": "premium", "premium_until": None}, False),
    ({"plan": "free", "premium_until": (utc_now() + timedelta(days=9)).isoformat()}, False),
    (None, False),
])
def test_premium_counts_only_until_the_end_date(profile, expected):
    assert premium.is_premium(profile) is expected


# --- patient side ---------------------------------------------------------------------------------------

def test_a_new_patient_sees_free_with_a_trial_and_the_prices(client):
    http, as_user = client
    body = http.get("/api/premium", headers=as_user("pat", "patient")).json()
    assert body["is_premium"] is False and body["trial_available"] is True
    assert (body["monthly_price_php"], body["yearly_price_php"], body["trial_days"]) == (99, 899, 7)
    assert body["test_mode"] is True


def test_the_trial_works_once(client, repos):
    http, as_user = client
    profiles, store = repos
    first = http.post("/api/premium/trial", headers=as_user("pat", "patient"))
    assert first.status_code == 200 and first.json()["is_premium"] is True
    assert 6 <= days_until(profiles.rows["pat"]) <= 7
    assert store.events[0]["kind"] == "trial_started"
    assert http.post("/api/premium/trial", headers=as_user("pat", "patient")).status_code == 409

    # Even after it ends, the trial isn't offered again
    profiles.rows["pat"]["premium_until"] = (utc_now() - timedelta(days=1)).isoformat()
    body = http.get("/api/premium", headers=as_user("pat", "patient")).json()
    assert body["is_premium"] is False and body["trial_available"] is False


@pytest.mark.parametrize("period, days, amount", [("monthly", 30, 99), ("yearly", 365, 899)])
def test_demo_checkout_sets_the_period_and_records_the_amount(client, repos, period, days, amount):
    http, as_user = client
    profiles, store = repos
    res = http.post("/api/premium/checkout", json={"period": period, "method": "gcash"}, headers=as_user("pat", "patient"))
    assert res.status_code == 200 and res.json()["is_premium"] is True
    assert days - 1 <= days_until(profiles.rows["pat"]) <= days
    assert profiles.rows["pat"]["premium_source"] == "checkout"
    assert store.events[0]["amount_php"] == amount and store.events[0]["method"] == "gcash"


def test_paying_early_adds_to_the_time_left(client, repos):
    http, as_user = client
    profiles, _ = repos
    http.post("/api/premium/trial", headers=as_user("pat", "patient"))
    http.post("/api/premium/checkout", json={"period": "monthly", "method": "card"}, headers=as_user("pat", "patient"))
    assert 36 <= days_until(profiles.rows["pat"]) <= 37  # 7-day trial + 30 days


def test_checkout_takes_no_payment_details_and_rejects_unknown_choices(client):
    http, as_user = client
    headers = as_user("pat", "patient")
    assert http.post("/api/premium/checkout", json={"period": "weekly", "method": "gcash"}, headers=headers).status_code == 422
    assert http.post("/api/premium/checkout", json={"period": "monthly", "method": "paypal"}, headers=headers).status_code == 422


def test_checkout_can_be_paused_by_admins(client, repos):
    http, as_user = client
    repos[1].config["checkout_enabled"] = False
    res = http.post("/api/premium/checkout", json={"period": "monthly", "method": "card"}, headers=as_user("pat", "patient"))
    assert res.status_code == 409


def test_paused_sign_ups_also_stop_the_trial(client, repos):
    http, as_user = client
    profiles, store = repos
    store.config["checkout_enabled"] = False
    assert http.get("/api/premium", headers=as_user("pat", "patient")).json()["trial_available"] is False
    res = http.post("/api/premium/trial", headers=as_user("pat", "patient"))
    assert res.status_code == 409 and "paused" in res.json()["detail"]
    assert profiles.rows["pat"]["plan"] == "free" and not profiles.rows["pat"].get("trial_used_at")
    assert store.events == []

    # Opening sign-ups again offers the trial, which was never used
    store.config["checkout_enabled"] = True
    assert http.post("/api/premium/trial", headers=as_user("pat", "patient")).status_code == 200


def test_staff_cannot_buy_premium(client):
    http, as_user = client
    res = http.post("/api/premium/checkout", json={"period": "monthly", "method": "card"}, headers=as_user("boss", "admin"))
    assert res.status_code == 404


def test_premium_needs_sign_in(client):
    http, _ = client
    assert http.get("/api/premium").status_code in (401, 403)


# --- the gate for Premium features ------------------------------------------------------------------------

def test_require_premium_refuses_free_patients_with_a_code(repos):
    with pytest.raises(HTTPException) as exc:
        premium.require_premium({"user_id": "pat", "role": "patient"})
    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "premium_required"


def test_require_premium_lets_premium_patients_in(repos):
    repos[0].rows["pat"].update(plan="premium", premium_until=(utc_now() + timedelta(days=3)).isoformat())
    assert premium.require_premium({"user_id": "pat", "role": "patient"})["user_id"] == "pat"


# --- admin side -----------------------------------------------------------------------------------------

def test_an_admin_gives_and_removes_premium(client, repos):
    http, as_user = client
    profiles, store = repos
    res = http.put("/api/admin/users/pat/plan", json={"premium": True, "days": 365}, headers=as_user("boss", "admin"))
    assert res.status_code == 200 and res.json()["is_premium"] is True
    assert profiles.rows["pat"]["premium_source"] == "admin" and store.events[0]["actor_id"] == "boss"

    res = http.put("/api/admin/users/pat/plan", json={"premium": False}, headers=as_user("boss", "admin"))
    assert res.json()["is_premium"] is False
    assert profiles.rows["pat"]["plan"] == "free" and profiles.rows["pat"]["premium_until"] is None


@pytest.mark.parametrize("body", [{"premium": True}, {"premium": True, "days": 0}, {"premium": True, "days": 5000}])
def test_giving_premium_needs_a_sensible_number_of_days(client, body):
    http, as_user = client
    assert http.put("/api/admin/users/pat/plan", json=body, headers=as_user("boss", "admin")).status_code == 400


def test_premium_is_for_patients_only(client):
    http, as_user = client
    res = http.put("/api/admin/users/doc/plan", json={"premium": True, "days": 30}, headers=as_user("boss", "admin"))
    assert res.status_code == 404


def test_experts_and_patients_cannot_use_admin_premium_routes(client):
    http, as_user = client
    assert http.get("/api/admin/premium", headers=as_user("doc", "medical_expert")).status_code == 403
    assert http.put("/api/admin/users/pat/plan", json={"premium": True, "days": 30},
                    headers=as_user("pat", "patient")).status_code == 403


def test_admins_edit_the_plan_settings(client, repos):
    http, as_user = client
    res = http.put("/api/admin/premium/config", json={"monthly_price_php": 149, "trial_days": 14, "checkout_enabled": False},
                   headers=as_user("boss", "admin"))
    assert res.status_code == 200
    assert res.json() == {"monthly_price_php": 149, "yearly_price_php": 899, "trial_days": 14, "checkout_enabled": False}
    body = http.get("/api/premium", headers=as_user("pat", "patient")).json()
    assert body["monthly_price_php"] == 149 and body["checkout_enabled"] is False


@pytest.mark.parametrize("body", [{}, {"monthly_price_php": -1}, {"trial_days": 91}, {"yearly_price_php": "899"},
                                  {"checkout_enabled": "yes"}])
def test_plan_settings_are_checked(client, body):
    http, as_user = client
    assert http.put("/api/admin/premium/config", json=body, headers=as_user("boss", "admin")).status_code == 400


def test_the_overview_counts_members_and_lists_changes_with_names(client):
    http, as_user = client
    http.post("/api/premium/trial", headers=as_user("pat", "patient"))
    http.put("/api/admin/users/pat2/plan", json={"premium": True, "days": 30}, headers=as_user("boss", "admin"))
    body = http.get("/api/admin/premium", headers=as_user("boss", "admin")).json()
    assert (body["patients"], body["premium_members"], body["on_trial"], body["by_admin"]) == (2, 2, 1, 1)
    assert body["events"][0]["user_name"] == "Ben" and body["events"][0]["actor_name"] == "Ada"
    assert body["events"][1]["user_name"] == "Ana Cruz" and body["events"][1]["actor_name"] is None
