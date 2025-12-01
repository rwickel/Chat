# backend/routers/files.py


import os
import uuid
import json
import re
import time
import threading
from datetime import datetime
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor
from fastapi.responses import FileResponse, JSONResponse
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from utils.file_processing import process_file_background
from utils.helpers import get_user_from_request, user_dir, load_metadata, save_metadata, human_size, sanitize_filename
from core.event_loop import get_background_executor

router = APIRouter()

# ===== CONFIGURATION =====
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # backend/
UPLOADS_DIR = os.path.join(BASE_DIR, "uploaded_files")
os.makedirs(UPLOADS_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
CHUNK_EMBEDDING_BATCH_SIZE = 32

# ===== THREAD-SAFE EXECUTOR =====
_EXECUTOR: Optional[ThreadPoolExecutor] = None
_EXECUTOR_LOCK = threading.Lock()
_METADATA_LOCK = threading.Lock()  # For safe metadata read/write


# ===== PYDANTIC MODELS =====
class FileListItem(BaseModel):
    id: str
    name: str
    size: str  # human-readable
    status: str
    mime_type: str    
    error: Optional[str] = None


# ===== API ENDPOINTS =====
@router.post("/files/upload", response_model=FileListItem)
async def upload_file(request: Request, file: UploadFile = File(...)):
    user_id = get_user_from_request(request)
    print(f"[UPLOAD] 📤 Upload request from user: {user_id}, file: {file.filename}")

    # Size check - check content length before reading
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {e}")

    # Save file
    file_id = str(uuid.uuid4())
    safe_name = sanitize_filename(file.filename)
    stored_name = f"{file_id}__{safe_name}"
    user_path = user_dir(UPLOADS_DIR, user_id)
    file_path = os.path.join(user_path, stored_name)

    try:
        os.makedirs(user_path, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {e}")
    
    try:
        size = len(content)
        mime = file.content_type or "application/octet-stream"
        meta = await load_metadata(user_id)

        # Save initial metadata
        meta[file_id] = {
            "id": file_id,
            "name": file.filename,
            "stored_name": stored_name,
            "path": file_path,
            "size": size,
            "mime_type": mime,
            "status": "processing",  
            "uploaded_at": datetime.now().isoformat(), 
            "processed_at": None,
            "error": None,
            "chunk_count": 0,
            "image_count": 0,
        }      
        await save_metadata(user_id, meta)

    except Exception as e:    
        raise HTTPException(status_code=500, detail=f"Metadata save failed: {e}")

    # Submit background job
    executor = get_background_executor()
    executor.submit(
        process_file_background,
        user_id, file_id, file_path, file.filename, mime
    )

    print(f"[UPLOAD] ✅ Queued background job for {file_id}")
    return FileListItem(
        id=file_id,
        name=file.filename,
        size=human_size(size),  # now a str like "1.95 MB"
        mime_type=mime,       
        status="processing",
    )


@router.get("/files/list", response_model=List[FileListItem])
async def list_files(request: Request):  # ← async def
    user_id = get_user_from_request(request)
    meta = await load_metadata(user_id)  # ← await
    files = []
    for f in meta.values():
        files.append(FileListItem(
            id=f["id"],
            name=f["name"],
            size=human_size(f["size"]),
            status=f.get("status", "unknown"),
            mime_type=f.get("mime_type", ""),
            error=f.get("error") if f.get("status") == "failed" else None
        ))
    return files


@router.get("/get/{file_id}")
async def get_file(request: Request, file_id: str):  # ← async def
    user_id = get_user_from_request(request)
    meta = await load_metadata(user_id)  # ← await added
    entry = meta.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        entry["path"],
        media_type=entry.get("mime_type", "application/octet-stream"),
        headers={"Content-Disposition": f'inline; filename="{entry["name"]}"'}  
    )


@router.get("/files/{file_id}/status")
async def get_file_status(request: Request, file_id: str):
    user_id = get_user_from_request(request)
    meta = await load_metadata(user_id)
    entry = meta.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")
    return {
        "id": file_id,
        "status": entry.get("status"),
        "error": entry.get("error"),
        "uploaded_at": entry.get("uploaded_at"),
        "processed_at": entry.get("processed_at"),
        "chunk_count": entry.get("chunk_count"),
        "image_count": entry.get("image_count"),
    }


@router.delete("/files/delete/{file_id}")
async def delete_file(request: Request, file_id: str):  # ✅ async def
    user_id = get_user_from_request(request)
    
    # ✅ await async helpers
    meta = await load_metadata(user_id)
    entry = meta.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    # Remove file
    try:
        if os.path.exists(entry["path"]):
            os.remove(entry["path"])
        
        # Remove images dir if exists
        images_dir = os.path.join(user_dir(UPLOADS_DIR, user_id), f"{file_id}_images")
        if os.path.exists(images_dir):
            import shutil
            shutil.rmtree(images_dir, ignore_errors=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File delete error: {e}")

    # Remove from metadata
    del meta[file_id]
    await save_metadata(user_id, meta)  # ✅ await

    return {"status": "deleted", "id": file_id}