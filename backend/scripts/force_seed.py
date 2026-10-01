import sys
import os
import logging

logging.basicConfig(level=logging.INFO)

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
# Load the .env file from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

from app.db.bootstrap import bootstrap_supabase_content

print("Starting force seed process...")
bootstrap_supabase_content()
print("Force seed process completed!")
