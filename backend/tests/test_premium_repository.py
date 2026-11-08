"""Synthetic premium reads: bounded pagination, metadata projections, honest failures."""
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app.db.repositories.premium import SupabasePremiumRepository


class Query:
    def __init__(self, client, table):
        self.client, self.table, self.bounds, self.maximum = client, table, None, 50
    def select(self, columns): self.client.projections.append(columns); return self
    def eq(self, *args): return self
    def order(self, *args, **kwargs): return self
    def limit(self, maximum): self.maximum = maximum; return self
    def range(self, start, end): self.bounds = (start, end); return self
    def execute(self):
        if self.client.failure: return SimpleNamespace(data=None, error="Synthetic unavailable")
        if self.table == "premium_config": return SimpleNamespace(data=[])
        start, end = self.bounds or (0, min(self.maximum, 1000) - 1)
        return SimpleNamespace(data=self.client.rows[start:end + 1])


class Client:
    def __init__(self):
        self.rows = [{"id": str(i), "kind": "checkout", "amount_php": 1} for i in range(1123)]
        self.projections, self.failure = [], False
    def table(self, table): return Query(self, table)


def test_event_window_pages_past_provider_cap_and_selects_no_payloads():
    client = Client()
    rows = SupabasePremiumRepository(client).list_events(5000)
    assert len(rows) == 1123
    assert all(columns != "*" and "details" not in columns for columns in client.projections)


@pytest.mark.parametrize("method", ["get_config", "list_events"])
def test_unavailable_premium_data_is_not_default_prices_or_zero_activity(method):
    client = Client()
    client.failure = True
    with pytest.raises(HTTPException): getattr(SupabasePremiumRepository(client), method)()


def test_absent_config_is_explicitly_labelled_as_defaults():
    assert SupabasePremiumRepository(Client()).get_config()["_basis"] == "default"
