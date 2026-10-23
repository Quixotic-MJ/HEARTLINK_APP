"""HL-068 security headers, HL-069 allowed request headers, HL-070 oversized uploads refused early."""
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app import main
from app.main import app
from app.utils.http_guards import SecurityHeaders, UploadSizeLimit

client = TestClient(app)
ORIGIN = main.allowed_origins[0]


# --- HL-068 -------------------------------------------------------------------------------------------

def test_every_reply_has_the_security_headers():
    headers = client.get("/health").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert headers["x-frame-options"] == "DENY"
    assert "strict-transport-security" not in headers  # local / non-production stays plain HTTP friendly


def test_production_adds_https_only():
    mini = FastAPI()
    mini.get("/ping")(lambda: {"ok": True})
    mini.add_middleware(SecurityHeaders, production=True)
    headers = TestClient(mini).get("/ping").headers
    assert headers["strict-transport-security"] == "max-age=31536000; includeSubDomains"
    assert headers["x-content-type-options"] == "nosniff"


# --- HL-069 -------------------------------------------------------------------------------------------

def preflight(header):
    return client.options("/api/auth/me", headers={
        "Origin": ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": header})


def test_the_headers_the_apps_send_are_allowed():
    for header in ("authorization", "content-type", "x-csrf-token", "authorization, content-type"):
        response = preflight(header)
        assert response.status_code == 200, header
        assert response.headers["access-control-allow-origin"] == ORIGIN


def test_other_request_headers_are_refused():
    assert preflight("x-anything-else").status_code == 400


# --- HL-070 -------------------------------------------------------------------------------------------

def guarded_app(max_bytes=100):
    mini = FastAPI()
    reached = []

    @mini.post("/api/upload/")
    async def upload(request: Request):
        reached.append(True)
        return {"size": len(await request.body())}

    mini.add_middleware(UploadSizeLimit, paths=["/api/upload"], max_bytes=max_bytes)
    return TestClient(mini), reached


def test_a_declared_size_over_the_limit_is_refused_before_anything_is_read():
    test_client, reached = guarded_app()
    response = test_client.post("/api/upload/", content=b"x" * 101)
    assert response.status_code == 413
    assert "too large" in response.json()["detail"]
    assert reached == []  # the endpoint never ran


def test_a_body_with_no_declared_size_is_cut_off_at_the_limit():
    test_client, _ = guarded_app()
    response = test_client.post("/api/upload/", content=(b"x" * 30 for _ in range(10)))  # streamed, no length
    assert response.status_code == 413


def test_uploads_within_the_limit_and_other_addresses_are_untouched():
    test_client, reached = guarded_app()
    assert test_client.post("/api/upload/", content=b"x" * 100).json() == {"size": 100}
    assert reached == [True]


def test_the_real_upload_address_refuses_a_huge_file_with_cors_headers():
    too_big = b"x" * (22 * 1024 * 1024)
    response = client.post("/api/upload/", content=too_big, headers={"Origin": ORIGIN, "Content-Type": "application/octet-stream"})
    assert response.status_code == 413
    # The portal can read the reason instead of seeing a network error
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert response.headers["x-content-type-options"] == "nosniff"
