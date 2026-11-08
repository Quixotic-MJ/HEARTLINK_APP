"""Synthetic permission-store failures must not look like an empty public catalogue."""
import importlib

import pytest
from fastapi import HTTPException
from starlette.requests import Request


@pytest.fixture(params=["app.api.exercises.exercises", "app.api.recipes_api.recipes_api"])
def content_api(request, monkeypatch):
    api = importlib.import_module(request.param)
    monkeypatch.setattr(api, "verify_token", lambda token: {"user_id": "synthetic-staff", "role": "admin"})
    return api


@pytest.mark.parametrize("status", [500, 503])
def test_profile_service_failure_is_not_an_anonymous_downgrade(content_api, monkeypatch, status):
    def unavailable(*args):
        raise HTTPException(status_code=status, detail="Synthetic service unavailable")

    monkeypatch.setattr(content_api, "has_active_permission", unavailable)
    with pytest.raises(HTTPException) as caught:
        content_api._can_read_unpublished("synthetic-token")
    assert caught.value.status_code == status


@pytest.mark.parametrize("status", [401, 403])
def test_invalid_credentials_still_have_no_unpublished_access(content_api, monkeypatch, status):
    def rejected(*args):
        raise HTTPException(status_code=status, detail="Synthetic authorization failure")

    monkeypatch.setattr(content_api, "verify_token", rejected)
    assert content_api._can_read_unpublished("synthetic-token") is False


def test_active_permission_remains_required(content_api, monkeypatch):
    assert content_api._can_read_unpublished(None) is False
    monkeypatch.setattr(content_api, "has_active_permission", lambda *args: False)
    assert content_api._can_read_unpublished("synthetic-token") is False
    monkeypatch.setattr(content_api, "has_active_permission", lambda *args: True)
    assert content_api._can_read_unpublished("synthetic-token") is True


def test_catalogue_route_surfaces_permission_store_outage(content_api, monkeypatch):
    def unavailable(*args):
        raise HTTPException(status_code=503, detail="Synthetic service unavailable")

    routine_api = hasattr(content_api, "read_routines")
    monkeypatch.setattr(content_api, "get_routines" if routine_api else "get_recipes", lambda: [{"id": "synthetic-draft", "status": "draft"}])
    monkeypatch.setattr(content_api, "get_optional_token", lambda *args: "synthetic-token")
    monkeypatch.setattr(content_api, "has_active_permission", unavailable)
    read = content_api.read_routines if routine_api else content_api.read_recipes
    with pytest.raises(HTTPException) as caught:
        read(Request({"type": "http", "headers": []}), None)
    assert caught.value.status_code == 503
