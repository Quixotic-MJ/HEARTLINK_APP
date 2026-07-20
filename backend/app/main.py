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


@app.get("/api/health", tags=["System"])
def health_check():
    print("Healthy and connected")
    return {"status": "Backend Connected", "database_layer": "decoupled_offline_mode"}
