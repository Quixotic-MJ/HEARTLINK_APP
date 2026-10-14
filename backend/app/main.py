import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    # Load secrets first (if present), but do not override explicit environment variables
    secrets_dir = Path("/etc/secrets")
    if secrets_dir.exists() and secrets_dir.is_dir():
        for secret_file in secrets_dir.iterdir():
            if secret_file.is_file():
                load_dotenv(dotenv_path=secret_file, override=False)
    for candidate in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path.cwd() / ".env",
        Path.cwd() / "backend" / ".env",
        Path("/etc/secrets/.env"),
    ]:
        if candidate.exists():
            load_dotenv(dotenv_path=candidate, override=False)
    load_dotenv(override=False)
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.rate_limiter import limiter

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
from app.api.companion import companion

is_production = os.getenv("ENVIRONMENT", "").lower() == "production"

app = FastAPI(
    title="Heartlink", 
    description="development phase", 
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
        "http://localhost:5174",
        "http://127.0.0.1:5174",
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
# HL-050: case review is mounted once; a second /api/expert copy duplicated every endpoint
app.include_router(case_review_api.router, prefix="/api/admin")
app.include_router(admin_notifications_api.router)
app.include_router(uploads_api.router)
app.include_router(feedback_api.router)
app.include_router(companion.router)

# Mount static files for uploads
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

REQUIRED_SETTINGS = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SECRET_KEY")

@app.on_event("startup")
async def on_startup():
    from app.db.client import get_supabase_client
    # HL-049: report only which required settings are missing, never values, secret-file names or contents
    missing = [name for name in REQUIRED_SETTINGS if not os.getenv(name)]
    if missing:
        logger.warning("Missing required settings: %s", ", ".join(missing))

    try:
        get_supabase_client()
        logger.info("Supabase client ready")
    except Exception as e:
        logger.warning("Supabase client not ready: %s", type(e).__name__)

    try:
        from app.db.bootstrap import bootstrap_supabase_content
        bootstrap_supabase_content()
    except Exception as e:
        logger.warning("Content bootstrap skipped: %s", e)

    try:
        from app.utils.security import load_revoked_tokens
        load_revoked_tokens()
    except Exception as e:
        logger.warning("Revoked tokens not loaded: %s", e)

@app.api_route("/", methods=["GET", "HEAD"], tags=["System"])
def root_check():
    return {"status": "ok", "service": "HeartLink API"}

@app.api_route("/health", methods=["GET", "HEAD"], tags=["System"])
def root_health_check():
    return {"status": "ok"}

@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["System"])
def api_health_check():
    return {"status": "ok"}

from app.db.repositories import get_content_repo

@app.get("/api/clinics", tags=["Clinics"])
def get_clinics():
    return get_content_repo().list_clinics()

from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

