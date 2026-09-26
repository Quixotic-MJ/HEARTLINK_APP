from app.db.client import get_supabase_client
import json

try:
    sb = get_supabase_client()
    print("Connected to Supabase")
    
    with open('app/db/seed_content.json', encoding='utf-8') as f:
        data = json.load(f)
    
    print("Deleting old clinics...")
    # Hack to delete all: delete where name is not empty
    sb.table("clinics").delete().neq("name", "").execute()
    
    print("Inserting new clinics...")
    clinics_to_seed = []
    for c in data.get("clinics", []):
        clinics_to_seed.append({
            "legacy_id": str(c.get("id")),
            "name": c.get("name"),
            "doctor": c.get("doctor"),
            "latitude": float(c.get("latitude")),
            "longitude": float(c.get("longitude")),
            "phone": c.get("phone"),
            "specialty": c.get("specialty")
        })
    
    if clinics_to_seed:
        # Supabase API limits batch insert to 1000, 41 is fine
        sb.table("clinics").insert(clinics_to_seed).execute()
        print(f"Successfully inserted {len(clinics_to_seed)} clinics into live database!")
except Exception as e:
    print("Error:", e)
