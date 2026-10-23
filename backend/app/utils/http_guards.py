"""
HL-068 / HL-070: small guards on every request, written as plain ASGI middleware so they also cover streamed
responses and run before a request body is read.
"""
from typing import Iterable, Tuple

from starlette.exceptions import HTTPException

# HL-068: safe defaults for an API that only returns JSON and uploaded images.
SECURITY_HEADERS: Tuple[Tuple[bytes, bytes], ...] = (
    (b"x-content-type-options", b"nosniff"),  # browsers use the type we send, never guess it
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"x-frame-options", b"DENY"),  # nothing here belongs inside another site's frame
)
# Browsers only accept this over HTTPS; production only, so local testing over plain HTTP is untouched.
HSTS = (b"strict-transport-security", b"max-age=31536000; includeSubDomains")


class SecurityHeaders:
    def __init__(self, app, production: bool):
        self.app = app
        self.headers = SECURITY_HEADERS + ((HSTS,) if production else ())

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                present = {name.lower() for name, _ in message.get("headers", [])}
                extra = [(n, v) for n, v in self.headers if n not in present]
                message = {**message, "headers": list(message.get("headers", [])) + extra}
            await send(message)

        await self.app(scope, receive, send_with_headers)


def _too_large(max_bytes: int) -> HTTPException:
    return HTTPException(status_code=413, detail=f"The file is too large. The limit is {max_bytes // (1024 * 1024)} MB.")


class UploadSizeLimit:
    """
    HL-070: uploads are size-checked per type after they arrive (storage_service). This refuses a request to an
    upload address as soon as it is clearly bigger than the largest allowed file: from its Content-Length before
    anything is read, or, when no length is sent, once that many bytes have come in.
    """

    def __init__(self, app, paths: Iterable[str], max_bytes: int):
        self.app = app
        self.paths = tuple(paths)
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith(self.paths):
            return await self.app(scope, receive, send)

        length = dict(scope.get("headers") or []).get(b"content-length")
        if length is not None and length.isdigit() and int(length) > self.max_bytes:
            return await self._refuse(send)

        received = 0
        started = False

        async def counted_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    # FastAPI turns this into a 413 response wherever the body is being read
                    raise _too_large(self.max_bytes)
            return message

        async def tracked_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, counted_receive, tracked_send)
        except HTTPException as e:
            if e.status_code != 413 or started:
                raise
            await self._refuse(send)

    async def _refuse(self, send):
        detail = _too_large(self.max_bytes).detail
        body = ('{"detail": "%s"}' % detail).encode()
        await send({"type": "http.response.start", "status": 413,
                    "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
