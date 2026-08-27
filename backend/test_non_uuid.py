from app.db.client import get_supabase_client
from app.db.repositories.exercises import SupabaseExercisesRepository
from app.db.repositories.base import handle_db_error

sb = get_supabase_client()
repo = SupabaseExercisesRepository(sb)

print("--- Testing non-UUID user_id ('usr-patient-101') in Supabase query ---")
try:
    res = sb.table("exercise_logs").select("*").eq("user_id", "usr-patient-101").execute()
    print("Direct query succeeded:", res.data)
except Exception as e:
    print("Direct query error:", e)

try:
    logs = repo.list_user_logs("usr-patient-101")
    print("Repo method succeeded:", logs)
except Exception as e:
    print("Repo method error (raised HTTPException):", e)
