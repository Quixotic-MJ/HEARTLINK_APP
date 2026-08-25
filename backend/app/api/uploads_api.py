# backend/app/api/uploads_api.py
"""
HeartLink Uploads API Gateway.
Authenticates caller, validates file constraints, routes to Supabase Storage / Local Storage,
and returns standard URL and filename metadata.
"""
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from typing import Dict, Any, Optional

from app.utils.security import get_current_user
from app.services.storage_service import get_storage_service, BUCKET_AVATARS, BUCKET_RECIPES, BUCKET_EXERCISES

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

@router.post("/", response_model=Dict[str, Any])
async def upload_file(
    file: UploadFile = File(...),
    bucket: Optional[str] = Form("avatars"),
    target_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    caller_id = current_user.get("user_id")
    caller_role = current_user.get("role", "patient")

    effective_target_id = target_id or caller_id

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    filename = file.filename or "uploaded_file.jpg"
    content_type = file.content_type or "image/jpeg"

    storage = get_storage_service()
    res = storage.upload_file(
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
        bucket=bucket,
        target_id=effective_target_id,
        caller_id=caller_id,
        caller_role=caller_role
    )

    return {"url": res["url"], "filename": res["filename"]}
