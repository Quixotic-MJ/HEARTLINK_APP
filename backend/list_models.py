import os
from dotenv import load_dotenv
import groq

load_dotenv(r"c:\Users\JOHN MARK MAGDASAL\OneDrive\Desktop\CTU main\CAPSTONE-2\backend\.env")

client = groq.Groq(api_key=os.environ.get("GROQ_API_KEY"))
models = client.models.list()
for m in models.data:
    print(m.id)
