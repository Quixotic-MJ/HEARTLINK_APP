"""
HL-041: live "something changed" signals for the portal, over Server-Sent Events.

Each open portal tab holds one stream. When staff notifications change, every stream gets an event and the portal
refreshes its own list (which the server already filters by role). The event carries no notification content.

The hub is in memory, which works because the backend runs as one process (one Render service, one uvicorn
worker). Running several would need a shared channel such as Redis or Postgres LISTEN/NOTIFY.
"""
import asyncio
import logging
import threading
from typing import AsyncIterator, Callable, Awaitable, List, Tuple

logger = logging.getLogger(__name__)

HEARTBEAT_SECONDS = 25  # a comment line this often keeps proxies from closing a quiet stream
RETRY_MS = 5000  # how long the browser waits before reconnecting after a drop

_subscribers: List[Tuple[asyncio.AbstractEventLoop, asyncio.Queue]] = []
_lock = threading.Lock()


def subscriber_count() -> int:
    with _lock:
        return len(_subscribers)


def publish(kind: str) -> None:
    """Safe to call from any thread (normal endpoints run on worker threads)."""
    with _lock:
        targets = list(_subscribers)
    for loop, queue in targets:
        try:
            loop.call_soon_threadsafe(queue.put_nowait, kind)
        except RuntimeError:
            pass  # that stream's loop has closed; it is removed when the stream ends


async def event_stream(is_disconnected: Callable[[], Awaitable[bool]],
                       heartbeat_seconds: float = HEARTBEAT_SECONDS) -> AsyncIterator[str]:
    """The text/event-stream body for one portal tab, until the browser goes away."""
    queue: asyncio.Queue = asyncio.Queue()
    entry = (asyncio.get_running_loop(), queue)
    with _lock:
        _subscribers.append(entry)
    try:
        yield f"retry: {RETRY_MS}\n\n"
        while not await is_disconnected():
            try:
                kind = await asyncio.wait_for(queue.get(), timeout=heartbeat_seconds)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            yield f"event: {kind}\ndata: changed\n\n"
    finally:
        with _lock:
            if entry in _subscribers:
                _subscribers.remove(entry)
