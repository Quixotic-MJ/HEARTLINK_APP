# HeartLink — Render Deployment Guide & Operational Runbook

This document details the verified deployment configuration and smoke-testing runbook for hosting the **HeartLink FastAPI Backend Gateway** on **Render** backed by **Supabase (PostgreSQL, Auth, Storage)**.

---

## 1. Render Service Specifications

| Setting | Configuration Value |
| :--- | :--- |
| **Service Type** | Web Service |
| **Service Name** | `heartlink-api` |
| **Runtime / Environment** | `Python` |
| **Python Version** | `3.11.9` (declared in `backend/.python-version`) |
| **Region** | `Singapore (Southeast Asia)` *(closest to Philippines deployment)* |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` (or `/api/health`) |
| **Auto-Deploy** | `Yes` (triggers on push to selected branch) |

---

## 2. Environment Variables Configuration

Configure these variables in the **Environment** tab of the Render dashboard. Never commit actual credentials to Git.

| Variable Name | Scope | Sensitivity | Classification | Description |
| :--- | :---: | :---: | :---: | :--- |
| `DATABASE_MODE` | Server-Only | Non-Sensitive | **Required** | Must be set to `supabase` for production persistence. |
| `SUPABASE_URL` | Server-Only | Low | **Required** | HTTPS URL of your Supabase project (e.g. `https://ftzqfojapetmahxfecbm.supabase.co`). |
| `SUPABASE_ANON_KEY` | Server-Only | Low | **Required** | Supabase publishable anonymous key. |
| `SUPABASE_SERVICE_ROLE_KEY`| Server-Only | **CRITICAL SECRET**| **Required** | Supabase service-role secret key. *Never expose to clients.* |
| `SECRET_KEY` | Server-Only | **CRITICAL SECRET**| **Required** | 32+ character random cryptographic secret for signing application JWT tokens. |
| `ALGORITHM` | Server-Only | Non-Sensitive | **Required** | Token cryptographic algorithm (default: `HS256`). |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Server-Only | Non-Sensitive | **Required** | Token lifetime in hours (default: `24`). |
| `CORS_ALLOWED_ORIGINS` | Server-Only | Low | **Required** | Comma-separated allowed frontend origins (e.g. `https://your-admin-portal.onrender.com,https://your-web-portal.vercel.app,http://localhost:5173`). |
| `INVITED_TESTER_NUMBERS` | Server-Only | Low | Optional | Comma-separated E.164 tester phone numbers permitted during beta testing phases. |
| `SUPABASE_JWT_SECRET` | Server-Only | **CRITICAL SECRET**| Optional | Supabase direct JWT signing secret (if decoding Supabase Auth direct client tokens). |

---

## 3. Step-by-Step Deployment Procedure

```text
[1. GitHub Push] ───────► [2. Render Web Service] ───────► [3. Env Configuration]
                                                                    │
[6. Smoke Tests] ◄─────── [5. Service Health /docs] ◄─────── [4. Automated Build]
```

1. **Connect Repository**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) $\rightarrow$ **New +** $\rightarrow$ **Web Service**.
   - Connect your GitHub repository `Quixotic-MJ/HEARTLINK_APP`.
2. **Apply Service Settings**:
   - Set **Root Directory** to `backend`.
   - Set **Build Command** to `pip install -r requirements.txt`.
   - Set **Start Command** to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. **Configure Environment Variables**:
   - Enter all required keys listed in Section 2 above into the Render environment settings.
4. **Trigger Initial Deployment**:
   - Click **Create Web Service**.
   - Monitor the deployment logs for successful `pip install` and Uvicorn startup.
5. **Verify Endpoint Accessibility**:
   - Open `https://<your-render-url>/health` $\rightarrow$ should return `{"status": "ok"}`.
   - Open `https://<your-render-url>/docs` $\rightarrow$ verify FastAPI OpenAPI documentation loads.

---

## 4. Post-Deployment Smoke Test Protocol

Run these verification tests against your live Render URL (`$RENDER_URL`):

### 4.1 System & Content Probes
```bash
# 1. Health Probe
curl -X GET "$RENDER_URL/health"
# Expected: 200 OK {"status": "ok"}

# 2. Public Content
curl -X GET "$RENDER_URL/api/clinics"
# Expected: 200 OK (List of active clinic records from Supabase)
```

