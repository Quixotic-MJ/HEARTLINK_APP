from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import auth
from app.api.users import profile
from app.api.dashboard import dashboard
from app.api.health_logs import health_logs
from app.api.meals import meals
from app.api.exercises import exercises
from app.api.recipes_api import recipes_api
from app.api.notifications_api import notifications_api
from app.api.analytics_api import analytics_api
from app.api.admin_api import admin_api, case_review_api
from app.api import uploads_api
from app.api import feedback_api
import os
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Heartlink", description="development phase", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(dashboard.router)
app.include_router(health_logs.router)
app.include_router(meals.router)
app.include_router(exercises.router)
app.include_router(recipes_api.router)
app.include_router(notifications_api.router)
app.include_router(analytics_api.router)
app.include_router(admin_api.router)
app.include_router(case_review_api.router)
app.include_router(uploads_api.router)
app.include_router(feedback_api.router)

# Mount static files for uploads
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/api/health", tags=["System"])
def health_check():
    print("Healthy and connected")
    return {"status": "Backend Connected", "database_layer": "decoupled_offline_mode"}

from app.mock_db import clinics

@app.get("/api/clinics", tags=["Clinics"])
def get_clinics():
    return clinics
