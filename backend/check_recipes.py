import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.db.client import get_supabase_client

def main():
    client = get_supabase_client()
    res = client.table("recipes").select("*").limit(1).execute()
    if res.data:
        print("Columns in recipes:", res.data[0].keys())

if __name__ == "__main__":
    main()
