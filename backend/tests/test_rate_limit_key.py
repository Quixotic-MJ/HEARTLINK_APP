"""Rate-limit key must be the real client IP behind trusted proxies, and not spoofable."""
from starlette.requests import Request

import app.utils.rate_limiter as rate_limiter


def _request(forwarded_for=None, peer="10.0.0.1"):
    headers = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode()))
    return Request({"type": "http", "headers": headers, "client": (peer, 1234)})


def test_no_trusted_proxies_uses_peer_and_ignores_header(monkeypatch):
    monkeypatch.setattr(rate_limiter, "TRUSTED_PROXY_HOPS", 0)
    assert rate_limiter.client_ip_key(_request("1.2.3.4")) == "10.0.0.1"


def test_single_proxy_uses_appended_client_ip(monkeypatch):
    monkeypatch.setattr(rate_limiter, "TRUSTED_PROXY_HOPS", 1)
    assert rate_limiter.client_ip_key(_request("203.0.113.7")) == "203.0.113.7"


def test_two_proxies_pick_client_before_vercel_hop(monkeypatch):
    monkeypatch.setattr(rate_limiter, "TRUSTED_PROXY_HOPS", 2)
    assert rate_limiter.client_ip_key(_request("203.0.113.7, 76.76.21.1")) == "203.0.113.7"


def test_client_prepended_spoof_is_ignored(monkeypatch):
    monkeypatch.setattr(rate_limiter, "TRUSTED_PROXY_HOPS", 1)
    # Attacker sends "X-Forwarded-For: 6.6.6.6"; the trusted proxy appends the real IP.
    assert rate_limiter.client_ip_key(_request("6.6.6.6, 203.0.113.7")) == "203.0.113.7"


def test_too_few_hops_falls_back_to_peer(monkeypatch):
    monkeypatch.setattr(rate_limiter, "TRUSTED_PROXY_HOPS", 2)
    assert rate_limiter.client_ip_key(_request("203.0.113.7")) == "10.0.0.1"
    assert rate_limiter.client_ip_key(_request()) == "10.0.0.1"
