from datetime import datetime, timezone, timedelta, date
from app.utils.time import utc_now, parse_utc, to_local_date, UTC_MIN

def test_utc_now_isoformat():
    dt = utc_now()
    assert dt.tzinfo is timezone.utc
    assert dt.isoformat().endswith("+00:00")

def test_parse_utc_z_string():
    dt = parse_utc("2026-10-06T22:00:00Z")
    assert dt is not None
    assert dt.tzinfo is timezone.utc
    assert dt.hour == 22

def test_parse_utc_naive_string():
    dt = parse_utc("2026-10-06T22:00:00")
    assert dt is not None
    assert dt.tzinfo is timezone.utc
    assert dt.hour == 22

def test_parse_utc_aware_non_utc():
    # 22:00 in +08:00 is 14:00 UTC
    dt = parse_utc("2026-10-06T22:00:00+08:00")
    assert dt is not None
    assert dt.tzinfo is timezone.utc
    assert dt.hour == 14

def test_parse_utc_none_or_garbage():
    assert parse_utc(None) is None
    assert parse_utc("garbage") is None

def test_aware_vs_aware_comparison():
    dt = parse_utc("2026-10-06T22:00:00Z")
    now = utc_now()
    # Comparison should not raise an error
    assert dt < now
    
    # Comparison with cutoff
    cutoff = now - timedelta(days=7)
    assert dt > UTC_MIN
    assert UTC_MIN < cutoff

def test_manila_bucketing():
    # 2026-10-06 22:00:00 UTC is 2026-10-07 06:00:00 Manila time
    dt = parse_utc("2026-10-06T22:00:00Z")
    local_dt = to_local_date(dt, tz_name="Asia/Manila")
    assert local_dt == date(2026, 10, 7)
