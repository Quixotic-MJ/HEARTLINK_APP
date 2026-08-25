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
    # Load backend/.env if exists
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

DATABASE_MODE_MOCK = "mock"
DATABASE_MODE_SUPABASE = "supabase"

_supabase_client = None

def get_database_mode() -> str:
    """Returns the current database mode ('mock' or 'supabase')."""
    return os.getenv("DATABASE_MODE", DATABASE_MODE_MOCK).strip().lower()

def is_supabase_mode() -> bool:
    """Returns True if the backend is configured to use Supabase as its persistence store."""
    return get_database_mode() == DATABASE_MODE_SUPABASE

def get_supabase_client():
    """
    Returns the singleton Supabase Service Role client.
    Fails fast with clear error message if DATABASE_MODE=supabase and credentials are missing.
    """
    global _supabase_client

    if not is_supabase_mode():
        return None

    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url:
        raise RuntimeError("Configuration Error: DATABASE_MODE=supabase is set but SUPABASE_URL is missing or empty.")
    if not key:
        raise RuntimeError("Configuration Error: DATABASE_MODE=supabase is set but SUPABASE_SERVICE_ROLE_KEY is missing or empty.")

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
    mode = get_database_mode()
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
        "ready": mode == DATABASE_MODE_MOCK or (has_url and has_service_key)
    }
