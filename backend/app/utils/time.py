from datetime import datetime, timezone, date
import zoneinfo
from typing import Any, Optional

UTC_MIN = datetime.min.replace(tzinfo=timezone.utc)

def utc_now() -> datetime:
    """Returns a timezone-aware UTC datetime for the current time."""
    return datetime.now(timezone.utc)

def parse_utc(val: Any) -> Optional[datetime]:
    """
    Parses a datetime or ISO format string into an aware UTC datetime.
    A naive input is assumed to be UTC. An aware input is converted to UTC.
    Returns None on failure.
    """
    if val is None:
        return None
        
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)
        
    if isinstance(val, str):
        try:
            # Handle standard ISO format and trailing "Z" for UTC
            s = val.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None
            
    return None

def to_local_date(dt: datetime, tz_name: str = "Asia/Manila") -> date:
    """
    Converts a UTC datetime (aware or naive assumed UTC) to a local date
    based on the provided timezone name.
    """
    if dt is None:
        return UTC_MIN.date()
        
    # Ensure dt is aware UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
        
    try:
        tz = zoneinfo.ZoneInfo(tz_name)
    except zoneinfo.ZoneInfoNotFoundError:
        # Fallback to UTC if timezone is not found
        tz = timezone.utc
        
    return dt.astimezone(tz).date()
