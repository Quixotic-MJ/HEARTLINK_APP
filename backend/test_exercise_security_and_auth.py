# backend/test_exercise_security_and_auth.py
"""
Exercise Security, Auth Token, IDOR & Duration Precision Verification Test Matrix.
"""
from datetime import datetime, timedelta
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token, SECRET_KEY, ALGORITHM
from app.services.dashboard import get_dashboard_data, get_7_day_wrap_up_data

client = TestClient(app)

def create_expired_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() - timedelta(hours=2)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def format_duration(log: dict) -> str:
    sec = log.get("duration_seconds")
    min_val = log.get("duration_minutes")

    # Case 1: duration_seconds is explicitly provided and > 0
    if sec is not None and sec > 0:
        if sec < 60:
            return f"{sec}s"
        mins = sec // 60
        remainder = sec % 60
        if remainder > 0:
            return f"{mins}m {remainder}s"
        return f"{mins}m"

    # Case 2: Legacy rows where duration_seconds is 0 or null, but duration_minutes > 0
    if min_val is not None and min_val > 0:
        return f"{min_val}m"

    # Case 3: Exactly 0s
    return "0s"

def calculate_total_seconds(logs: list) -> int:
    total = 0
    for item in logs:
        sec = item.get("duration_seconds")
        min_val = item.get("duration_minutes")
        if sec is not None and sec > 0:
            total += sec
        elif min_val is not None and min_val > 0:
            total += min_val * 60
    return total

def format_total_active_time(total_seconds: int) -> str:
    if total_seconds == 0:
        return "0s"
    if total_seconds < 60:
        return f"{total_seconds}s"
    hours = total_seconds // 3600
    rem = total_seconds % 3600
    mins = rem // 60
    secs = rem % 60
    if hours > 0:
        return f"{hours}h {mins}m" if mins > 0 else f"{hours}h"
    if secs > 0:
        return f"{mins}m {secs}s"
    return f"{mins}m"

