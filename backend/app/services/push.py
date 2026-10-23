"""
HL-018: push notifications through Expo's push service.

When a patient notification is created (an announcement or a personal one), each of that patient's signed-in phones
gets a push. Sending happens on a background thread, so saving a notification never waits for Expo. A phone Expo says
is no longer registered (app removed, permission off) is switched off. Tokens are never written to the log.
"""
import logging
import threading
from typing import Any, Dict, Iterable, List, Optional

import httpx

from app.db.repositories import get_push_token_repo

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
BATCH_SIZE = 100  # Expo's limit per request
TIMEOUT_SECONDS = 10
PLATFORMS = {"android", "ios"}


def is_expo_token(token: str) -> bool:
    return isinstance(token, str) and token.startswith(("ExponentPushToken[", "ExpoPushToken[")) and token.endswith("]")


def _messages(tokens: List[str], title: str, body: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        # channelId matches the Android channel the app creates (utils/notifications.ts)
        {"to": t, "title": title, "body": body, "data": data, "sound": "default", "channelId": "default"}
        for t in tokens
    ]


def _send_batch(messages: List[Dict[str, Any]]) -> List[str]:
    """Sends one batch; returns the tokens Expo says are no longer registered."""
    try:
        res = httpx.post(EXPO_PUSH_URL, json=messages, timeout=TIMEOUT_SECONDS,
                         headers={"accept": "application/json", "content-type": "application/json"})
    except httpx.HTTPError as e:
        logger.warning("Push batch not sent (%s)", type(e).__name__)
        return []
    if res.status_code >= 300:
        logger.warning("Push batch refused by Expo (%s)", res.status_code)
        return []
    gone = []
    # Expo answers one ticket per message, in the same order
    for message, ticket in zip(messages, (res.json() or {}).get("data") or []):
        if ticket.get("status") == "error":
            reason = (ticket.get("details") or {}).get("error") or "error"
            if reason == "DeviceNotRegistered":
                gone.append(message["to"])
            else:
                logger.warning("Push not delivered (%s)", reason)
    return gone


def deliver(user_ids: Iterable[str], title: str, body: str, data: Optional[Dict[str, Any]] = None) -> int:
    """Sends now (on the calling thread). Returns how many phones were sent to."""
    repo = get_push_token_repo()
    tokens = sorted({row["token"] for row in repo.list_active({u for u in user_ids if u}) if is_expo_token(row.get("token"))})
    if not tokens:
        return 0
    messages = _messages(tokens, title, body, data or {})
    gone: List[str] = []
    for start in range(0, len(messages), BATCH_SIZE):
        gone += _send_batch(messages[start:start + BATCH_SIZE])
    if gone:
        repo.disable(gone)
        logger.info("Switched off %d phones Expo no longer knows", len(gone))
    return len(tokens)


def send_push(user_ids: Iterable[str], title: str, body: str, data: Optional[Dict[str, Any]] = None) -> None:
    """Sends in the background; a failure only logs, it never affects the save that triggered it."""
    user_ids = list(user_ids)
    if not user_ids:
        return

    def run():
        try:
            deliver(user_ids, title, body, data)
        except Exception as e:  # the notification itself is already saved
            logger.warning("Push sending failed (%s)", type(e).__name__)

    threading.Thread(target=run, name="push-send", daemon=True).start()
