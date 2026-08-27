from typing import Any, Dict, Optional, List
from datetime import datetime, date
import uuid
from fastapi import HTTPException, status

def serialize_for_db(obj: Any) -> Any:
    """Recursively serializes date, datetime, and UUID objects to JSON-serializable primitives."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, dict):
        return {k: serialize_for_db(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_for_db(i) for i in obj]
    return obj

def resolve_uuid(id_val: Any) -> Optional[str]:
    """
    Validates and normalizes UUID strings.
    Returns standard string UUID if valid, or None if invalid or empty.
    """
    if not id_val:
        return None
    try:
        val_str = str(id_val).strip()
        parsed = uuid.UUID(val_str)
        return str(parsed)
    except (ValueError, TypeError, AttributeError):
        return None


class RepositoryError(Exception):
    def __init__(self, message: str, status_code: int = 500, detail: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail or message

class NotFoundError(RepositoryError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class ConflictError(RepositoryError):
    def __init__(self, message: str = "Resource conflict or duplicate"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)

class PermissionDeniedError(RepositoryError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)

class ValidationError(RepositoryError):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)

def handle_db_error(e: Exception) -> None:
    """
    Translates raw database or PostgREST errors into clean, sanitized HTTPExceptions.
    Never leaks SQL queries, table structures, or credentials.
    """
    if isinstance(e, RepositoryError):
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    err_str = str(e).lower()
    if "not found" in err_str:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested resource not found.")
    elif "duplicate key" in err_str or "unique constraint" in err_str or "23505" in err_str:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A resource with these details already exists.")
    elif "foreign key" in err_str or "23503" in err_str:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Referenced entity does not exist or has conflicting associations.")
    elif "check constraint" in err_str or "23514" in err_str:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Data validation constraint failed.")
    elif "permission denied" in err_str or "access denied" in err_str or "42501" in err_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
    elif "connection" in err_str or "timeout" in err_str or "failed to connect" in err_str or "unreachable" in err_str:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service temporarily unavailable.")
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal database error occurred.")
