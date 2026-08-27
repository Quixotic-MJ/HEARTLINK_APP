from typing import List, Dict, Any, Tuple, Optional
from app.db.repositories import get_exercises_repo, get_content_repo

def get_routines() -> List[Dict[str, Any]]:
    return get_content_repo().list_routines()

def get_exercise_logs(user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    logs = get_exercises_repo().list_user_logs(user_id)
    return logs[offset:offset + limit]

def create_exercise_log(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return get_exercises_repo().create_log(user_id, data)

def delete_exercise_log(user_id: str, log_id: str) -> Tuple[bool, str, int]:
    success = get_exercises_repo().delete_log(user_id, log_id)
    if success:
        return True, "Exercise log deleted", 200
    return False, "Log not found or already deleted", 404

def create_routine(data: Dict[str, Any]) -> Dict[str, Any]:
    return get_content_repo().create_routine(data)

def update_routine(routine_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return get_content_repo().update_routine(routine_id, data)

def delete_routine(routine_id: str) -> bool:
    return get_content_repo().delete_routine(routine_id)
