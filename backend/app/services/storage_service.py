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

from app.db.client import get_supabase_client

BUCKET_AVATARS = "avatars"
BUCKET_RECIPES = "recipes"
BUCKET_EXERCISES = "exercises"

BUCKET_CONFIGS = {
    BUCKET_AVATARS: {
        "max_bytes": 2 * 1024 * 1024, # 2 MB
        "allowed_mimes": {"image/jpeg", "image/png", "image/webp"},
        "allowed_extensions": {".jpg", ".jpeg", ".png", ".webp"},
        "allowed_roles": {"patient", "medical_expert", "admin", "super_admin"}
    },
    BUCKET_RECIPES: {
        "max_bytes": 5 * 1024 * 1024, # 5 MB
        "allowed_mimes": {"image/jpeg", "image/png", "image/webp"},
        "allowed_extensions": {".jpg", ".jpeg", ".png", ".webp"},
        "allowed_roles": {"admin", "super_admin"}
    },
    BUCKET_EXERCISES: {
        "max_bytes": 20 * 1024 * 1024, # 20 MB
        "allowed_mimes": {"image/jpeg", "image/png", "image/webp", "video/mp4"},
        "allowed_extensions": {".jpg", ".jpeg", ".png", ".webp", ".mp4"},
        "allowed_roles": {"admin", "super_admin", "medical_expert"}
    }
}

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

        # 4. MIME validation
        ext = os.path.splitext(filename)[1].lower()
        if content_type not in cfg["allowed_mimes"] or ext not in cfg["allowed_extensions"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type or MIME type.")

        # 5. Supabase Storage upload
        safe_name = sanitize_filename(filename)
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
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Storage upload failed: {str(e)}")

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
