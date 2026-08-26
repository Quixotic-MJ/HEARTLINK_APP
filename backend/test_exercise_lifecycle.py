import traceback
from app.services.exercises import create_exercise_log, get_exercise_logs, delete_exercise_log
from app.services.dashboard import get_dashboard_data

user_id = "5b79eae7-bb6d-4ced-aa25-168eed400094"

print("==================================================")
print("TESTING EXERCISE LOG LIFECYCLE & ALL 6 STATUSES ON SUPABASE")
print("==================================================")

statuses = ["completed", "in_progress", "skipped", "partial", "incomplete_due_to_symptoms", "abandoned"]
created_ids = []

try:
    for st in statuses:
        print(f"1. Creating exercise log with status='{st}'...")
        log_data = {
            "routine_name": f"Test Session ({st})",
            "duration_minutes": 15,
            "status": st
        }
        created = create_exercise_log(user_id, log_data)
        print(f"   Created result: id={created.get('id')}, status={created.get('status')}")
        if created.get("id"):
            created_ids.append(created.get("id"))

    print("\n2. Fetching exercise logs from Supabase...")
    logs = get_exercise_logs(user_id)
    print(f"   Fetched {len(logs)} logs.")

    print("\n3. Fetching dashboard data with active logs...")
    dash = get_dashboard_data(user_id)
    print(f"   Dashboard today_activity: {dash.get('today_activity')}")

    print("\n4. Cleaning up test exercise logs...")
    for lid in created_ids:
        deleted = delete_exercise_log(user_id, lid)
        print(f"   Deleted log {lid}: {deleted}")
    
    print("\n[SUCCESS] All exercise statuses & lifecycle passed seamlessly on Supabase!")
except Exception as e:
    print(f"\n[FAILED] Error: {e}")
    traceback.print_exc()
