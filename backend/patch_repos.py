import os

files_to_patch = {
    'backend/app/db/repositories/meals.py': {
        'func': 'def list_user_meals(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:',
        'new_func': 'def list_user_meals(self, user_id: str, limit: Optional[int] = None, cutoff: Optional[str] = None) -> List[Dict[str, Any]]:',
        'replace_target': 'query = self.client.table("meal_logs").select("*").eq("user_id", uuid_val).order("logged_at", desc=True)',
        'replace_with': 'query = self.client.table("meal_logs").select("*").eq("user_id", uuid_val)\n            if cutoff:\n                query = query.gte("logged_at", cutoff)\n            query = query.order("logged_at", desc=True)'
    },
    'backend/app/db/repositories/exercises.py': {
        'func': 'def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:',
        'new_func': 'def list_user_logs(self, user_id: str, limit: Optional[int] = None, cutoff: Optional[str] = None) -> List[Dict[str, Any]]:',
        'replace_target': 'query = self.client.table("exercise_logs").select("*").eq("user_id", uuid_val).order("logged_at", desc=True)',
        'replace_with': 'query = self.client.table("exercise_logs").select("*").eq("user_id", uuid_val)\n            if cutoff:\n                query = query.gte("logged_at", cutoff)\n            query = query.order("logged_at", desc=True)'
    },
    'backend/app/db/repositories/sleep.py': {
        'func': 'def list_user_logs(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:',
        'new_func': 'def list_user_logs(self, user_id: str, limit: Optional[int] = None, cutoff: Optional[str] = None) -> List[Dict[str, Any]]:',
        'replace_target': 'query = self.client.table("sleep_logs").select("*").eq("user_id", uuid_val).eq("is_deleted", False).order("logged_at", desc=True)',
        'replace_with': 'query = self.client.table("sleep_logs").select("*").eq("user_id", uuid_val).eq("is_deleted", False)\n            if cutoff:\n                query = query.gte("logged_at", cutoff)\n            query = query.order("logged_at", desc=True)'
    },
    'backend/app/db/repositories/hss.py': {
        'func': 'def list_hss_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:',
        'new_func': 'def list_hss_history(self, user_id: str, limit: Optional[int] = None, cutoff: Optional[str] = None) -> List[Dict[str, Any]]:',
        'replace_target': 'query = self.client.table("hss_history").select("*").eq("user_id", uuid_val).order("computed_at", desc=True)',
        'replace_with': 'query = self.client.table("hss_history").select("*").eq("user_id", uuid_val)\n            if cutoff:\n                query = query.gte("computed_at", cutoff)\n            query = query.order("computed_at", desc=True)'
    }
}

for fpath, d in files_to_patch.items():
    if os.path.exists(fpath):
        with open(fpath, 'r') as f:
            content = f.read()
        content = content.replace(d['func'], d['new_func'])
        content = content.replace(d['replace_target'], d['replace_with'])
        with open(fpath, 'w') as f:
            f.write(content)
        print(f'Patched {fpath}')
