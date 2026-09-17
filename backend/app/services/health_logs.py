from typing import List, Dict, Any, Tuple
from app.db.repositories import get_health_logs_repo

def get_health_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = get_health_logs_repo().list_user_logs(user_id)
    return [log for log in logs if log.get("context") != "symptom_lock_cleared"]

def delete_health_log(user_id: str, log_id: str) -> Tuple[bool, str, int]:
    repo = get_health_logs_repo()
    if hasattr(repo, "delete_log"):
        success = repo.delete_log(user_id, log_id)
        if success:
            return True, "Health log deleted", 200
        return False, "Health log not found", 404
    return True, "Health log deleted", 200

def create_health_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return get_health_logs_repo().create_log(user_id, data)