### 4.2 Authentication & User Security
```bash
# 3. Request Registration OTP (Whitelisted Tester)
curl -X POST "$RENDER_URL/api/auth/request-code" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+639171234567", "email": "tester@heartlink.ph", "password": "Password123!"}'
# Expected: 200 OK {"success": true, "message": "..."}

# 4. Verify Registration Code
curl -X POST "$RENDER_URL/api/auth/verify-code" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+639171234567", "code": "123456"}'
# Expected: 200 OK {"access_token": "...", "token_type": "bearer", "user": {...}}

# 5. User Login
curl -X POST "$RENDER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+639171234567", "password": "Password123!"}'
# Expected: 200 OK {"access_token": "...", "token_type": "bearer"}
```

### 4.3 Patient Clinical Data & Health Telemetry
```bash
# 6. Fetch User Profile
curl -X GET "$RENDER_URL/api/users/<USER_ID>/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# Expected: 200 OK (Returns sanitized profile without credentials)

# 7. Complete Baseline Onboarding & Trigger ML HSS Calculation
curl -X POST "$RENDER_URL/api/users/<USER_ID>/baseline-onboarding" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"answers": {"q1_age": 45, "q2_gender": "Male", "q3_vigorous_work": "No", ...}}'
# Expected: 200 OK (Calculates HSS score 1-100, assigns tier, saves to hss_history)

# 8. Log Vitals / Health Metric
curl -X POST "$RENDER_URL/api/health-logs/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"systolic_bp": 120, "diastolic_bp": 80, "heart_rate": 72, "blood_sugar": 95}'
# Expected: 200 OK

# 9. Log Meal
curl -X POST "$RENDER_URL/api/meals/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"meal_type": "Breakfast", "food_items": ["Oatmeal", "Banana"], "calories": 350}'
# Expected: 200 OK

# 10. Log Sleep
curl -X POST "$RENDER_URL/api/sleep/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration_hours": 7.5, "quality": "Good"}'
# Expected: 200 OK

# 11. Log Exercise
curl -X POST "$RENDER_URL/api/exercises/logs" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"routine_name": "Brisk Walk", "duration_minutes": 30, "duration_seconds": 1800, "status": "completed"}'
# Expected: 200 OK
```

### 4.4 Storage Uploads
```bash
# 12. Upload Avatar to Supabase Storage
curl -X POST "$RENDER_URL/api/upload/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@avatar.png;type=image/png" \
  -F "bucket=avatars"
# Expected: 200 OK {"url": "https://ftzqfojapetmahxfecbm.supabase.co/storage/v1/object/public/avatars/...", ...}
```

### 4.5 Admin & Medical Expert Workflows
```bash
# 13. Admin Staff Login
curl -X POST "$RENDER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@heartlink.ph", "password": "AdminPassword123!"}'
# Expected: 200 OK (Returns admin token with role="admin")

# 14. Admin Notification Feed
curl -X GET "$RENDER_URL/api/admin/notifications" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN"
# Expected: 200 OK

# 15. Medical Expert Case Review Feed
curl -X GET "$RENDER_URL/api/expert/cases" \
  -H "Authorization: Bearer $EXPERT_ACCESS_TOKEN"
# Expected: 200 OK
```

---

## 5. Deployment Verification Status

| Domain | Status | Evidence |
| :--- | :---: | :--- |
| **Render Web Service Configuration** | `VERIFIED` | `render.yaml`, `backend/.python-version`, Uvicorn host/port binding |
| **Supabase PostgreSQL (26 Tables)** | `VERIFIED` | `validate_live_supabase_schema.py` (0 errors) |
| **Supabase Storage (3 Buckets)** | `VERIFIED` | `avatars`, `recipes`, `exercises` buckets provisioned and active |
| **HSS Machine Learning Engine** | `VERIFIED` | `app/ml/heartlink_model.pkl` NHANES pipeline verified |
| **Pre-Flight Validation Suite** | `VERIFIED` | `validate_render_deployment.py` $\rightarrow$ 8/8 checks passed |
| **Automated Unit & E2E Tests** | `VERIFIED` | `test_render_deployment_readiness.py` + full test suite passed (94 tests OK) |
| **Mobile Client Compatibility** | `VERIFIED` | `HeartLink-mobile` TypeScript compilation: 0 errors |
| **Web Admin / Expert Portal** | `VERIFIED` | `HeartLink-web` Vite production bundle built (exit code 0) |
