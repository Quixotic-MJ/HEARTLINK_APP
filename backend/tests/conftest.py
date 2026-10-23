import os
import pytest

# Set env before app code imports
os.environ["SECRET_KEY"] = "dummy-secret-key-for-testing-1234567890"
os.environ["DATABASE_MODE"] = "mock"
os.environ["ALGORITHM"] = "HS256"
# HL-019: tests never start the hourly notification archive job (it writes to the database).
os.environ["NOTIFICATION_ARCHIVE_JOB"] = "off"


SMTP_ENV_VARS = ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM")


@pytest.fixture(autouse=True)
def no_real_email(monkeypatch):
    """HL-052: a local .env may hold real SMTP settings; tests never send email unless they set it up."""
    for name in SMTP_ENV_VARS:
        monkeypatch.delenv(name, raising=False)


class FakePendingRepo:
    """HL-046: in-memory stand-in for the pending_registrations table."""

    def __init__(self):
        self.rows = {}

    def save(self, phone, email, password_hash, expires_at, code_hash):
        self.rows[phone] = {
            "phone": phone, "email": email, "password_hash": password_hash,
            "code_hash": code_hash, "attempts": 0, "expires_at": expires_at,
        }

    def get(self, phone):
        row = self.rows.get(phone)
        return dict(row) if row else None

    def replace_code(self, phone, code_hash, expires_at):
        if phone in self.rows:
            self.rows[phone].update(code_hash=code_hash, attempts=0, expires_at=expires_at)

    def claim_attempt(self, phone, seen_attempts):
        row = self.rows.get(phone)
        if not row or row["attempts"] != seen_attempts:
            return False
        row["attempts"] = seen_attempts + 1
        return True

    def consume_code(self, phone, code_hash):
        row = self.rows.get(phone)
        if not row or row["code_hash"] != code_hash:
            return False
        row["code_hash"] = None
        return True

    def restore_code(self, phone, code_hash):
        row = self.rows.get(phone)
        if row and row["code_hash"] is None:
            row["code_hash"] = code_hash

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


@pytest.fixture(autouse=True)
def no_real_push(monkeypatch):
    """HL-018: saving a patient notification sends a push in the background; tests never reach Expo or the
    push_tokens table. test_push.py checks the real sending code directly."""
    monkeypatch.setattr("app.services.push.send_push", lambda *a, **k: None)
