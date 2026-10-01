import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.db.client import get_supabase_client

def main():
    client = get_supabase_client()
    res = client.table("recipes").update({"status": "published"}).eq("status", "draft").execute()
    print(f"Updated recipes! Response: {res.data}")

if __name__ == "__main__":
    main()
