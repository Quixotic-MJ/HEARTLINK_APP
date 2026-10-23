"""HL-050: the case review router is mounted once, under /api/admin only."""
import re
import warnings

from fastapi.testclient import TestClient

from app.api.admin_api import case_review_api
from app.main import app

# The app's own address list (what /docs shows). Newer FastAPI keeps included routers in a private wrapper, so
# app.routes no longer lists every address; the OpenAPI schema always does.
# These answer both GET and HEAD, which FastAPI reports as a duplicate ID; they aren't registered twice.
GET_AND_HEAD = {"root_check", "root_health_check", "api_health_check"}


def _schema():
    app.openapi_schema = None
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        paths = app.openapi()["paths"]
    duplicated = {m.group(1) for w in caught if (m := re.search(r"Duplicate Operation ID \S+ for function (\w+)", str(w.message)))}
    return paths, duplicated


def test_no_endpoint_is_registered_twice():
    _, duplicated = _schema()
    assert duplicated - GET_AND_HEAD == set()


def test_case_review_lives_only_under_api_admin():
    paths, _ = _schema()
    case_review_paths = {f"/api/admin{cr.path}" for cr in case_review_api.router.routes}
    assert case_review_paths, "case review routes should be mounted"
    assert case_review_paths <= set(paths)
    assert not any(p.startswith("/api/expert") for p in paths)


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
        assert TestClient(app).get("/api/admin/review-queue").status_code == 401
    finally:
        app.dependency_overrides.update(saved_overrides)
