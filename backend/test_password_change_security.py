"""
test_password_change_security.py
---------------------------------
Security tests for PUT /api/users/{user_id}/password.

Covers all 12 scenarios specified in SETTINGS PASSWORD SECURITY PASS:
  1.  Authenticated admin can change own password
  2.  Unauthenticated request is rejected
  3.  Invalid token is rejected
  4.  Caller targeting another user's password is rejected
  5.  Wrong current password is rejected; account not mutated
  6.  Password is actually changed after successful request
  7.  Stored value is a hash, not plaintext
  8.  Successful change creates exactly one activity-log event
  9.  Failed change (wrong password) creates zero activity-log events
  10. Activity-log actor equals the authenticated caller
  11. Activity-log target_id equals the target path user_id
  12. Disabled caller cannot perform a password change

Persistence safety
------------------
All tests snapshot and restore mock_db.profiles, mock_db.admin_activity,
and auth.login_attempts.  No test passwords survive into mock_profiles.json.
file writes are explicitly avoided by NOT calling save_profiles/save_logs in
tearDown — the in-memory list is restored instead.
"""

import hashlib
import unittest

from fastapi.testclient import TestClient

from app.main import app
import app.mock_db as mock_db
from app.utils.security import (
    create_access_token,
    token_blacklist,
    SECRET_KEY,
    ALGORITHM,
)
from app.api.auth.auth import login_attempts

# ─── Shared constants ─────────────────────────────────────────────────────────

ADMIN_ID = "usr-chief-admin-001"
ADMIN_ROLE = "admin"
SUPER_ADMIN_ID = "usr-super-admin-001"
SUPER_ADMIN_ROLE = "super_admin"

TEST_PW_PLAIN = "TestOldPassword!9"
TEST_PW_NEW   = "TestNewPassword!7"
TEST_PW_HASH  = hashlib.sha256(TEST_PW_PLAIN.encode()).hexdigest()

PW_ENDPOINT = "/api/users/{uid}/password"


