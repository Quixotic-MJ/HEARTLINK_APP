import os

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

# Number of reverse proxies in front of the app that each APPEND to X-Forwarded-For
# (e.g. Railway's edge = 1; Vercel /api rewrite -> Railway = 2). 0 trusts no header and
# keys on the direct peer address. Only the rightmost entries are written by our own
# proxies, so entries a client prepends cannot be used to dodge the limit.
TRUSTED_PROXY_HOPS = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "0") or 0))


def client_ip_key(request: Request) -> str:
    if TRUSTED_PROXY_HOPS > 0:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
        if len(hops) >= TRUSTED_PROXY_HOPS:
            return hops[-TRUSTED_PROXY_HOPS]
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip_key, headers_enabled=True)
