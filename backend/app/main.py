from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth.auth import router as auth_router

app = FastAPI(title="Heartlink", description="development phase", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=[""],
    allow_headers=[""],
)

app.include_router(auth_router, prefix="/api")

@app.get("/health", tags=["System"])
def health_check():
    """
    System health check endpoint to verify backend availability.
    """
    print("Healthy and connected")
    return {"status": "healthy", "database_layer": "decoupled_offline_mode"}
