import hashlib

def get_deterministic_case_id(user_id: str) -> str:
    if not user_id:
        return "CASE-0000"
        
    digest = hashlib.sha256(user_id.encode("utf-8")).hexdigest()
    case_number = int(digest[:8], 16) % 10000
    return f"CASE-{case_number:04d}"
