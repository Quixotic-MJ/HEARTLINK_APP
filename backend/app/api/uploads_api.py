import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads")

# Ensure the upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=Dict[str, Any])
async def upload_file(file: UploadFile = File(...)):
    try:
        if not file.filename:
            file.filename = "uploaded_file"
            
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                buffer.write(content)

        # Return relative path — each client prepends its own base URL
        relative_url = f"/static/uploads/{unique_filename}"

        return {"url": relative_url, "filename": unique_filename}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
