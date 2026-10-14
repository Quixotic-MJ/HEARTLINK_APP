"""HL-049: startup reports missing settings by name only and prints nothing else."""
import asyncio
import logging

import pytest

from app import main

SECRET_VALUE = "super-secret-value-that-must-not-appear"


@pytest.fixture
def quiet_startup(monkeypatch):
    def broken_client():
        raise RuntimeError(f"cannot connect with key {SECRET_VALUE}")

    monkeypatch.setattr("app.db.client.get_supabase_client", broken_client)
    monkeypatch.setattr("app.db.bootstrap.bootstrap_supabase_content", lambda: None)
    monkeypatch.setattr("app.utils.security.load_revoked_tokens", lambda: None)


def test_startup_names_missing_settings_without_values(monkeypatch, caplog, capsys, quiet_startup):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", SECRET_VALUE)
    monkeypatch.setenv("SECRET_KEY", SECRET_VALUE)

    with caplog.at_level(logging.INFO, logger="app.main"):
        asyncio.run(main.on_startup())

    logged = caplog.text
    assert "Missing required settings: SUPABASE_URL" in logged
    assert "SUPABASE_SERVICE_ROLE_KEY" not in logged and "SECRET_KEY" not in logged
    assert SECRET_VALUE not in logged
    assert "/etc/secrets" not in logged

    printed = capsys.readouterr()
    assert printed.out == "" and printed.err == ""


def test_startup_is_silent_when_configured(monkeypatch, caplog, capsys, quiet_startup):
    for name in main.REQUIRED_SETTINGS:
        monkeypatch.setenv(name, SECRET_VALUE)

    with caplog.at_level(logging.INFO, logger="app.main"):
        asyncio.run(main.on_startup())

    assert "Missing required settings" not in caplog.text
    assert SECRET_VALUE not in caplog.text
    assert capsys.readouterr().out == ""
