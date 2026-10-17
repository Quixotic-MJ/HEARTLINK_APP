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
