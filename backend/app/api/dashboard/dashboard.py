from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Any, Dict
from app.services.dashboard import get_dashboard_data, get_7_day_wrap_up_data

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Mock JWT validation - normally you'd decode the JWT here
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token  # For our mock, the token is just the userId

@router.get("/me", response_model=Dict[str, Any])
def get_dashboard(user_id: str = Depends(get_current_user)):
    data = get_dashboard_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Dashboard data not found")
    return data

@router.get("/wrapup", response_model=Dict[str, Any])
def get_wrapup(local_date: str = None, user_id: str = Depends(get_current_user)):
    data = get_7_day_wrap_up_data(user_id, local_date)
    if not data:
        raise HTTPException(status_code=404, detail="Wrap-up data not found")
    return data
