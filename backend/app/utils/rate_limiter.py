import os

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

# Number of reverse proxies in front of the app that each APPEND to X-Forwarded-For
# (e.g. Railway's edge = 1; Vercel /api rewrite -> Railway = 2). 0 trusts no header and
# keys on the direct peer address. Only the rightmost entries are written by our own
# proxies, so entries a client prepends cannot be used to dodge the limit.
# On Render (which sets RENDER=true) the app sits behind Render's proxy, so without this every user shared one limit:
# five sign-ins a minute for everyone, refused with a message the app showed as "Invalid email or password"
# (2026-11-17). Set TRUSTED_PROXY_HOPS to override.
_DEFAULT_HOPS = "1" if os.getenv("RENDER", "").lower() == "true" else "0"
TRUSTED_PROXY_HOPS = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", _DEFAULT_HOPS) or 0))


def client_ip_key(request: Request) -> str:
    if TRUSTED_PROXY_HOPS > 0:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
        if len(hops) >= TRUSTED_PROXY_HOPS:
            return hops[-TRUSTED_PROXY_HOPS]
    return get_remote_address(request)


def user_or_ip_key(request: Request) -> str:
    """Signed-in requests count per person (get_current_user stores the id), so a class or panel sharing one
    Wi-Fi doesn't share one limit. Requests that never got past sign-in count per address."""
    user_id = getattr(request.state, "user_id", None)
    return f"user:{user_id}" if user_id else client_ip_key(request)


limiter = Limiter(key_func=client_ip_key, headers_enabled=True)

# The AI-backed endpoints: enough for normal use, low enough that a stuck loop can't run up the AI bill.
AI_RATE_LIMIT = os.getenv("AI_RATE_LIMIT", "20/minute")
DASHBOARD_RATE_LIMIT = os.getenv("DASHBOARD_RATE_LIMIT", "30/minute")
