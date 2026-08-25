# backend/app/db/repositories/hss.py
"""
HSS History Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

class HSSRepository:
    def get_latest_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_baseline_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_hss_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_hss_record(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class MockHSSRepository(HSSRepository):
    def list_hss_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        records = [h for h in getattr(mock_db, 'hss_history', []) if h.get("user_id") == user_id]
        sorted_records = sorted(records, key=lambda x: x.get("computed_at") or datetime.min, reverse=True)
        return sorted_records[:limit] if limit else sorted_records

    def get_latest_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        records = self.list_hss_history(user_id, limit=1)
        return records[0] if records else None

    def get_baseline_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        for r in getattr(mock_db, 'hss_history', []):
            if r.get("user_id") == user_id and r.get("source") == "baseline":
                return r
        return None

    def create_hss_record(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        new_record = {
            "id": data.get("id") or f"hss-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "score": data["score"],
            "tier": data["tier"],
            "risk_probability": data.get("risk_probability"),
            "source": data.get("source", "telemetry"),
            "model_version": data.get("model_version", "v1.0.0"),
            "model_hash": data.get("model_hash"),
            "contributing_factors": data.get("contributing_factors", {}),
            "computed_at": data.get("computed_at") or now,
            "created_at": now
        }
        mock_db.hss_history.append(new_record)
        mock_db.save_logs()
        return new_record


class SupabaseHSSRepository(HSSRepository):
    def __init__(self, client):
        self.client = client

    def list_hss_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("hss_history").select("*").eq("user_id", user_id).order("computed_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get_latest_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        records = self.list_hss_history(user_id, limit=1)
        return records[0] if records else None

    def get_baseline_hss(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("hss_history").select("*").eq("user_id", user_id).eq("source", "baseline").order("computed_at", desc=True).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create_hss_record(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "user_id": user_id,
                "score": data["score"],
                "tier": data["tier"],
                "risk_probability": data.get("risk_probability"),
                "source": data.get("source", "telemetry"),
                "model_version": data.get("model_version", "v1.0.0"),
                "model_hash": data.get("model_hash"),
                "contributing_factors": data.get("contributing_factors", {}),
                "computed_at": data.get("computed_at") or datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat()
            }
            if data.get("id"):
                payload["id"] = data["id"]
            res = self.client.table("hss_history").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}
