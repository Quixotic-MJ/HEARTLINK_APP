# backend/app/services/email_service.py
"""
HeartLink Email Service (HL-052).
Sends the sign-up code, one of two ways:
- Brevo's email API over HTTPS: BREVO_API_KEY, MAIL_FROM. Works on hosts that block SMTP (Railway below Pro,
  Render free), so this is the one staging and live use. MAIL_FROM must be a sender verified in Brevo.
- SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM. Port 587 uses STARTTLS (Gmail: smtp.gmail.com
  with an app password), port 465 uses SSL.
Brevo wins when both are set.

The code email is designed (HTML: the HeartLink logo, the code in a large box, when it expires) with a plain-text copy
in the same message for email apps that don't show HTML. The logo is served by this backend from static/email; its
address comes from EMAIL_LOGO_URL, or from RENDER_EXTERNAL_URL (set by Render for every web service). Without either,
the email shows the HeartLink name without the picture.
"""
import html
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
LOGO_PATH = "/static/email/heartlink-logo.png"

# HeartLink's colours (HeartLink-mobile/constants/theme.ts, ds.light)
PRIMARY = "#1478b8"
TINT = "#dcecfa"
INK = "#1a1a1a"
SLATE = "#5d5b54"
STEEL = "#787671"
HAIRLINE = "#e5e3df"
SURFACE = "#f6f5f4"


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


def _logo_url() -> Optional[str]:
    explicit = os.getenv("EMAIL_LOGO_URL", "").strip()
    if explicit:
        return explicit
    base = os.getenv("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
    return f"{base}{LOGO_PATH}" if base.startswith("https://") else None


def _signup_code_text(code: str, minutes: int) -> str:
    return (
        f"Your HeartLink sign-up code is:\n\n"
        f"    {code}\n\n"
        f"Enter it in the HeartLink app to finish creating your account. It expires in {minutes} minutes.\n\n"
        f"HeartLink will never ask you for this code by phone, text or chat.\n"
        f"If you didn't try to sign up, you can ignore this email; no account is made without the code.\n"
    )


def _signup_code_html(code: str, minutes: int, logo_url: Optional[str]) -> str:
    """Table layout with inline styles, which is what email apps (Gmail, Outlook, phone mail) display reliably."""
    code = html.escape(code)
    font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
    logo = (
        f'<img src="{html.escape(logo_url, quote=True)}" width="40" height="40" alt="" '
        f'style="display:block;border:0;border-radius:10px;">'
        if logo_url else ""
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Your HeartLink code</title>
</head>
<body style="margin:0;padding:0;background:{SURFACE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is {code}. It expires in {minutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{SURFACE};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="max-width:480px;background:#ffffff;border:1px solid {HAIRLINE};border-radius:12px;">
    <tr><td style="padding:28px 32px 0 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        {f'<td style="padding-right:10px;">{logo}</td>' if logo else ''}
        <td style="font-family:{font};font-size:20px;font-weight:600;color:{INK};">HeartLink</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 32px 0 32px;font-family:{font};">
      <h1 style="margin:0 0 8px 0;font-size:22px;line-height:28px;font-weight:600;color:{INK};">Your sign-up code</h1>
      <p style="margin:0;font-size:15px;line-height:22px;color:{SLATE};">
        Enter this code in the HeartLink app to finish creating your account.
      </p>
    </td></tr>
    <tr><td style="padding:20px 32px 0 32px;">
      <div style="background:{TINT};border-radius:10px;padding:18px 12px;text-align:center;font-family:{font};
                  font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px;color:{INK};">{code}</div>
    </td></tr>
    <tr><td style="padding:14px 32px 0 32px;font-family:{font};font-size:14px;line-height:20px;color:{SLATE};">
      This code expires in <strong style="color:{INK};">{minutes} minutes</strong>.
    </td></tr>
    <tr><td style="padding:24px 32px 28px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border-top:1px solid {HAIRLINE};padding-top:16px;font-family:{font};font-size:13px;
                       line-height:19px;color:{STEEL};">
          HeartLink will never ask you for this code by phone, text or chat.<br>
          If you didn't try to sign up, you can ignore this email; no account is made without the code.
        </td></tr>
      </table>
    </td></tr>
  </table>
  <p style="margin:16px 0 0 0;font-family:{font};font-size:12px;line-height:17px;color:{STEEL};">
    HeartLink, a heart-health companion app. This is an automatic email, so replies aren't read.
  </p>
</td></tr>
</table>
</body>
</html>"""


def _signup_code_message(sender: str, to_email: str, code: str, minutes: int) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"Your HeartLink code: {code}"
    msg["From"] = f"HeartLink <{sender}>"
    msg["To"] = to_email
    msg.set_content(_signup_code_text(code, minutes))
    msg.add_alternative(_signup_code_html(code, minutes, _logo_url()), subtype="html")
    return msg


def _part(msg: EmailMessage, kind: str) -> str:
    return msg.get_body(preferencelist=(kind,)).get_content()


def _send_with_brevo(settings: Dict[str, str], msg: EmailMessage) -> None:
    payload = {
        "sender": {"name": "HeartLink", "email": settings["sender"]},
        "to": [{"email": msg["To"]}],
        "subject": msg["Subject"],
        "textContent": _part(msg, "plain"),
        "htmlContent": _part(msg, "html"),
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
