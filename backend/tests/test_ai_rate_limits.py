"""AI-backed endpoints are limited per person, so people sharing one Wi-Fi don't block each other."""
import uuid

from fastapi import Request
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import get_current_user

client = TestClient(app)
VARNISH = {"slot": "greeting", "template": "Good morning, keep it up."}


def signed_in_as(user_id):
    def fake_user(request: Request):
        request.state.user_id = user_id  # what the real get_current_user does
        return {"user_id": user_id, "role": "patient"}
    return fake_user


def test_one_person_hitting_the_ai_limit_does_not_block_another(monkeypatch):
    monkeypatch.setattr("app.api.companion.companion.LLM_ENABLED", False)  # answer with the template, no AI call
    first, second = f"limit-a-{uuid.uuid4()}", f"limit-b-{uuid.uuid4()}"
    try:
        app.dependency_overrides[get_current_user] = signed_in_as(first)
        codes = [client.post("/api/companion/varnish", json=VARNISH).status_code for _ in range(21)]
        assert codes[:20] == [200] * 20
        assert codes[20] == 429

        app.dependency_overrides[get_current_user] = signed_in_as(second)
        assert client.post("/api/companion/varnish", json=VARNISH).status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user, None)
