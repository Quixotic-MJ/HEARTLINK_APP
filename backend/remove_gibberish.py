import sys
import os
import httpx
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    # 1. Fetch recipes
    resp = httpx.get(f"{url}/rest/v1/recipes?select=id,name", headers=headers)
    recipes = resp.json()
    
    gibberish_keywords = ["test", "asdf", "giberish", "dummy", "fds", "fsdf", "ewq", "qwe"]
    
    deleted_count = 0
    for r in recipes:
        name = r.get("name", "").lower()
        if not name:
            continue
        is_gibberish = False
        # If it contains gibberish keyword or is too short without vowels
        if any(keyword in name for keyword in gibberish_keywords):
            is_gibberish = True
        
        if is_gibberish:
            print(f"Deleting recipe: {r['name']} (ID: {r['id']})")
            del_resp = httpx.delete(f"{url}/rest/v1/recipes?id=eq.{r['id']}", headers=headers)
            if del_resp.status_code in [200, 204]:
                deleted_count += 1
            else:
                print(f"Failed to delete {r['id']}: {del_resp.status_code}")
                
    print(f"Deleted {deleted_count} gibberish recipes.")
    
    # 2. Let's also check user_food_logs
    print("Checking food logs...")
    resp_logs = httpx.get(f"{url}/rest/v1/user_food_logs?select=id,food_name", headers=headers)
    if resp_logs.status_code == 200:
        logs = resp_logs.json()
        del_log_count = 0
        for l in logs:
            name = l.get("food_name", "").lower()
            if any(keyword in name for keyword in gibberish_keywords):
                print(f"Deleting log: {l['food_name']} (ID: {l['id']})")
                del_resp = httpx.delete(f"{url}/rest/v1/user_food_logs?id=eq.{l['id']}", headers=headers)
                if del_resp.status_code in [200, 204]:
                    del_log_count += 1
        print(f"Deleted {del_log_count} gibberish food logs.")
    else:
        print("Failed to fetch food logs:", resp_logs.status_code)

if __name__ == "__main__":
    main()
