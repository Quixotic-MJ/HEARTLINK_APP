import pytest
from datetime import timedelta
import jwt
from fastapi import HTTPException
import os

from app.utils.security import (
    create_access_token,
    verify_token,
    revoke_token,
    load_revoked_tokens,
    revoked_token_hashes,
    _token_hash,
    SECRET_KEY,
    ALGORITHM,
)

class FakeSupabaseClient:
    def __init__(self):
        self.rows = {} # token_hash -> row

    def table(self, name):
        self.current_table = name
        return self

    def delete(self):
        return self

    def lt(self, column, value):
        self.lt_condition = (column, value)
        return self

    def select(self, columns=None):
        return self

    def upsert(self, data, on_conflict=None):
        self.upsert_data = data
        return self

    def execute(self):
        if hasattr(self, 'lt_condition'):
            # Delete logic
            col, val = self.lt_condition
            to_delete = []
            for k, row in self.rows.items():
                if row.get(col) < val:
                    to_delete.append(k)
            for k in to_delete:
                del self.rows[k]
            delattr(self, 'lt_condition')
            return self

        if hasattr(self, 'upsert_data'):
            row = self.upsert_data
            self.rows[row['token_hash']] = row
            delattr(self, 'upsert_data')
            return self

        # Select logic
        class FakeResponse:
            def __init__(self, data):
                self.data = data
        
        return FakeResponse(list(self.rows.values()))


@pytest.fixture(autouse=True)
def setup_teardown(monkeypatch):
    revoked_token_hashes.clear()
    fake_client = FakeSupabaseClient()
    monkeypatch.setattr("app.utils.security.get_supabase_client", lambda: fake_client)
    yield fake_client

def test_valid_token_passes():
    token = create_access_token({"user_id": "123"})
    payload = verify_token(token)
    assert payload["user_id"] == "123"

def test_revoke_token_denies_access():
    token = create_access_token({"user_id": "123"})
    revoke_token(token)
    
    with pytest.raises(HTTPException) as exc:
        verify_token(token)
    assert exc.value.status_code == 401
    assert "revoked" in exc.value.detail.lower()

def test_revoke_token_stores_hash(setup_teardown):
    fake_client = setup_teardown
    token = create_access_token({"user_id": "123"})
    revoke_token(token)
    
    t_hash = _token_hash(token)
    assert t_hash in fake_client.rows
    assert "token" not in fake_client.rows[t_hash] # Does not store raw token
    assert "expires_at" in fake_client.rows[t_hash]

def test_revoke_garbage_token_adds_nothing(setup_teardown):
    fake_client = setup_teardown
    token = "not.a.real.jwt"
    revoke_token(token)
    assert len(fake_client.rows) == 0
    assert len(revoked_token_hashes) == 0

def test_revoke_expired_token_adds_nothing(setup_teardown):
    fake_client = setup_teardown
    token = create_access_token({"user_id": "123"}, expires_delta=timedelta(seconds=-3600))
    revoke_token(token)
    assert len(fake_client.rows) == 0
    assert len(revoked_token_hashes) == 0

def test_load_revoked_tokens(setup_teardown):
    fake_client = setup_teardown
    
    # Pre-populate fake DB
    token_valid = create_access_token({"user_id": "456"})
    token_expired = create_access_token({"user_id": "789"}, expires_delta=timedelta(seconds=-3600))
    
    # Fake the expired token as if it was inserted previously (since revoke_token rejects expired tokens now)
    from datetime import datetime, timezone
    from app.utils.time import utc_now
    
    now_iso = datetime.now(timezone.utc).isoformat()
    past_iso = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    fake_client.rows[_token_hash(token_valid)] = {"token_hash": _token_hash(token_valid), "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()}
    fake_client.rows["expired_hash"] = {"token_hash": "expired_hash", "expires_at": past_iso}
    
    load_revoked_tokens()
    
    assert _token_hash(token_valid) in revoked_token_hashes
    assert "expired_hash" not in revoked_token_hashes
    assert "expired_hash" not in fake_client.rows # Successfully deleted

def test_restart_simulation(setup_teardown):
    fake_client = setup_teardown
    token = create_access_token({"user_id": "abc"})
    revoke_token(token)
    
    # Token is revoked
    with pytest.raises(HTTPException):
        verify_token(token)
        
    # Simulate restart
    revoked_token_hashes.clear()
    
    # Token works again (bad!)
    payload = verify_token(token)
    assert payload["user_id"] == "abc"
    
    # Call load_revoked_tokens (on startup)
    load_revoked_tokens()
    
    # Token is rejected again
    with pytest.raises(HTTPException):
        verify_token(token)
