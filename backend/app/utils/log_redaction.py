"""
HL-063: keeps email addresses and phone numbers out of the server log.

Render keeps the log and anyone with dashboard access can read it. Error messages often quote the value that caused
them (a duplicate-email error contains the email), so instead of trusting every log line, one filter on the log
handlers blanks these out of every message, its arguments and any traceback before it is written.
"""
import logging
import re

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")
# Philippine mobile numbers as the app stores them (+639...) or people type them (639..., 09...)
PH_MOBILE = re.compile(r"(?<!\d)(?:\+?63|0)9\d{9}(?!\d)")
# Any other international number written with a plus sign
INTL_PHONE = re.compile(r"(?<![\w+])\+\d{10,15}(?!\d)")


def redact(text: str) -> str:
    text = EMAIL.sub("[email]", text)
    text = PH_MOBILE.sub("[phone]", text)
    return INTL_PHONE.sub("[phone]", text)


def _clean_arg(arg):
    # Numbers stay numbers so "%d" still works; anything else is logged as its redacted text
    if isinstance(arg, (int, float)) or arg is None:
        return arg
    return redact(str(arg))


class RedactPersonalData(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact(record.msg)
        if isinstance(record.args, tuple):
            # uvicorn's access log reads these one by one, so keep them as a tuple
            record.args = tuple(_clean_arg(a) for a in record.args)
        elif isinstance(record.args, dict):
            record.args = {k: _clean_arg(v) for k, v in record.args.items()}
        if record.exc_info and not record.exc_text:
            record.exc_text = redact(logging.Formatter().formatException(record.exc_info))
        return True


def install_log_redaction() -> None:
    """Shows the app's own INFO logs (nothing else sets up the root logger under uvicorn) and puts the filter on
    every handler that writes the app's or uvicorn's log lines."""
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    for name in ("", "uvicorn", "uvicorn.error", "uvicorn.access"):
        for handler in logging.getLogger(name).handlers:
            if not any(isinstance(f, RedactPersonalData) for f in handler.filters):
                handler.addFilter(RedactPersonalData())
    if logging.lastResort and not any(isinstance(f, RedactPersonalData) for f in logging.lastResort.filters):
        logging.lastResort.addFilter(RedactPersonalData())
