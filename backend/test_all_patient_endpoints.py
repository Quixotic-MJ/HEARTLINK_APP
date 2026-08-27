import traceback
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token

user_id = "5b79eae7-bb6d-4ced-aa25-168eed400094"
token = create_access_token(data={"user_id": user_id, "role": "patient"})
headers = {"Authorization": f"Bearer {token}"}
client = TestClient(app, raise_server_exceptions=False)

endpoints = [
    ("GET", f"/api/users/{user_id}/profile"),
    ("GET", "/api/dashboard/me"),
    ("GET", "/api/dashboard/wrapup"),
    ("GET", "/api/exercises/"),
    ("GET", f"/api/exercises/logs/{user_id}"),
    ("GET", "/api/recipes/"),
    ("GET", f"/api/health-logs/{user_id}"),
    ("GET", f"/api/sleep-logs/{user_id}"),
    ("GET", f"/api/meals/{user_id}"),
    ("GET", f"/api/notifications/{user_id}"),
    ("GET", "/api/notifications/broadcasts"),
    ("GET", f"/api/analytics/{user_id}"),
    ("GET", "/api/clinics"),
    ("GET", f"/api/users/{user_id}/reminders"),
]

print("==================================================")
print(f"TESTING ALL PATIENT API ENDPOINTS FOR {user_id}")
print("==================================================")

failures = 0
for method, url in endpoints:
    if method == "GET":
        res = client.get(url, headers=headers)
        status_flag = "[OK]  " if res.status_code == 200 else f"[{res.status_code}]"
        print(f"{status_flag} {method} {url}")
        if res.status_code != 200:
            failures += 1
            print(f"      Response ({res.status_code}): {res.text}")

print("==================================================")
if failures == 0:
    print("ALL MOBILE PATIENT ENDPOINTS RETURNED 200 OK!")
else:
    print(f"TOTAL FAILURES: {failures}")
print("==================================================")
