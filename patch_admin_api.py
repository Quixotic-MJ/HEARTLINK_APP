import os

with open('backend/app/api/admin_api/admin_api.py', 'r') as f:
    content = f.read()

start_marker = '@router.get("/dashboard", response_model=Dict[str, Any])\ndef get_admin_dashboard(current_user: dict = Depends(get_current_admin_user)):'
end_marker = '        "recent_activity": recent_activity\n    }'

new_func = '''@router.get("/dashboard", response_model=Dict[str, Any])
def get_admin_dashboard(current_user: dict = Depends(get_current_admin_user)):
    try:
        supabase_client = get_supabase_client()
        # Call the PostgreSQL function for fast native aggregation (HL-003)
        res = supabase_client.rpc("get_admin_dashboard_stats", {"days_cutoff": 7}).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Dashboard RPC returned empty data")
        
        dashboard_data = res.data
        
        # Recent Admin Activity still loaded via Python (small payload)
        admin_activity = get_admin_repo().list_activity(limit=10)
        recent_activity = []
        for act in admin_activity:
            recent_activity.append({
                "id": act.get("id"),
                "admin_user_id": act.get("admin_user_id"),
                "admin_name": act.get("admin_name"),
                "action": act.get("action"),
                "target_type": act.get("target_type"),
                "target_id": act.get("target_id"),
                "target_name": act.get("target_name"),
                "created_at": act.get("created_at")
            })
            
        dashboard_data["recent_activity"] = recent_activity
        return dashboard_data
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        print(f"[Dashboard Error] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {e}")'''

start_idx = content.find(start_marker)
end_idx = content.find(end_marker) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_func + content[end_idx:]
    with open('backend/app/api/admin_api/admin_api.py', 'w') as f:
        f.write(new_content)
    print('Patched successfully')
else:
    print('Failed to find markers')
