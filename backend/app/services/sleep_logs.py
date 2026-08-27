from typing import List, Dict, Any
from app.db.repositories import get_sleep_repo

def get_sleep_logs(user_id: str) -> List[Dict[str, Any]]:
    return get_sleep_repo().list_user_logs(user_id)

def delete_sleep_log(user_id: str, log_id: str) -> bool:
    return get_sleep_repo().delete_log(user_id, log_id)

def create_sleep_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return get_sleep_repo().create_log(user_id, data)
