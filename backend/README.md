# HeartLink - Backend API

The core backend for HeartLink, built with FastAPI. It is the only part of the system that talks to the database: the mobile app and web portal both go through it. It handles logins and permissions, health data, the Heart Stability Score (HSS), case review, and AI insights.

---

## 🛠️ Tech Stack & Requirements

* **Runtime:** Python 3.11
* **Framework:** FastAPI, served by Uvicorn
* **Database, Auth & Storage:** Supabase (PostgreSQL, Supabase Auth, Supabase Storage) through the service-role key
* **Scoring:** scikit-learn Logistic Regression (`app/ml/heartlink_model.pkl`) plus guideline-based blood-pressure rules and lifestyle points
* **AI insights:** Groq API (dashboard insights; optional Companion chat)
* **Security:** PyJWT, slowapi (rate limiting), Pydantic v2 validation
* **Tests:** pytest

## 📁 Directory Layout

```text
backend/
├── app/
│   ├── main.py              # Starts the server and connects all the routes.
│   ├── api/                 # The "doorways" the mobile app and web portal call.
│   │   ├── auth/            # Sign-up, login, logout, web portal session (HttpOnly cookie).
│   │   ├── users/           # Patient profile, baseline answers, password change.
│   │   ├── dashboard/       # Daily dashboard data and insights for the mobile app.
│   │   ├── health_logs/, meals/, exercises/, sleep_logs/   # What patients log each day.
│   │   ├── recipes_api/, notifications_api/, analytics_api/, companion/
│   │   └── admin_api/       # Web portal: users, staff, content, case review queue, calibration.
│   ├── services/            # The rules and calculations.
│   │   ├── hss_service.py       # Heart Stability Score (model, blood-pressure rules, lifestyle points).
│   │   ├── feature_transform.py # Turns onboarding answers into the model's 37 inputs.
│   │   ├── review_rules.py      # Case review queue thresholds (proposed values, pending the cardiologist).
│   │   ├── review_queue.py      # Urgent / sample / re-review lanes.
│   │   ├── review_sections.py   # Cardiologist, Dietitian and PT parts of a review.
│   │   ├── auth_service.py      # Sign-up codes, login, password checks.
│   │   └── storage_service.py   # Uploaded images and videos.
│   ├── db/                  # Database access.
│   │   ├── client.py        # The Supabase connection.
│   │   ├── repositories/    # One file per area (profiles, meals, case review, …).
│   │   └── bootstrap.py     # Adds starter content (clinics, recipes) on startup if missing.
│   ├── ml/heartlink_model.pkl   # The trained baseline model.
│   ├── schemas/             # Rules that check data coming in and going out.
│   └── utils/               # Shared helpers: security.py (logins, roles), phone.py, time.py, rate limiter.
├── supabase/
│   ├── migrations/          # Every database change, numbered (001_…sql to 023_…sql).
│   ├── seed/                # Sample content (clinics, exercises, recipes).
│   └── README.md            # How to change the database with the Supabase CLI.
├── scripts/                 # One-off tools: data checks, seeding, offline model training.
├── tests/                   # Automated tests (pytest).
├── static/                  # Local fallback folder for uploads.
├── Dockerfile               # Used by Railway and by docker-compose.
├── requirements.txt
└── .env.example             # Template for your .env file.
```

## ⚙️ Environment Variables

```bash
cp .env.example .env
```

| Key | What it does | Required | Example |
|-----|--------------|----------|---------|
| `DATABASE_MODE` | Use the Supabase database | Yes | `supabase` |
| `SUPABASE_URL` | Supabase project address | Yes | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase master key. **Backend only, never in an app.** | Yes | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | Public key, used only for password checks | Yes | `eyJhbGci...` |
| `SECRET_KEY` | Signs login tokens. The server will not start without it. | Yes | a long random string |
| `ALGORITHM` | Token signing method | Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Token lifetime setting | Yes | `24` |
| `CORS_ALLOWED_ORIGINS` | Websites allowed to call the API | Yes | `http://localhost:5173` |
| `ENVIRONMENT` | `production` on Railway: hides `/docs`, applies production rules | Production | `production` |
| `COOKIE_SECURE` | Web portal login cookie needs https. Set `false` only for local http. | No (default `true`) | `false` |
| `TRUSTED_PROXY_HOPS` | Proxies in front of the server, for rate-limiting by real IP. Railway only = `1`, Vercel → Railway = `2`. | No (default `0`) | `2` |
| `DEV_OTP_ENABLED` | Sign-up with one shared code (no SMS yet). On locally, off in production unless set. | No | `true` |
| `DEV_OTP_CODE` | The shared 6-digit sign-up code. Locally `123456`; in production it must be set and must not be `123456`. | Production, if sign-up is on | `482913` |
| `GROQ_API_KEY` | Dashboard insight text | Optional | `gsk_...` |
| `COMPANION_LLM_ENABLED`, `COMPANION_LLM_API_KEY` | Companion chat (off by default) | Optional | `true`, `gsk_...` |
| `SUPABASE_JWT_SECRET` | Accept Supabase-issued tokens directly | Optional | |

Never commit `.env`. Git ignores it.

## 🚀 Local Setup

**With Docker:** see [../DOCKER.md](../DOCKER.md).

**Without Docker:**
1. Create a virtual environment (recommended):
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
2. Install the packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   `--host 0.0.0.0` is what lets a phone on the same Wi-Fi reach it. Without it, only your computer can connect.
4. Check it: http://localhost:8000/health shows `{"status":"ok"}`. The API documentation is at http://localhost:8000/docs (hidden in production).

## 🧪 Tests

```bash
python -m pytest tests -q
```
Six tests in `test_admin_analytics.py`, `test_auth_ratelimit.py` and `test_soft_delete.py` currently fail for older reasons and are being fixed separately; everything else should pass.

## 🗄️ Database Changes

Every database change is a numbered SQL file in `supabase/migrations/`, applied with the Supabase CLI. Full guide: [supabase/README.md](supabase/README.md).

```bash
npx supabase db push --dry-run   # preview, changes nothing
npx supabase db push             # apply
```
Staging and production share **one database**: ask the team before pushing a migration.

## 🚢 Deployment

* **Railway (live):** deploys the `main` branch using `Dockerfile`. The container listens on Railway's `$PORT`. After changing a variable in Railway, click **Deploy** to apply it.
* **Render (standby):** `../render.yaml` describes a backup service. It is suspended and not connected to any branch.
* **Before going live:** set `ENVIRONMENT=production`, a private `DEV_OTP_CODE`, and `CORS_ALLOWED_ORIGINS` including the Vercel portal address. Keep `SUPABASE_SERVICE_ROLE_KEY` on the backend only.
