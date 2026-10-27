"""HL-085: the doctor-ready health report, a HeartLink Premium feature (app/services/health_report.py)."""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.health_report import REPORT_DAYS, build_report
from app.services.premium import require_premium
from app.utils.security import verify_user_access

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/{user_id}")
def read_health_report(user_id: str, days: int = Query(default=30), current_user: dict = Depends(require_premium)):
    verify_user_access(current_user, user_id)
    if days not in REPORT_DAYS:
        raise HTTPException(status_code=400, detail="Choose a 30-day or 90-day report.")
    return build_report(user_id, days)
