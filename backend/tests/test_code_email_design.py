"""The sign-up code email: a designed (HTML) version and a plain-text copy, with the logo served by this backend."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.services import email_service as email


@pytest.fixture(autouse=True)
def no_logo_settings(monkeypatch):
    monkeypatch.delenv("EMAIL_LOGO_URL", raising=False)
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)


def test_the_email_has_a_designed_and_a_plain_version(monkeypatch):
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://heartlink-staging.onrender.com")
    msg = email._signup_code_message("sender@example.com", "qa@example.com", "257020", 10)
    assert msg["Subject"] == "Your HeartLink code: 257020"
    plain, html = email._part(msg, "plain"), email._part(msg, "html")
    assert "257020" in plain and "expires in 10 minutes" in plain and "<" not in plain
    assert ">257020</div>" in html and "10 minutes" in html
    assert 'src="https://heartlink-staging.onrender.com/static/email/heartlink-logo.png"' in html
    assert "never ask you for this code" in html and "never ask you for this code" in plain


def test_without_an_address_the_email_has_no_broken_picture():
    html = email._part(email._signup_code_message("s@example.com", "qa@example.com", "123456", 10), "html")
    assert "<img" not in html and ">HeartLink</td>" in html


def test_an_explicit_logo_address_wins(monkeypatch):
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://heartlink-staging.onrender.com")
    monkeypatch.setenv("EMAIL_LOGO_URL", "https://cdn.example.com/logo.png")
    assert email._logo_url() == "https://cdn.example.com/logo.png"


def test_brevo_gets_both_versions(monkeypatch):
    sent = {}

    def post(url, json=None, headers=None, timeout=None):
        sent.update(json)
        return SimpleNamespace(status_code=201, text="")

    monkeypatch.setenv("BREVO_API_KEY", "key")
    monkeypatch.setenv("MAIL_FROM", "sender@example.com")
    monkeypatch.setattr(email.httpx, "post", post)
    email.send_signup_code("qa@example.com", "257020", 10)
    assert sent["subject"] == "Your HeartLink code: 257020"
    assert "257020" in sent["textContent"] and "<!doctype html>" in sent["htmlContent"]


def test_the_logo_is_served():
    from app.main import app
    res = TestClient(app).get(email.LOGO_PATH)
    assert res.status_code == 200 and res.headers["content-type"] == "image/png"
