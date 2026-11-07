"""General Wellness never mounts legacy clinical portal routers; stored history is retained."""
import re
import warnings

from fastapi.testclient import TestClient

from app.api.admin_api import case_review_api, patient_care_api
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


def test_clinical_portal_routes_are_not_exposed():
    paths, _ = _schema()
    case_review_paths = {f"/api/admin{cr.path}" for cr in case_review_api.router.routes}
    patient_paths = {cr.path for cr in patient_care_api.router.routes}
    assert case_review_paths and patient_paths
    assert not (case_review_paths | patient_paths) & set(paths)
    assert not any(p.startswith("/api/expert") for p in paths)


def test_old_expert_prefix_returns_404():
    client = TestClient(app)
    for path in ("/api/expert/cases", "/api/expert/calibration/metrics"):
        assert client.get(path).status_code == 404


def test_retired_routes_return_404_even_to_signed_in_staff():
    saved_overrides = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    try:
        from app.utils.security import get_current_admin_user
        for role in ("admin", "medical_expert"):
            app.dependency_overrides[get_current_admin_user] = lambda: {"user_id": "synthetic-staff", "role": role}
            client = TestClient(app)
            for path in ("/api/admin/review-queue", "/api/admin/model-check/export", "/api/admin/patients",
                         "/api/admin/patients/synthetic/notes", "/api/admin/patients/synthetic/logs"):
                for method in ("GET", "POST", "PUT", "DELETE"):
                    assert client.request(method, path).status_code == 404
    finally:
        app.dependency_overrides.update(saved_overrides)
