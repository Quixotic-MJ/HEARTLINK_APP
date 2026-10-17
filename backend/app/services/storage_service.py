# backend/app/services/storage_service.py
"""
HeartLink Storage Service.
Manages file uploads, bucket permissions, MIME/size validation, and asset lifecycle across Supabase Storage and Local Mock Storage.
"""
import os
import uuid
import re
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status, UploadFile
import logging

logger = logging.getLogger(__name__)

from app.db.client import get_supabase_client

BUCKET_AVATARS = "avatars"
BUCKET_RECIPES = "recipes"
BUCKET_EXERCISES = "exercises"

BUCKET_CONFIGS = {
    BUCKET_AVATARS: {
        "max_bytes": 2 * 1024 * 1024, # 2 MB
        "allowed_mimes": {"image/jpeg", "image/png", "image/webp"},
        "allowed_roles": {"patient", "medical_expert", "admin", "super_admin"}
    },
    BUCKET_RECIPES: {
        "max_bytes": 5 * 1024 * 1024, # 5 MB
        "allowed_mimes": {"image/jpeg", "image/png", "image/webp"},
        "allowed_roles": {"admin", "super_admin"}
    },
    BUCKET_EXERCISES: {
        "max_bytes": 20 * 1024 * 1024, # 20 MB
        "allowed_mimes": {"image/jpeg", "image/png", "image/webp", "video/mp4"},
        "allowed_roles": {"admin", "super_admin", "medical_expert"}
    }
}

# HL-048: the file's real type is read from its first bytes ("magic bytes"); the name and the
# Content-Type header sent by the browser or phone are never trusted
FILE_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
}
FILE_TYPE_LABELS = {"image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP", "video/mp4": "MP4"}

# HEIC photos and QuickTime (.mov) files also start with an "ftyp" box, so only these brands count as MP4
MP4_BRANDS = {b"isom", b"iso2", b"iso4", b"iso5", b"iso6", b"mp41", b"mp42", b"avc1", b"M4V ", b"dash", b"MSNV"}


def detect_file_type(file_bytes: bytes) -> Optional[str]:
    """Returns the MIME type the bytes really are (one of FILE_TYPE_EXTENSIONS), or None."""
    head = file_bytes[:16]
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head[4:8] == b"ftyp" and head[8:12] in MP4_BRANDS:
        return "video/mp4"
    return None


LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


class StorageService:
    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        bucket: str,
        target_id: str,
        caller_id: str,
        caller_role: str
    ) -> Dict[str, Any]:
        raise NotImplementedError

    def delete_user_assets(self, user_id: str) -> bool:
        raise NotImplementedError


def sanitize_filename(filename: str) -> str:
    # Remove directory separators and dangerous characters
    base = os.path.basename(filename).replace("\\", "").replace("/", "")
    name, ext = os.path.splitext(base)
    clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)[:50]
    return f"{clean_name}{ext.lower()}"


class SupabaseStorageService(StorageService):
    def __init__(self, client):
        self.client = client

    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        bucket: str,
        target_id: str,
        caller_id: str,
        caller_role: str
    ) -> Dict[str, Any]:
        if bucket not in BUCKET_CONFIGS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid bucket: {bucket}")

        cfg = BUCKET_CONFIGS[bucket]

        # 1. Role validation
        if caller_role not in cfg["allowed_roles"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to upload to this storage bucket.")

        # 2. Ownership validation for avatars
        if bucket == BUCKET_AVATARS and target_id != caller_id and caller_role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only upload your own avatar.")

        # 3. Size validation
        if len(file_bytes) > cfg["max_bytes"]:
            max_mb = cfg["max_bytes"] // (1024 * 1024)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File exceeds maximum allowed size of {max_mb} MB.")

        # 4. File type from the content itself (HL-048)
        detected_type = detect_file_type(file_bytes)
        if detected_type not in cfg["allowed_mimes"]:
            allowed = ", ".join(FILE_TYPE_LABELS[m] for m in FILE_TYPE_EXTENSIONS if m in cfg["allowed_mimes"])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This file isn't a supported type. Allowed: {allowed}."
            )
        content_type = detected_type

        # 5. Supabase Storage upload, named and labelled by the detected type
        base_name = os.path.splitext(sanitize_filename(filename))[0] or "file"
        safe_name = f"{base_name}{FILE_TYPE_EXTENSIONS[detected_type]}"
        storage_path = f"{target_id}/{uuid.uuid4().hex}_{safe_name}"
        try:
            res = self.client.storage.from_(bucket).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type}
            )
            # Retrieve public URL
            public_url = self.client.storage.from_(bucket).get_public_url(storage_path)
            return {
                "url": public_url,
                "filename": os.path.basename(storage_path),
                "bucket": bucket,
                "path": storage_path,
                "size": len(file_bytes)
            }
        except Exception as e:
            logger.error(f"Storage upload failed: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Storage upload failed")

    def delete_user_assets(self, user_id: str) -> bool:
        try:
            # List user files in avatars bucket
            files = self.client.storage.from_(BUCKET_AVATARS).list(user_id)
            if files:
                file_paths = [f"{user_id}/{f['name']}" for f in files]
                self.client.storage.from_(BUCKET_AVATARS).remove(file_paths)
            return True
        except Exception:
            return False


_storage_service = None

def get_storage_service() -> StorageService:
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService(get_supabase_client())
    return _storage_service
