# backend/app/db/repositories/case_review.py
"""
Case Review, Expert Evaluations, Calibration Datasets & Candidate Models Repository Layer.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging
from app.db.repositories.base import handle_db_error
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN

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

    # --- HL-053: review rounds (review_cases) and expert sections (expert_evaluations) ---

    def create_review_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_review_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def get_open_case_for_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_review_cases(self, status: Optional[str] = None, lane: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def list_patient_cases(self, patient_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def update_review_case(self, case_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def list_reviewed_patient_ids(self) -> List[str]:
        raise NotImplementedError

    def save_section(self, review_case_id: str, section: str, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def list_sections(self, review_case_id: Optional[str] = None, section: Optional[str] = None,
                      clinical_only: bool = False, include_archived: bool = False) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def hide_recommendation(self, patient_id: str, item_type: str, item_id: str,
                            review_case_id: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    def list_hidden_recommendations(self, patient_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def archive_sections(self, review_case_id: str) -> None:
        raise NotImplementedError


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
                "created_at": utc_now().isoformat(),
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
                "created_at": utc_now().isoformat(),
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
                "created_at": utc_now().isoformat(),
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

    # --- HL-053: review rounds (review_cases) and expert sections (expert_evaluations) ---

    def create_review_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.client.table("review_cases").insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            handle_db_error(e)
            return {}

    def get_review_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        try:
            uuid.UUID(str(case_id))
        except (ValueError, TypeError):
            return None
        try:
            res = self.client.table("review_cases").select("*").eq("id", case_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def get_open_case_for_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = (self.client.table("review_cases").select("*")
                   .eq("patient_id", patient_id).eq("status", "open").execute())
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def list_review_cases(self, status: Optional[str] = None, lane: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("review_cases").select("*")
            if status:
                query = query.eq("status", status)
            if lane:
                query = query.eq("lane", lane)
            return query.order("created_at", desc=False).execute().data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def list_patient_cases(self, patient_id: str) -> List[Dict[str, Any]]:
        try:
            res = (self.client.table("review_cases").select("*")
                   .eq("patient_id", patient_id).order("created_at", desc=True).execute())
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def update_review_case(self, case_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table("review_cases").update(patch).eq("id", case_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            handle_db_error(e)
            return None

    def list_reviewed_patient_ids(self) -> List[str]:
        """Patients with at least one completed review round."""
        try:
            res = self.client.table("review_cases").select("patient_id").eq("status", "complete").execute()
            return sorted({row["patient_id"] for row in (res.data or []) if row.get("patient_id")})
        except Exception as e:
            handle_db_error(e)
            return []

    def save_section(self, review_case_id: str, section: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """One row per (round, section): a resubmission while the round is open replaces it."""
        try:
            payload = {**data, "review_case_id": review_case_id, "section": section,
                       "updated_at": utc_now().isoformat()}
            res = (self.client.table("expert_evaluations")
                   .upsert(payload, on_conflict="review_case_id,section").execute())
            return res.data[0] if res.data else {}
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_sections(self, review_case_id: Optional[str] = None, section: Optional[str] = None,
                      clinical_only: bool = False, include_archived: bool = False) -> List[Dict[str, Any]]:
        try:
            query = self.client.table("expert_evaluations").select("*")
            if review_case_id:
                query = query.eq("review_case_id", review_case_id)
            if section:
                query = query.eq("section", section)
            if clinical_only:
                query = query.eq("is_clinical", True)
            if not include_archived:
                query = query.eq("status", "submitted")
            return query.order("created_at", desc=True).execute().data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def hide_recommendation(self, patient_id: str, item_type: str, item_id: str,
                            review_case_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            payload = {"patient_id": patient_id, "item_type": item_type, "item_id": item_id,
                       "review_case_id": review_case_id}
            res = (self.client.table("patient_hidden_recommendations")
                   .upsert(payload, on_conflict="patient_id,item_type,item_id").execute())
            return res.data[0] if res.data else payload
        except Exception as e:
            handle_db_error(e)
            return {}

    def list_hidden_recommendations(self, patient_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table("patient_hidden_recommendations").select("*").eq("patient_id", patient_id).execute()
            return res.data or []
        except Exception as e:
            handle_db_error(e)
            return []

    def archive_sections(self, review_case_id: str) -> None:
        try:
            (self.client.table("expert_evaluations").update({"status": "archived", "updated_at": utc_now().isoformat()})
             .eq("review_case_id", review_case_id).execute())
        except Exception as e:
            handle_db_error(e)
