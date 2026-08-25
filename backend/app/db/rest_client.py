# backend/app/db/rest_client.py
"""
Lightweight REST Client for Supabase PostgREST & Auth API.
Allows executing standard table operations (select, insert, update, delete, rpc) via HTTP.
"""
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, List, Optional

class PostgrestQueryBuilder:
    def __init__(self, base_url: str, headers: Dict[str, str], table: str):
        self.base_url = f"{base_url.rstrip('/')}/rest/v1/{table}"
        self.headers = headers
        self.params: Dict[str, str] = {}

    def select(self, columns: str = "*"):
        self.params["select"] = columns
        return self

    def eq(self, column: str, value: Any):
        self.params[column] = f"eq.{value}"
        return self

    def in_(self, column: str, values: List[Any]):
        joined = ",".join(str(v) for v in values)
        self.params[column] = f"in.({joined})"
        return self

    def order(self, column: str, desc: bool = False):
        self.params["order"] = f"{column}.{'desc' if desc else 'asc'}"
        return self

    def limit(self, count: int):
        self.params["limit"] = str(count)
        return self

    def execute(self):
        query_string = urllib.parse.urlencode(self.params)
        url = f"{self.base_url}?{query_string}" if query_string else self.base_url
        req = urllib.request.Request(url, headers=self.headers, method="GET")
        try:
            with urllib.request.urlopen(req) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body) if body else []
                return SupabaseResponse(data=data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return SupabaseResponse(data=None, error={"code": e.code, "message": err_body})

    def insert(self, values: Any):
        self.method = "POST"
        payload = json.dumps(values).encode("utf-8")
        headers = dict(self.headers)
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation"
        req = urllib.request.Request(self.base_url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body) if body else []
                return SupabaseResponse(data=data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return SupabaseResponse(data=None, error={"code": e.code, "message": err_body})

    def update(self, values: Dict[str, Any]):
        query_string = urllib.parse.urlencode(self.params)
        url = f"{self.base_url}?{query_string}" if query_string else self.base_url
        payload = json.dumps(values).encode("utf-8")
        headers = dict(self.headers)
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation"
        req = urllib.request.Request(url, data=payload, headers=headers, method="PATCH")
        try:
            with urllib.request.urlopen(req) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body) if body else []
                return SupabaseResponse(data=data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return SupabaseResponse(data=None, error={"code": e.code, "message": err_body})

    def delete(self):
        query_string = urllib.parse.urlencode(self.params)
        url = f"{self.base_url}?{query_string}" if query_string else self.base_url
        headers = dict(self.headers)
        headers["Prefer"] = "return=representation"
        req = urllib.request.Request(url, headers=headers, method="DELETE")
        try:
            with urllib.request.urlopen(req) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body) if body else []
                return SupabaseResponse(data=data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return SupabaseResponse(data=None, error={"code": e.code, "message": err_body})


class SupabaseResponse:
    def __init__(self, data: Any = None, error: Optional[Dict[str, Any]] = None):
        self.data = data
        self.error = error


class SupabaseRestClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json"
        }

    def table(self, table_name: str) -> PostgrestQueryBuilder:
        return PostgrestQueryBuilder(self.url, self.headers, table_name)

    def rpc(self, fn_name: str, params: Optional[Dict[str, Any]] = None) -> SupabaseResponse:
        url = f"{self.url.rstrip('/')}/rest/v1/rpc/{fn_name}"
        payload = json.dumps(params or {}).encode("utf-8")
        headers = dict(self.headers)
        headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body) if body else None
                return SupabaseResponse(data=data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return SupabaseResponse(data=None, error={"code": e.code, "message": err_body})
