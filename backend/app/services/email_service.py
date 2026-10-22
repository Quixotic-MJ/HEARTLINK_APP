# backend/app/services/email_service.py
"""
HeartLink Email Service (HL-052).
Sends the sign-up code, one of two ways:
- Brevo's email API over HTTPS: BREVO_API_KEY, MAIL_FROM. Works on hosts that block SMTP (Railway below Pro,
  Render free), so this is the one staging and live use. MAIL_FROM must be a sender verified in Brevo.
- SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM. Port 587 uses STARTTLS (Gmail: smtp.gmail.com
  with an app password), port 465 uses SSL.
Brevo wins when both are set.
"""
import os
import smtplib
import ssl
import logging

import httpx
from email.message import EmailMessage
from typing import Optional, Dict

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 15
DEFAULT_SMTP_PORT = 587
BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


class EmailSendError(Exception):
    """The email could not be handed to the mail server."""


def _smtp_settings() -> Optional[Dict[str, str]]:
    settings = {
        "host": os.getenv("SMTP_HOST", "").strip(),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "sender": os.getenv("MAIL_FROM", "").strip(),
    }
    if not all(settings.values()):
        return None
    # Google shows app passwords in groups of four ("abcd efgh ijkl mnop"); the spaces aren't part of it
    if settings["host"].lower() == "smtp.gmail.com":
        settings["password"] = settings["password"].replace(" ", "")
    return settings


def _brevo_settings() -> Optional[Dict[str, str]]:
    settings = {"api_key": os.getenv("BREVO_API_KEY", "").strip(), "sender": os.getenv("MAIL_FROM", "").strip()}
    return settings if all(settings.values()) else None


def is_email_configured() -> bool:
    return _brevo_settings() is not None or _smtp_settings() is not None


def _smtp_port() -> int:
    raw = os.getenv("SMTP_PORT", "").strip()
    try:
        return int(raw) if raw else DEFAULT_SMTP_PORT
    except ValueError:
        raise EmailSendError("SMTP_PORT must be a number")


def _signup_code_message(sender: str, to_email: str, code: str, minutes: int) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"Your HeartLink code: {code}"
    msg["From"] = f"HeartLink <{sender}>"
    msg["To"] = to_email
    msg.set_content(
        f"Your HeartLink sign-up code is:\n\n"
        f"    {code}\n\n"
        f"It expires in {minutes} minutes.\n\n"
        f"If you didn't sign up for HeartLink, you can ignore this email.\n"
    )
    return msg


def _send_with_brevo(settings: Dict[str, str], msg: EmailMessage) -> None:
    payload = {
        "sender": {"name": "HeartLink", "email": settings["sender"]},
        "to": [{"email": msg["To"]}],
        "subject": msg["Subject"],
        "textContent": msg.get_content(),
    }
    try:
        res = httpx.post(
            BREVO_SEND_URL,
            json=payload,
            headers={"api-key": settings["api_key"], "accept": "application/json"},
            timeout=SMTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as e:
        logger.error("Sign-up email could not be sent (%s)", type(e).__name__)
        raise EmailSendError(type(e).__name__) from e
    if res.status_code >= 300:
        # Brevo's reason (bad key, unverified sender) without the code itself
        logger.error("Sign-up email could not be sent (Brevo %s: %s)", res.status_code, res.text[:200])
        raise EmailSendError(f"Brevo {res.status_code}")


def send_signup_code(to_email: str, code: str, minutes: int) -> None:
    """Emails the sign-up code. Raises EmailSendError if it can't be sent."""
    brevo = _brevo_settings()
    if brevo is not None:
        _send_with_brevo(brevo, _signup_code_message(brevo["sender"], to_email, code, minutes))
        return

    settings = _smtp_settings()
    if settings is None:
        raise EmailSendError("SMTP is not configured")
    port = _smtp_port()
    msg = _signup_code_message(settings["sender"], to_email, code, minutes)

    try:
        context = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(settings["host"], port, timeout=SMTP_TIMEOUT_SECONDS, context=context) as smtp:
                smtp.login(settings["user"], settings["password"])
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings["host"], port, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
                smtp.starttls(context=context)
                smtp.login(settings["user"], settings["password"])
                smtp.send_message(msg)
    except (smtplib.SMTPException, OSError) as e:
        # Never log the code or the password; the error type is enough to tell login from network problems
        logger.error("Sign-up email could not be sent (%s)", type(e).__name__)
        raise EmailSendError(type(e).__name__) from e
