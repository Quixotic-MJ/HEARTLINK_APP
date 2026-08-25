# backend/app/db/repositories/health_logs.py
"""
Daily Health Logs & Clinical Alerts Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import app.mock_db as mock_db
from app.db.repositories.base import handle_db_error

class HealthLogsRepository:
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_latest_vitals(self, user_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_alerts(self, user_id: Optional[str] = None, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_alert(self, alert_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class MockHealthLogsRepository(HealthLogsRepository):
    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        logs = [l for l in mock_db.daily_health_logs if l.get("user_id") == user_id]
        sorted_logs = sorted(logs, key=lambda x: x.get("logged_at") or datetime.min, reverse=True)
        return sorted_logs[:limit] if limit else sorted_logs

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        new_log = {
            "id": f"log-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            **data,
            "created_at": now,
            "logged_at": data.get("logged_at") or now
        }
        mock_db.daily_health_logs.append(new_log)
        mock_db.save_logs()
        return new_log

    def get_latest_vitals(self, user_id: str) -> Optional[Dict[str, Any]]:
        logs = self.list_user_logs(user_id, limit=1)
        return logs[0] if logs else None

    def list_alerts(self, user_id: Optional[str] = None, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        alerts = list(mock_db.alerts)
        if user_id:
            alerts = [a for a in alerts if a.get("user_id") == user_id]
        if status_filter:
            alerts = [a for a in alerts if a.get("status") == status_filter]
        return sorted(alerts, key=lambda x: x.get("created_at") or datetime.min, reverse=True)

    def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        record = {
            "id": f"alert-{uuid.uuid4().hex[:8]}",
            "created_at": datetime.utcnow(),
            **alert_data
        }
        mock_db.alerts.append(record)
        mock_db.save_logs()
        return record

    def update_alert(self, alert_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for a in mock_db.alerts:
            if a.get("id") == alert_id:
                a.update(data)
                mock_db.save_logs()
                return a
        return None


class SupabaseHealthLogsRepository(HealthLogsRepository):
    def __init__(self, client):
        self.client = client

    def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("daily_health_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True)
            if limit:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def create_log(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                **data,
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "logged_at": data.get("logged_at") or datetime.utcnow().isoformat()
            }
            res = self.client.table("daily_health_logs").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_latest_vitals(self, user_id: str) -> Optional[Dict[str, Any]]:
        logs = self.list_user_logs(user_id, limit=1)
        return logs[0] if logs else None

    def list_alerts(self, user_id: Optional[str] = None, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("clinical_alerts").select("*")
            if user_id:
                query = query.eq("user_id", user_id)
            if status_filter:
                query = query.eq("status", status_filter)
            res = query.order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                **alert_data,
                "created_at": datetime.utcnow().isoformat()
            }
            res = self.client.table("clinical_alerts").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_alert(self, alert_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("clinical_alerts").update(data).eq("id", alert_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None
