"""HL-050: the case review router is mounted once, under /api/admin only."""
import collections

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.api.admin_api import case_review_api
from app.main import app


def _routes():
    return [r for r in app.routes if isinstance(r, APIRoute)]


def test_no_endpoint_is_registered_twice():
    seen = collections.Counter((r.path, m) for r in _routes() for m in r.methods)
    duplicates = [key for key, count in seen.items() if count > 1]
    assert duplicates == []


def test_case_review_lives_only_under_api_admin():
    case_review_paths = {r.path for r in _routes() if r.endpoint in {cr.endpoint for cr in case_review_api.router.routes}}
    assert case_review_paths, "case review routes should be mounted"
    assert all(p.startswith("/api/admin/") for p in case_review_paths)
    assert not any(r.path.startswith("/api/expert") for r in _routes())


def test_old_expert_prefix_returns_404():
    client = TestClient(app)
    for path in ("/api/expert/cases", "/api/expert/calibration/metrics"):
        assert client.get(path).status_code == 404


def test_admin_prefix_still_requires_login():
    # Other modules install app-wide dependency overrides at import time; exercise the real auth here.
    saved_overrides = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    try:
        # 401 (not 404) proves the endpoint exists and is still protected
        assert TestClient(app).get("/api/admin/cases").status_code == 401
    finally:
        app.dependency_overrides.update(saved_overrides)
