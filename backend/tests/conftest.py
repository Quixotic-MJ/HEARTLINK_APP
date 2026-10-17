import os
import pytest

# Set env before app code imports
os.environ["SECRET_KEY"] = "dummy-secret-key-for-testing-1234567890"
os.environ["DATABASE_MODE"] = "mock"
os.environ["ALGORITHM"] = "HS256"


class FakePendingRepo:
    """HL-046: in-memory stand-in for the pending_registrations table."""

    def __init__(self):
        self.rows = {}

    def save(self, phone, email, password_hash, expires_at):
        self.rows[phone] = {"phone": phone, "email": email, "password_hash": password_hash, "expires_at": expires_at}

    def get(self, phone):
        row = self.rows.get(phone)
        return dict(row) if row else None

    def extend(self, phone, expires_at):
        if phone in self.rows:
            self.rows[phone]["expires_at"] = expires_at

    def delete(self, phone):
        self.rows.pop(phone, None)

    def delete_expired(self):
        from app.utils.time import parse_utc, utc_now
        for phone in [p for p, r in self.rows.items() if parse_utc(r["expires_at"]) < utc_now()]:
            del self.rows[phone]


@pytest.fixture
def pending_repo():
    return FakePendingRepo()


class FakeRefreshRepo:
    """HL-047: in-memory stand-in for the refresh_tokens table."""

    def __init__(self):
        self.rows = {}

    def create(self, data):
        import uuid
        row = {"id": str(uuid.uuid4()), "revoked_at": None, "revoked_reason": None, **data}
        self.rows[row["id"]] = row
        return row

    def get_by_hash(self, token_hash):
        row = next((r for r in self.rows.values() if r["token_hash"] == token_hash), None)
        return dict(row) if row else None

    def revoke(self, token_id, reason):
        from app.utils.time import utc_now
        row = self.rows.get(token_id)
        if row and not row["revoked_at"]:
            row.update(revoked_at=utc_now().isoformat(), revoked_reason=reason)

    def revoke_all_for_user(self, user_id, reason):
        for row in [r for r in self.rows.values() if r["user_id"] == user_id]:
            self.revoke(row["id"], reason)

    def delete_expired(self):
        from app.utils.time import parse_utc, utc_now
        for rid in [i for i, r in self.rows.items() if parse_utc(r["expires_at"]) < utc_now()]:
            del self.rows[rid]


@pytest.fixture
def refresh_repo(monkeypatch):
    fake = FakeRefreshRepo()
    monkeypatch.setattr("app.services.session_service.get_refresh_token_repo", lambda: fake)
    return fake
