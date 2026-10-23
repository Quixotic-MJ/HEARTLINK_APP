"""HL-063: no email addresses or phone numbers reach the server log."""
import io
import logging
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.log_redaction import RedactPersonalData, redact

EMAIL = "ana.santos@example.com"
PHONE = "+639171234567"


def test_emails_and_phone_numbers_are_blanked():
    line = f"login for {EMAIL} / {PHONE} / 09171234567 / 639171234567 / +14155550123"
    assert redact(line) == "login for [email] / [phone] / [phone] / [phone] / [phone]"


def test_dates_ids_and_other_numbers_are_kept():
    line = "user 11111111-2222-3333-4444-555555555555 at 2026-10-23T08:00:00Z, status 500, 120 mg, id 9171234"
    assert redact(line) == line


@pytest.fixture
def log_output():
    """Collects what a log handler with the filter would write."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.addFilter(RedactPersonalData())
    handler.setFormatter(logging.Formatter("%(message)s"))
    root = logging.getLogger()
    level = root.level
    root.setLevel(logging.INFO)
    root.addHandler(handler)
    yield stream
    root.removeHandler(handler)
    root.setLevel(level)


def test_messages_arguments_and_tracebacks_are_blanked(log_output):
    log = logging.getLogger("app.test_redaction")
    log.error(f"Duplicate key (email)=({EMAIL})")
    log.warning("Could not text %s: %s", PHONE, RuntimeError(f"bad number {PHONE}"))
    try:
        raise ValueError(f"no profile for {EMAIL}")
    except ValueError:
        log.exception("Lookup failed")

    written = log_output.getvalue()
    assert EMAIL not in written and PHONE not in written
    assert "[email]" in written and "[phone]" in written
    assert "Traceback" in written  # the traceback is still there, just without the address


def test_web_request_log_still_formats(log_output):
    # uvicorn's access log passes (client, method, path, http version, status) as separate arguments
    logging.getLogger("app.test_access").info(
        '%s - "%s %s HTTP/%s" %d', "1.2.3.4:5000", "GET", f"/api/users/lookup?email={EMAIL}", "1.1", 200
    )
    assert log_output.getvalue().strip() == '1.2.3.4:5000 - "GET /api/users/lookup?email=[email] HTTP/1.1" 200'


@patch("app.api.auth.auth.get_auth_service")
def test_a_failed_sign_in_does_not_log_the_email(mock_auth_service, log_output):
    mock_auth_service.return_value.login.side_effect = RuntimeError(f"duplicate key (email)=({EMAIL})")
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post("/api/auth/login", json={"identifier": EMAIL, "password": "wrong-password-1!"})

    assert response.status_code == 500
    written = log_output.getvalue()
    assert "Unhandled exception" in written
    assert EMAIL not in written
