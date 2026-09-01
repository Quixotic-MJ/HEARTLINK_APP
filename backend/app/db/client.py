# backend/app/db/client.py
"""
Supabase PostgreSQL Client & Database Configuration Manager
Handles initialization, environment configuration validation, and safe diagnostics.
"""
import os
from typing import Optional, Dict, Any
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

DATABASE_MODE_SUPABASE = "supabase"

_supabase_client = None

def get_supabase_client():
    """
    Returns the singleton Supabase Service Role client.
    Initializes from environment variables or secure production configuration.
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url:
        raise RuntimeError("Configuration Error: DATABASE_MODE=supabase is set but SUPABASE_URL is missing or empty. Please set SUPABASE_URL in Render Environment Variables or /etc/secrets.")
    if not key:
        raise RuntimeError("Configuration Error: DATABASE_MODE=supabase is set but SUPABASE_SERVICE_ROLE_KEY is missing or empty. Please set SUPABASE_SERVICE_ROLE_KEY in Render Environment Variables or /etc/secrets.")

    try:
        from supabase import create_client, Client
        _supabase_client = create_client(url, key)
        return _supabase_client
    except ImportError:
        # Provide fallback HTTP REST client if supabase package is not yet installed
        from app.db.rest_client import SupabaseRestClient
        _supabase_client = SupabaseRestClient(url, key)
        return _supabase_client
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Supabase client: {e}")

def get_database_status() -> Dict[str, Any]:
    """
    Safe configuration diagnostic that returns configuration status without leaking secret values.
    """
    mode = DATABASE_MODE_SUPABASE
    url = os.getenv("SUPABASE_URL", "").strip()
    has_url = bool(url and not url.startswith("https://your-project"))
    has_service_key = bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip())
    has_anon_key = bool(os.getenv("SUPABASE_ANON_KEY", "").strip())

    return {
        "database_mode": mode,
        "supabase_url_configured": has_url,
        "supabase_service_role_configured": has_service_key,
        "supabase_anon_key_configured": has_anon_key,
        "is_authoritative_gateway": True,
        "ready": has_url and has_service_key
    }