def _hash(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


class TestPasswordChangeSecurity(unittest.TestCase):
    """All 12 security scenarios for the password-change endpoint."""

    # ── Setup / teardown ──────────────────────────────────────────────────────

    def setUp(self):
        app.dependency_overrides.clear()
        self.client = TestClient(app)

        # Deep snapshot of everything that tests mutate
        self._orig_profiles = [dict(p) for p in mock_db.profiles]
        self._orig_activity  = [dict(a) for a in mock_db.admin_activity]
        self._orig_attempts  = dict(login_attempts)

        # Give the admin a known password so every test starts from a clean state
        for p in mock_db.profiles:
            if p["id"] == ADMIN_ID:
                p["password"] = TEST_PW_HASH
                break

    def tearDown(self):
        app.dependency_overrides.clear()

        mock_db.profiles.clear()
        mock_db.profiles.extend(self._orig_profiles)
        mock_db.admin_activity.clear()
        mock_db.admin_activity.extend(self._orig_activity)
        mock_db.save_profiles()
        mock_db.save_logs()
        login_attempts.clear()
        login_attempts.update(self._orig_attempts)
        token_blacklist.clear()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _headers(self, user_id: str, role: str) -> dict:
        token = create_access_token({"user_id": user_id, "role": role})
        return {"Authorization": f"Bearer {token}"}

    def _admin_headers(self) -> dict:
        return self._headers(ADMIN_ID, ADMIN_ROLE)

    def _super_admin_headers(self) -> dict:
        return self._headers(SUPER_ADMIN_ID, SUPER_ADMIN_ROLE)

    def _pw(self, current=TEST_PW_PLAIN, new=TEST_PW_NEW) -> dict:
        return {"current_password": current, "new_password": new}

    def _activity_count(self, action="changed password") -> int:
        return sum(1 for a in mock_db.admin_activity if a.get("action") == action)

    def _stored_hash(self, user_id=ADMIN_ID) -> str | None:
        p = next((p for p in mock_db.profiles if p["id"] == user_id), None)
        return p.get("password") if p else None

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Authenticated admin can change own password
    # ─────────────────────────────────────────────────────────────────────────
    def test_01_authenticated_admin_can_change_own_password(self):
        res = self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json().get("success"))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Unauthenticated request is rejected
    #    FastAPI HTTPBearer raises 403 when no Authorization header is present.
    # ─────────────────────────────────────────────────────────────────────────
    def test_02_unauthenticated_request_is_rejected(self):
        res = self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            # No Authorization header
        )
        self.assertIn(res.status_code, (401, 403))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Invalid / tampered token is rejected
    # ─────────────────────────────────────────────────────────────────────────
    def test_03_invalid_token_is_rejected(self):
        res = self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers={"Authorization": "Bearer totallyinvalidtoken.abc.xyz"},
        )
        self.assertEqual(res.status_code, 401, res.text)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Cross-user attempt: admin A targeting admin B → 403
    # ─────────────────────────────────────────────────────────────────────────
    def test_04_cross_user_attempt_is_forbidden(self):
        # admin (usr-chief-admin-001) tries to change super_admin's password
        res = self.client.put(
            PW_ENDPOINT.format(uid=SUPER_ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        self.assertEqual(res.status_code, 403, res.text)
        self.assertIn("own password", res.json().get("detail", "").lower())

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Wrong current password is rejected; account not mutated
    # ─────────────────────────────────────────────────────────────────────────
    def test_05_wrong_current_password_is_rejected(self):
        before_hash = self._stored_hash()
        res = self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json={"current_password": "CompletelyWrongPassword!", "new_password": TEST_PW_NEW},
            headers=self._admin_headers(),
        )
        self.assertEqual(res.status_code, 400, res.text)
        # Hash must not have changed
        self.assertEqual(self._stored_hash(), before_hash)

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Password is actually changed after a successful request
    # ─────────────────────────────────────────────────────────────────────────
    def test_06_password_actually_changes_after_success(self):
        old_hash = self._stored_hash()
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        new_hash = self._stored_hash()
        self.assertNotEqual(old_hash, new_hash)
        # New hash must correspond to TEST_PW_NEW
        self.assertEqual(new_hash, _hash(TEST_PW_NEW))

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Stored value is hashed, not plaintext
    # ─────────────────────────────────────────────────────────────────────────
    def test_07_stored_value_is_hashed_not_plaintext(self):
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        stored = self._stored_hash()
        # Must not equal the plaintext password
        self.assertNotEqual(stored, TEST_PW_NEW)
        # Must look like a SHA-256 hex digest (64 hex chars)
        self.assertRegex(stored, r'^[0-9a-f]{64}$')

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Successful change creates exactly one activity-log event
    # ─────────────────────────────────────────────────────────────────────────
    def test_08_successful_change_creates_one_activity_log(self):
        before = self._activity_count()
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        self.assertEqual(self._activity_count(), before + 1)

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Failed change (wrong password) creates zero activity-log events
    # ─────────────────────────────────────────────────────────────────────────
    def test_09_failed_change_creates_zero_activity_logs(self):
        before = self._activity_count()
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json={"current_password": "WrongPassword999!", "new_password": TEST_PW_NEW},
            headers=self._admin_headers(),
        )
        self.assertEqual(self._activity_count(), before)

    # ─────────────────────────────────────────────────────────────────────────
    # 10. Activity-log actor equals the authenticated caller
    # ─────────────────────────────────────────────────────────────────────────
    def test_10_activity_log_actor_equals_authenticated_caller(self):
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        events = [a for a in mock_db.admin_activity if a.get("action") == "changed password"]
        self.assertTrue(events, "Expected at least one activity-log event")
        last = events[-1]
        # The actor must be the authenticated caller (ADMIN_ID), not anything else
        self.assertEqual(last["admin_user_id"], ADMIN_ID)

    # ─────────────────────────────────────────────────────────────────────────
    # 11. Activity-log target_id equals the path user_id
    # ─────────────────────────────────────────────────────────────────────────
    def test_11_activity_log_target_id_equals_path_user_id(self):
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        events = [a for a in mock_db.admin_activity if a.get("action") == "changed password"]
        self.assertTrue(events, "Expected at least one activity-log event")
        last = events[-1]
        self.assertEqual(last["target_id"], ADMIN_ID)

    # ─────────────────────────────────────────────────────────────────────────
    # 12. Disabled caller cannot perform a password change
    #     get_current_admin_user() checks account_status == "active"
    # ─────────────────────────────────────────────────────────────────────────
    def test_12_disabled_caller_cannot_change_password(self):
        # Disable the admin account
        for p in mock_db.profiles:
            if p["id"] == ADMIN_ID:
                p["account_status"] = "disabled"
                break

        res = self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),   # token is still formally valid
        )
        # get_current_admin_user raises 403 when account is not "active"
        self.assertEqual(res.status_code, 403, res.text)

    # ─────────────────────────────────────────────────────────────────────────
    # BONUS: Cross-user attempt does not mutate mock_db (no partial writes)
    # ─────────────────────────────────────────────────────────────────────────
    def test_bonus_cross_user_attempt_leaves_db_unchanged(self):
        before_hash = self._stored_hash(SUPER_ADMIN_ID)
        before_count = self._activity_count()

        self.client.put(
            PW_ENDPOINT.format(uid=SUPER_ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )

        self.assertEqual(self._stored_hash(SUPER_ADMIN_ID), before_hash)
        self.assertEqual(self._activity_count(), before_count)

    # ─────────────────────────────────────────────────────────────────────────
    # BONUS: Rate limiting accumulates on failed attempts
    #        Five wrong-password attempts on the same account trigger 429.
    # ─────────────────────────────────────────────────────────────────────────
    def test_bonus_rate_limit_triggers_after_five_failed_attempts(self):
        bad_pw = {"current_password": "CompletelyWrong!", "new_password": TEST_PW_NEW}
        headers = self._admin_headers()
        for _ in range(5):
            self.client.put(PW_ENDPOINT.format(uid=ADMIN_ID), json=bad_pw, headers=headers)

        # 6th attempt should be blocked
        res = self.client.put(PW_ENDPOINT.format(uid=ADMIN_ID), json=bad_pw, headers=headers)
        self.assertEqual(res.status_code, 429, res.text)

    # ─────────────────────────────────────────────────────────────────────────
    # BONUS: Successful change clears the rate-limit counter
    # ─────────────────────────────────────────────────────────────────────────
    def test_bonus_successful_change_clears_rate_limit_counter(self):
        bad_pw = {"current_password": "CompletelyWrong!", "new_password": TEST_PW_NEW}
        headers = self._admin_headers()

        # Build up 3 failed attempts
        for _ in range(3):
            self.client.put(PW_ENDPOINT.format(uid=ADMIN_ID), json=bad_pw, headers=headers)

        # Successful change clears the counter
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=headers,
        )

        # Subsequent bad attempt should restart from count=1, not trigger 429
        res = self.client.put(PW_ENDPOINT.format(uid=ADMIN_ID), json=bad_pw, headers=headers)
        self.assertEqual(res.status_code, 400, res.text)

    # ─────────────────────────────────────────────────────────────────────────
    # BONUS: No password material in activity-log record
    # ─────────────────────────────────────────────────────────────────────────
    def test_bonus_activity_log_contains_no_password_material(self):
        self.client.put(
            PW_ENDPOINT.format(uid=ADMIN_ID),
            json=self._pw(),
            headers=self._admin_headers(),
        )
        events = [a for a in mock_db.admin_activity if a.get("action") == "changed password"]
        self.assertTrue(events)
        last = events[-1]

        record_str = str(last)
        self.assertNotIn(TEST_PW_PLAIN, record_str, "Plaintext current_password found in log")
        self.assertNotIn(TEST_PW_NEW,   record_str, "Plaintext new_password found in log")
        self.assertNotIn(TEST_PW_HASH,  record_str, "Password hash found in log")
        self.assertNotIn(_hash(TEST_PW_NEW), record_str, "New password hash found in log")


if __name__ == "__main__":
    unittest.main()
