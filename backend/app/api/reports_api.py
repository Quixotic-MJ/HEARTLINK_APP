"""HL-085: the doctor-ready report, shown in the app as the Visit summary (app/services/health_report.py). Since 2026-11-12
the last 7 days are free for everyone (it replaced the old free weekly summary); 30 and 90 days stay Premium."""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.health_report import FREE_REPORT_DAYS, REPORT_DAYS, build_report
from app.services.premium import require_premium
from app.utils.security import get_current_user, verify_user_access

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/{user_id}")
def read_health_report(user_id: str, days: int = Query(default=30), current_user: dict = Depends(get_current_user)):
    verify_user_access(current_user, user_id)
    if days not in REPORT_DAYS:
        raise HTTPException(status_code=400, detail="Choose a 7-day, 30-day or 90-day report.")
    if days not in FREE_REPORT_DAYS:
        require_premium(current_user)
    return build_report(user_id, days)
