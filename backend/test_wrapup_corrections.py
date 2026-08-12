import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.dashboard import get_7_day_wrap_up_data
from app.mock_db import exercise_logs, sleep_logs, daily_health_logs
from datetime import datetime, timedelta

def run_tests():
    user_id = "user_1"
    
    # 1. Timezone offset test - Pass a local date to get_7_day_wrap_up_data
    test_local_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    data = get_7_day_wrap_up_data(user_id, local_date_str=test_local_date)
    print(f"Timezone Test (Shifted +2 Days): Date Range is {data['date_range']['display']}")
    
    # 2. Abandoned Exercise Test
    # Let's insert a fake abandoned exercise for the user today
    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    exercise_logs.append({
        "id": "test_abandoned",
        "user_id": user_id,
        "routine_id": "r_3",
        "routine_name": "Test Run",
        "duration_minutes": 30,
        "status": "abandoned",
        "logged_at": now_str
    })
    
    # Let's insert a soft-deleted sleep log
    sleep_logs.append({
        "id": "test_deleted_sleep",
        "user_id": user_id,
        "duration_hours": 8,
        "quality": "Good",
        "logged_at": now_str,
        "deleted_at": now_str
    })
    
    # Re-run for today
    data_today = get_7_day_wrap_up_data(user_id)
    
    # Check abandoned exercise is in timeline but not active minutes
    abandoned_found = False
    for r in data_today["daily_records"]:
        for act in r.get("movement", []):
            if act.get("status") == "ABORTED / STOPPED — SYMPTOMS":
                abandoned_found = True
                
    timeline_exercises = [e for e in data_today["movement"]["records"] if e.get("status") == "ABORTED / STOPPED — SYMPTOMS"]
    print(f"Abandoned Exercise in Timeline: {len(timeline_exercises) > 0}")
    print(f"Movement Minutes: {data_today['overview']['movement_minutes']}")
    
    # Check deleted sleep is excluded
    sleep_found = any(s.get("id") == "test_deleted_sleep" for r in data_today["daily_records"] for s in r.get("sleep", []))
    print(f"Deleted Sleep Excluded: {not sleep_found}")

if __name__ == "__main__":
    run_tests()
    print("ALL TESTS COMPLETE")
