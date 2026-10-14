"""Phone number normalization shared by auth and the profile repository."""
import re
from typing import Optional

_SEPARATORS = re.compile(r"[\s\-\(\)\.]")
_PHONE_LIKE = re.compile(r"\+?\d+")


def normalize_e164(phone: str) -> str:
    """Converts a Philippine number in any common format (09.., 63.., +63..) to +63.. (E.164)."""
    if not phone:
        return ""
    e164 = _SEPARATORS.sub("", str(phone).strip())
    if not e164.startswith("+"):
        if e164.startswith("0"):
            e164 = "+63" + e164[1:]
        elif e164.startswith("63"):
            e164 = "+" + e164
        else:
            e164 = "+63" + e164
    return e164


def normalize_phone_for_storage(phone: Optional[str]) -> Optional[str]:
    """
    The single format profiles.phone is stored and looked up in (+63..).
    Values that are not phone numbers (None, "", "No Phone") are returned unchanged.
    """
    if not phone:
        return phone
    compact = _SEPARATORS.sub("", str(phone).strip())
    if not _PHONE_LIKE.fullmatch(compact):
        return phone
    return normalize_e164(compact)
