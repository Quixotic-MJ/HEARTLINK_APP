"""Persistence for immutable content versions and expert review decisions."""

from typing import Any, Dict, List, Optional

from app.db.repositories.base import handle_db_error, serialize_for_db


class ContentWorkflowRepository:
    def list_reviews(
        self,
        content_type: Optional[str] = None,
        content_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_review(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_versions(self, content_type: str, content_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def create_version(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class SupabaseContentWorkflowRepository(ContentWorkflowRepository):
    def __init__(self, client):
        self.client = client

    def list_reviews(
        self,
        content_type: Optional[str] = None,
        content_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = self.client.table("content_reviews").select("*")
        if content_type:
            query = query.eq("content_type", content_type)
        if content_id:
            query = query.eq("content_id", content_id)
        try:
            response = query.order("reviewed_at", desc=True).execute()
            return response.data or []
        except Exception as exc:
            handle_db_error(exc)
            return []

    def create_review(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.table("content_reviews").insert(
                serialize_for_db(data)
            ).execute()
            return response.data[0] if response.data else {}
        except Exception as exc:
            handle_db_error(exc)
            return {}

    def list_versions(self, content_type: str, content_id: str) -> List[Dict[str, Any]]:
        try:
            response = (
                self.client.table("content_versions")
                .select("*")
                .eq("content_type", content_type)
                .eq("content_id", content_id)
                .order("content_version", desc=True)
                .execute()
            )
            return response.data or []
        except Exception as exc:
            handle_db_error(exc)
            return []

    def create_version(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.table("content_versions").upsert(
                serialize_for_db(data),
                on_conflict="content_type,content_id,content_version",
            ).execute()
            return response.data[0] if response.data else data
        except Exception as exc:
            handle_db_error(exc)
            return {}
