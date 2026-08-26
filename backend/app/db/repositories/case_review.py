# backend/app/db/repositories/case_review.py
"""
Case Review, Expert Evaluations, Calibration Datasets & Candidate Models Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error

logger = logging.getLogger(__name__)

class CaseReviewRepository:
    def list_evaluations(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create_or_update_evaluation(self, eval_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def archive_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_datasets(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def create_dataset(self, dataset_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_candidate_models(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def register_candidate_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def update_candidate_model_status(self, model_id: str, status: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class MockCaseReviewRepository(CaseReviewRepository):
    def __init__(self):
        self._evaluations: List[Dict[str, Any]] = []
        self._datasets: List[Dict[str, Any]] = []
        self._models: List[Dict[str, Any]] = []

    def list_evaluations(self) -> List[Dict[str, Any]]:
        return sorted(self._evaluations, key=lambda x: x.get("created_at") or datetime.min, reverse=True)

    def get_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        for e in self._evaluations:
            if e.get("id") == eval_id or e.get("case_id") == eval_id or e.get("user_id") == eval_id:
                return e
        return None

    def create_or_update_evaluation(self, eval_data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = eval_data.get("user_id")
        existing = next((e for e in self._evaluations if e.get("user_id") == user_id), None)
        if existing:
            existing.update(eval_data)
            existing["status"] = "Logged"
            return existing
        else:
            record = {
                "id": eval_data.get("id") or f"CAL-{len(self._evaluations) + 1000}",
                "created_at": datetime.utcnow(),
                "status": "Logged",
                **eval_data
            }
            self._evaluations.append(record)
            return record

    def archive_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        e = self.get_evaluation(eval_id)
        if e:
            e["status"] = "Archived"
            return e
        return None

    def list_datasets(self) -> List[Dict[str, Any]]:
        return self._datasets

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        return next((ds for ds in self._datasets if ds.get("dataset_id") == dataset_id or ds.get("id") == dataset_id), None)

    def create_dataset(self, dataset_data: Dict[str, Any]) -> Dict[str, Any]:
        self._datasets.append(dataset_data)
        return dataset_data

    def list_candidate_models(self) -> List[Dict[str, Any]]:
        return self._models

    def register_candidate_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        self._models.append(model_data)
        return model_data

    def update_candidate_model_status(self, model_id: str, status: str) -> Optional[Dict[str, Any]]:
        for m in self._models:
            if m.get("model_id") == model_id or m.get("id") == model_id:
                m["status"] = status
                return m
        return None


class SupabaseCaseReviewRepository(CaseReviewRepository):
    def __init__(self, client):
        self.client = client

    def list_evaluations(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("expert_evaluations").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("expert_evaluations").select("*").eq("id", eval_id).execute()
            if not res.data:
                res = self.client.table("expert_evaluations").select("*").eq("legacy_id", eval_id).execute()
            if not res.data:
                res = self.client.table("expert_evaluations").select("*").eq("case_id", eval_id).execute()
            if not res.data:
                res = self.client.table("expert_evaluations").select("*").eq("user_id", eval_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create_or_update_evaluation(self, eval_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "status": "Logged",
                **eval_data
            }
            user_id = eval_data.get("user_id")
            existing = self.client.table("expert_evaluations").select("id").eq("user_id", user_id).execute()
            if existing.data and len(existing.data) > 0:
                res = self.client.table("expert_evaluations").update(payload).eq("id", existing.data[0]["id"]).execute()
            else:
                res = self.client.table("expert_evaluations").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def archive_evaluation(self, eval_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("expert_evaluations").update({"status": "Archived"}).eq("id", eval_id).execute()
            if not res.data:
                res = self.client.table("expert_evaluations").update({"status": "Archived"}).eq("legacy_id", eval_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def list_datasets(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("calibration_datasets").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("calibration_datasets").select("*").eq("dataset_id", dataset_id).execute()
            if not res.data:
                res = self.client.table("calibration_datasets").select("*").eq("id", dataset_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def create_dataset(self, dataset_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                **dataset_data
            }
            res = self.client.table("calibration_datasets").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_candidate_models(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("candidate_models").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def register_candidate_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload = {
                "created_at": datetime.utcnow().isoformat(),
                "status": "candidate",
                **model_data
            }
            res = self.client.table("candidate_models").insert(payload).execute()
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def update_candidate_model_status(self, model_id: str, status: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("candidate_models").update({"status": status}).eq("model_id", model_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None
