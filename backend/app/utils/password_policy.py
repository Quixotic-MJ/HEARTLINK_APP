import re

def validate_strong_password(v: str) -> str:
    if not v or not v.strip():
        raise ValueError("Password cannot be empty or whitespace only")
    if len(v) < 16:
        raise ValueError("Password must be at least 16 characters long")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    # Require at least one special character (any non-alphanumeric, non-whitespace character)
    if not re.search(r"[^A-Za-z0-9\s]", v):
        raise ValueError("Password must contain at least one special character")
    return v