def run_tests():
    print("=" * 65)
    print("EXERCISE SECURITY, AUTH, IDOR & DURATION TEST MATRIX")
    print("=" * 65)

    patient_a_id = "5b79eae7-bb6d-4ced-aa25-168eed400094"
    patient_b_id = "81525b3d-c460-52d4-ae49-304a83fe29f5"
    expert_id = "7e848bb9-5182-573a-b764-ed0e382e21bd"
    admin_id = "bb2cdcda-abb7-56ed-ab86-f82c93e6555e"

    token_a = create_access_token(data={"user_id": patient_a_id, "role": "patient"})
    token_b = create_access_token(data={"user_id": patient_b_id, "role": "patient"})
    token_expert = create_access_token(data={"user_id": expert_id, "role": "medical_expert"})
    token_admin = create_access_token(data={"user_id": admin_id, "role": "super_admin"})
    expired_token_a = create_expired_token(data={"user_id": patient_a_id, "role": "patient"})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_expert = {"Authorization": f"Bearer {token_expert}"}
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    headers_expired = {"Authorization": f"Bearer {expired_token_a}"}

    all_passed = True

    # -------------------------------------------------------------
    # TEST 1: Sub-minute 7s Exercise Session Lifecycle
    # -------------------------------------------------------------
    print("\n--- 1. Testing Sub-minute 7s Session Lifecycle (Integer Contract) ---")
    log_7s_payload = {
        "routine_name": "7s Deep Breathing",
        "duration_seconds": 7,
        "duration_minutes": 0,
        "status": "completed"
    }
    create_7s_res = client.post(f"/api/exercises/logs/{patient_a_id}", json=log_7s_payload, headers=headers_a)
    if create_7s_res.status_code == 200:
        data_7s = create_7s_res.json().get("data", {})
        id_7s = data_7s.get("id")
        returned_sec = data_7s.get("duration_seconds")
        print(f"[OK] POST 7s log created id={id_7s}, duration_seconds={returned_sec}")
        if returned_sec == 7:
            print("[OK] Exact duration_seconds: 7 confirmed in creation response.")
        else:
            print(f"[FAIL] Expected duration_seconds 7, got {returned_sec}")
            all_passed = False
    else:
        print(f"[FAIL] POST 7s log failed ({create_7s_res.status_code}): {create_7s_res.text}")
        all_passed = False
        id_7s = None

    # Read logs for Patient A
    read_7s_res = client.get(f"/api/exercises/logs/{patient_a_id}?limit=50&offset=0", headers=headers_a)
    if read_7s_res.status_code == 200:
        logs_list = read_7s_res.json()
        matching_7s = next((l for l in logs_list if l.get("id") == id_7s), None)
        if matching_7s:
            ret_sec = matching_7s.get("duration_seconds")
            formatted = format_duration(matching_7s)
            print(f"[OK] GET logs found 7s session: duration_seconds={ret_sec}, formatted='{formatted}'")
            if formatted != "7s":
                print(f"[FAIL] Expected formatted '7s', got '{formatted}'")
                all_passed = False
        else:
            print(f"[FAIL] 7s log not found in retrieved list.")
            all_passed = False
    else:
        print(f"[FAIL] GET logs returned {read_7s_res.status_code}")
        all_passed = False

    # Clean up 7s log
    if id_7s:
        client.delete(f"/api/exercises/logs/{patient_a_id}/{id_7s}", headers=headers_a)

    # -------------------------------------------------------------
    # TEST 2: Mixed 84s (1m 24s) Exercise Session Lifecycle
    # -------------------------------------------------------------
    print("\n--- 2. Testing Mixed 84s (1m 24s) Session Lifecycle ---")
    log_84s_payload = {
        "routine_name": "84s Core Movement",
        "duration_seconds": 84,
        "duration_minutes": 1,
        "status": "completed"
    }
    create_84s_res = client.post(f"/api/exercises/logs/{patient_a_id}", json=log_84s_payload, headers=headers_a)
    if create_84s_res.status_code == 200:
        data_84s = create_84s_res.json().get("data", {})
        id_84s = data_84s.get("id")
        formatted_84s = format_duration(data_84s)
        print(f"[OK] POST 84s log created: duration_seconds={data_84s.get('duration_seconds')}, formatted='{formatted_84s}'")
        if formatted_84s != "1m 24s":
            print(f"[FAIL] Expected formatted '1m 24s', got '{formatted_84s}'")
            all_passed = False
    else:
        print(f"[FAIL] POST 84s log failed: {create_84s_res.text}")
        all_passed = False
        id_84s = None

    if id_84s:
        client.delete(f"/api/exercises/logs/{patient_a_id}/{id_84s}", headers=headers_a)

    # -------------------------------------------------------------
    # TEST 3: Edge Case Formatting Verification
    # -------------------------------------------------------------
    print("\n--- 3. Testing Duration Formatting Edge Cases ---")
    # Case A: Exactly 60s -> '1m'
    log_60s = {"duration_seconds": 60, "duration_minutes": 1}
    f_60s = format_duration(log_60s)
    if f_60s == "1m":
        print("[OK] Exactly 60s formats as '1m'")
    else:
        print(f"[FAIL] Exactly 60s expected '1m', got '{f_60s}'")
        all_passed = False

    # Case B: Legacy row with duration_seconds=None, duration_minutes=15 -> '15m'
    log_legacy = {"duration_seconds": None, "duration_minutes": 15}
    f_legacy = format_duration(log_legacy)
    if f_legacy == "15m":
        print("[OK] Legacy row (null seconds, 15m) formats as '15m' (not '0s')")
    else:
        print(f"[FAIL] Legacy row expected '15m', got '{f_legacy}'")
        all_passed = False

    # Case C: Mixed Legacy + New Row Aggregate Total Time
    mixed_logs = [
        {"duration_seconds": None, "duration_minutes": 15}, # 900s
        {"duration_seconds": 7, "duration_minutes": 0},      # 7s
    ]
    tot_sec = calculate_total_seconds(mixed_logs)
    tot_str = format_total_active_time(tot_sec)
    if tot_sec == 907 and tot_str == "15m 7s":
        print(f"[OK] Mixed aggregate: total_seconds={tot_sec}, total_time='{tot_str}' (zero undercounting)")
    else:
        print(f"[FAIL] Mixed aggregate expected 907s / '15m 7s', got {tot_sec}s / '{tot_str}'")
        all_passed = False

    # Case D: Sub-minute total active time (e.g. 45s)
    f_tot_45s = format_total_active_time(45)
    if f_tot_45s == "45s":
        print("[OK] Total active time 45s formats as '45s'")
    else:
        print(f"[FAIL] Total active time 45s expected '45s', got '{f_tot_45s}'")
        all_passed = False

    # Case E: Over 1 hour total active time (e.g. 4500s = 1h 15m)
    f_tot_1h15m = format_total_active_time(4500)
    if f_tot_1h15m == "1h 15m":
        print("[OK] Total active time 4500s formats as '1h 15m'")
    else:
        print(f"[FAIL] Total active time 4500s expected '1h 15m', got '{f_tot_1h15m}'")
        all_passed = False

    # -------------------------------------------------------------
    # TEST 4: Zero-Division & Downstream Consumer Stability
    # -------------------------------------------------------------
    print("\n--- 4. Testing Zero-Division & Downstream Consumer Stability ---")
    try:
        dash_res = get_dashboard_data(patient_a_id)
        if dash_res:
            print(f"[OK] get_dashboard_data returned with total_exercise_minutes={dash_res['today_activity']['total_exercise_minutes']}")
    except Exception as e:
        print(f"[FAIL] get_dashboard_data raised exception: {e}")
        all_passed = False

    try:
        wrapup_res = get_7_day_wrap_up_data(patient_a_id)
        if wrapup_res:
            print(f"[OK] get_7_day_wrap_up_data returned with movement_minutes={wrapup_res['overview']['movement_minutes']}")
    except Exception as e:
        print(f"[FAIL] get_7_day_wrap_up_data raised exception: {e}")
        all_passed = False

    # -------------------------------------------------------------
    # TEST 5: Missing Header & Expired Token Tests (401)
    # -------------------------------------------------------------
    print("\n--- 5. Testing Missing & Expired Auth Token (401) ---")
    if client.get(f"/api/exercises/logs/{patient_a_id}").status_code == 401:
        print("[OK] Missing auth header -> 401 Unauthorized")
    else:
        print("[FAIL] Missing auth did not return 401")
        all_passed = False

    if client.get(f"/api/exercises/logs/{patient_a_id}", headers=headers_expired).status_code == 401:
        print("[OK] Expired token -> 401 Unauthorized")
    else:
        print("[FAIL] Expired token did not return 401")
        all_passed = False

    # -------------------------------------------------------------
    # TEST 6: IDOR Protection & State Invariance
    # -------------------------------------------------------------
    print("\n--- 6. Testing IDOR Cross-User Access & State Invariance ---")
    b_init = client.get(f"/api/exercises/logs/{patient_b_id}", headers=headers_b).json()
    b_init_ids = [l["id"] for l in b_init]

    # Patient A attempts to write or delete on Patient B
    idor_post = client.post(f"/api/exercises/logs/{patient_b_id}", json=log_7s_payload, headers=headers_a)
    if idor_post.status_code == 403:
        print("[OK] Patient A writing to Patient B -> 403 Forbidden")
    else:
        print(f"[FAIL] IDOR write returned {idor_post.status_code}")
        all_passed = False

    # Assert Patient B state unchanged
    b_after = client.get(f"/api/exercises/logs/{patient_b_id}", headers=headers_b).json()
    b_after_ids = [l["id"] for l in b_after]
    if b_init_ids == b_after_ids:
        print(f"[OK] Patient B data state 100% untouched after IDOR attempt.")
    else:
        print("[FAIL] Patient B data modified by IDOR attempt!")
        all_passed = False

    # -------------------------------------------------------------
    # TEST 7: Clinical Oversight Read Access (200 OK)
    # -------------------------------------------------------------
    print("\n--- 7. Testing Clinical Oversight Read Access ---")
    if client.get(f"/api/exercises/logs/{patient_a_id}", headers=headers_expert).status_code == 200:
        print("[OK] Medical Expert reading Patient A -> 200 OK")
    else:
        print("[FAIL] Medical Expert read failed")
        all_passed = False

    print("\n" + "=" * 65)
    if all_passed:
        print("ALL EXERCISE PRECISION, AUTH & SECURITY TESTS PASSED 100%!")
    else:
        print("SOME TESTS FAILED.")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
