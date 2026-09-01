import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    for candidate in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path.cwd() / ".env",
        Path.cwd() / "backend" / ".env",
        Path("/etc/secrets/.env"),
    ]:
        if candidate.exists():
            load_dotenv(dotenv_path=candidate, override=True)
    secrets_dir = Path("/etc/secrets")
    if secrets_dir.exists() and secrets_dir.is_dir():
        for secret_file in secrets_dir.iterdir():
            if secret_file.is_file():
                load_dotenv(dotenv_path=secret_file, override=True)
    load_dotenv(override=True)
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import auth
from app.api.users import profile
from app.api.dashboard import dashboard
from app.api.health_logs import health_logs
from app.api.sleep_logs import sleep_logs
from app.api.meals import meals
from app.api.exercises import exercises
from app.api.recipes_api import recipes_api
from app.api.notifications_api import notifications_api
from app.api.analytics_api import analytics_api
from app.api.admin_api import admin_api, case_review_api, admin_notifications_api
from app.api import uploads_api
from app.api import feedback_api

app = FastAPI(title="Heartlink", description="development phase", version="1.0.0")

# CORS Configuration
raw_cors = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
if raw_cors:
    allowed_origins = [o.strip() for o in raw_cors.split(",") if o.strip()]
    allow_credentials = "*" not in allowed_origins
else:
    allowed_origins = [
        "https://heartlink-admin-six.vercel.app",
        "https://heartlink-admin.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(dashboard.router)
app.include_router(health_logs.router)
app.include_router(sleep_logs.router)
app.include_router(meals.router)
app.include_router(exercises.router)
app.include_router(recipes_api.router)
app.include_router(notifications_api.router)
app.include_router(analytics_api.router)
app.include_router(admin_api.router)
app.include_router(case_review_api.router, prefix="/api/expert")
app.include_router(case_review_api.router, prefix="/api/admin")
app.include_router(admin_notifications_api.router)
app.include_router(uploads_api.router)
app.include_router(feedback_api.router)

# Mount static files for uploads
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.on_event("startup")
async def on_startup():
    from app.db.client import get_supabase_client
    # ── Diagnostic: show env-var loading status ──
    print(f"[HeartLink Startup] CWD={os.getcwd()}")
    print(f"[HeartLink Startup] DATABASE_MODE={os.getenv('DATABASE_MODE')}")
    print(f"[HeartLink Startup] SUPABASE_URL={os.getenv('SUPABASE_URL', '<NOT SET>')[:40]}...")
    print(f"[HeartLink Startup] SUPABASE_SERVICE_ROLE_KEY={'SET' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'NOT SET'}")
    print(f"[HeartLink Startup] SECRET_KEY={'SET' if os.getenv('SECRET_KEY') else 'NOT SET'}")
    # ── Diagnostic: check /etc/secrets directory ──
    secrets_dir = Path("/etc/secrets")
    if secrets_dir.exists():
        files = list(secrets_dir.iterdir())
        print(f"[HeartLink Startup] /etc/secrets/ contains {len(files)} file(s): {[f.name for f in files]}")
        for f in files:
            if f.is_file():
                try:
                    content = f.read_text()
                    lines = [l.strip() for l in content.splitlines() if l.strip() and not l.strip().startswith('#')]
                    keys = [l.split('=')[0] for l in lines if '=' in l]
                    print(f"[HeartLink Startup]   {f.name}: {len(lines)} vars, keys={keys}")
                except Exception as ex:
                    print(f"[HeartLink Startup]   {f.name}: read error: {ex}")
    else:
        print("[HeartLink Startup] /etc/secrets/ does NOT exist")
    # ── Connect to Supabase ──
    try:
        client = get_supabase_client()
        if client:
            print("[HeartLink Startup] Supabase Client Connected Successfully.")
    except Exception as e:
        print(f"[HeartLink Startup DB Warning] {e}")

    try:
        from app.db.bootstrap import bootstrap_supabase_content
        bootstrap_supabase_content()
    except Exception as e:
        print(f"[HeartLink Startup Bootstrap Warning] {e}")

@app.get("/health", tags=["System"])
def root_health_check():
    return {"status": "ok"}

@app.get("/api/health", tags=["System"])
def api_health_check():
    return {"status": "ok"}

from app.db.repositories import get_content_repo

@app.get("/api/clinics", tags=["Clinics"])
def get_clinics():
    return get_content_repo().list_clinics()

