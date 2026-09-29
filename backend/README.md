# HeartLink - Backend API

The core backend service for HeartLink, built with FastAPI and Python. This service handles data logic, machine learning pipelines, external AI integrations, and acts as the authoritative gateway to the database.

---

## 🛠️ Tech Stack & Requirements

* **Runtime:** Python 3.11
* **Framework:** FastAPI
* **Server:** Uvicorn (ASGI)
* **Database & Auth:** Supabase (PostgreSQL, Supabase Storage, Supabase Auth)
* **Machine Learning / AI:** scikit-learn (Risk Classifiers), Groq SDK (qwen/llama-3 for LLM insights)
* **Validation & Security:** Pydantic v2, PyJWT, Passlib (bcrypt)

## 📁 Directory Architecture & Component Responsibilities

```text
backend/
├── app/
│   ├── main.py              # The main starting point of the backend. It turns on the server and connects all the pieces.
│   │
│   ├── api/                 # The "doorways" where the mobile app and website send their requests.
│   │   ├── auth/            # Handles user sign-ups, log-ins, and keeping users securely signed in.
│   │   ├── companion/       # Handles the conversational AI companion feature.
│   │   ├── dashboard/       # Gathers all patient data to show daily insights and streaks on the main screen.
│   │   ├── health_logs/     # Saves daily health checks like blood pressure, heart rate, and blood sugar.
│   │   └── admin_api/       # Secure areas strictly for doctors to review cases and admins to manage the system.
│   │
│   ├── services/            # The "brain" of the app. Contains the actual rules and calculations.
│   │   ├── hss_service.py     # Calculates the patient's Heart Stability Score based on daily health logs.
│   │   ├── ml_service.py      # Uses artificial intelligence to figure out a patient's initial health risk level.
│   │   ├── storage_service.py # Securely saves and manages uploaded files like profile pictures and exercise videos.
│   │   └── auth_service.py    # Securely scrambles passwords and manages user profiles.
│   │
│   ├── db/                  # Handles all communication with the database (where information is stored).
│   │   ├── client.py        # Sets up the secure connection to the database.
│   │   ├── rest_client.py   # A backup way to talk to the database if the main connection fails.
│   │   ├── repositories/    # Organizes how we save and grab specific things like meals or exercises.
│   │   └── bootstrap.py     # Automatically adds basic information (like clinic lists) when the server first starts.
│   │
│   ├── ml/                  # Machine Learning Files
│   │   └── heartlink_model.pkl # The pre-trained AI file that predicts cardiovascular health risks.
│   │
│   ├── schemas/             # Rulebooks that double-check all information entering or leaving the app is formatted correctly.
│   │
│   └── utils/               # Helpful tools used across the app.
│       └── security.py      # Makes sure users are actually allowed to see the information they are asking for.
│
├── static/                  # A local folder for saving images/videos if the cloud storage is down.
├── supabase/                # Scripts to set up and check the health of the database.
├── verify_deployment_readiness.py # A safety check that runs before launching to make sure the app won't crash.
├── seed_*.py                # Helper scripts that quickly fill the database with sample data (like fast food nutrition info).
├── requirements.txt         # A list of external code tools the app needs to download to run properly.
└── .env.example             # A template file showing where to put secret passwords and API keys.
```

## ⚙️ Environment Variables

Create a `.env` file in the root of the `backend/` directory based on `.env.example`:

```bash
cp .env.example .env
```

| Key | Description | Required | Example |
|-----|-------------|----------|---------|
| `DATABASE_MODE` | Determines database connection behavior | Yes | `supabase` / `mock` |
| `SUPABASE_URL` | Supabase project REST endpoint | Yes | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin Key (Bypasses RLS) | Yes | `eyJhbGci...` |
| `SECRET_KEY` | Secret key for JWT token signing | Yes | `super-secret-random-key` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed URLs | Yes | `http://localhost:5173` |
| `GROQ_API_KEY` | API Key for Dashboard AI Insights | Optional | `gsk_...` |
| `COMPANION_LLM_API_KEY` | API Key for Companion AI | Optional | `gsk_...` |

### Example `.env` File

```env
# Database Persistence Mode: 'mock' (offline JSON fallback) or 'supabase' (PostgreSQL)
DATABASE_MODE=supabase

# SUPABASE CONFIGURATION (SERVER-SIDE ONLY)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT & AUTHENTICATION (SERVER-SIDE ONLY)
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24

# CORS ORIGIN WHITELIST
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:8000,https://heartlink-admin-six.vercel.app

# DEFAULT SEEDS
SUPER_ADMIN_EMAIL=your_admin_email@example.com
SUPER_ADMIN_PASSWORD=your_secure_password
EXPERT_EMAIL=expert_email@example.com
EXPERT_PASSWORD=expert_secure_password
```

## 🚀 Local Setup & Installation

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (Recommended)**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the development server**
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Access the API Documentation**
   Once the server is running, FastAPI automatically generates interactive documentation for all endpoints. You can view them at:
   * **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
   * **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

## 🚢 Deployment Notes

* **Container / Process Command:**
  When deploying to cloud platforms (like Railway or Render), use the following start command to bind to the dynamically assigned port:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

* **Production Reminders:**
  * **Pre-flight Check:** Run `python verify_deployment_readiness.py` to test your connection and environment variables before pushing to production.
  * **CORS Configuration:** Ensure `CORS_ALLOWED_ORIGINS` in your production environment variables includes your live Vercel web domain.
  * **Security:** Verify that the `SUPABASE_SERVICE_ROLE_KEY` is kept strictly on the backend and is **never** exposed to the frontend web or mobile client environments.
