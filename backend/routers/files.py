# backend/routers/files.py
import os
import uuid
import time
import shutil
import asyncio
import logging
from datetime import datetime
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from utils.config import UPLOADS_DIR, MAX_FILE_SIZE, user_dir
from utils.types import FileListItem, FileStatus, FileMetadata
from services.vector_store import delete_file_chunks, get_chroma_collection
from fastapi.responses import FileResponse, JSONResponse
from utils.file_processing import process_file_background
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, BackgroundTasks, Form
from utils.helpers import get_user_from_request, human_size, sanitize_filename
from utils.db import metadata_store
from utils.executor import EXECUTOR, run_async_in_executor

router = APIRouter()
logger = logging.getLogger(__name__)


# Helper — for consistency checking with Chroma
def _get_all_file_ids_from_chroma_sync(user_id: str) -> List[str]:
    try:
        collection = get_chroma_collection(user_id)
        results = collection.get(include=['metadatas'])
        if results and results.get('metadatas'):
            return list({m.get("file_id") for m in results['metadatas'] if m.get("file_id")})
        return []
    except Exception as e:
        logger.error(f"Failed to query file IDs from Chroma for {user_id}: {e}")
        return []


class UploadStartRequest(BaseModel):
    filename: str
    total_size: int
    mime_type: str


@router.post("/files/upload/start")
async def start_upload(request: Request, body: UploadStartRequest):
    user_id = get_user_from_request(request)
    upload_id = str(uuid.uuid4())

    temp_dir = os.path.join(user_dir(user_id), ".uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{upload_id}.part")

    metadata = FileMetadata(
        id=upload_id,
        user_id=user_id,
        name=body.filename,
        stored_name="",
        path=temp_path,
        size=0,
        mime_type=body.mime_type,
        status="uploading",
    )

    await metadata_store.insert_file(user_id, upload_id, metadata)

    return {"upload_id": upload_id}


@router.post("/files/upload/chunk")
async def upload_chunk(
    request: Request,
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...)
):
    user_id = get_user_from_request(request)
    meta = await metadata_store.get_file(user_id, upload_id)
    if not meta or meta["status"] != "uploading":
        raise HTTPException(status_code=400, detail="Invalid upload session")

    temp_path = meta["path"]
    try:
        with open(temp_path, "ab") as f:
            while content := await chunk.read(1024 * 1024):
                f.write(content)
    finally:
        await chunk.close()

    current_size = os.path.getsize(temp_path)

    await metadata_store.update_file(
        user_id, upload_id,
        {
            "size": current_size,
            "last_updated": time.time(),
        }
    )

    return {"received": current_size}


@router.post("/files/upload/complete")
async def complete_upload(
    request: Request,
    upload_id: str,
    background_tasks: BackgroundTasks
):
    user_id = get_user_from_request(request)
    meta = await metadata_store.get_file(user_id, upload_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Upload not found")

    temp_path = meta["path"]
    actual_size = os.path.getsize(temp_path)

    # finalize
    file_id = str(uuid.uuid4())
    safe_name = sanitize_filename(meta["name"])
    stored_name = f"{file_id}__{safe_name}"
    final_path = os.path.join(user_dir(user_id), stored_name)
    os.rename(temp_path, final_path)

    # Insert final file metadata
    final_metadata = FileMetadata(
        id=file_id,
        user_id=user_id,
        name=meta["name"],
        stored_name=stored_name,
        path=final_path,
        size=actual_size,
        mime_type=meta["mime_type"],
        status="processing",
        uploaded_at=meta["uploaded_at"],
    )

    await metadata_store.insert_file(user_id, file_id, final_metadata)

    # remove upload session
    await metadata_store.delete_file(user_id, upload_id)

    background_tasks.add_task(
        process_file_background,
        user_id, file_id, final_path, meta["name"], meta["mime_type"]
    )

    return {"file_id": file_id, "status": "processing"}


@router.post("/files/upload", response_model=FileListItem)
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    user_id = get_user_from_request(request)

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    file_id = str(uuid.uuid4())
    safe_name = sanitize_filename(file.filename)
    stored_name = f"{file_id}__{safe_name}"
    user_path = user_dir(user_id)
    file_path = os.path.join(user_path, stored_name)

    try:
        os.makedirs(user_path, exist_ok=True)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        size = os.path.getsize(file_path)
        if size > MAX_FILE_SIZE:
            os.remove(file_path)
            raise HTTPException(status_code=413, detail="File too large")
    finally:
        await file.close()

    mime = file.content_type or "application/octet-stream"

    metadata = FileMetadata(
        id=file_id,
        user_id=user_id,
        name=file.filename,
        stored_name=stored_name,
        path=file_path,
        size=size,
        mime_type=mime,
        status="processing",
    )

    await metadata_store.insert_file(user_id, file_id, metadata)

    EXECUTOR.submit(
        run_async_in_executor,
        process_file_background,
        user_id,
        file_id,
        file_path,
        file.filename,
        mime
    )   
    
    # background_tasks.add_task(
    #     process_file_background,
    #     user_id, file_id, file_path, file.filename, mime
    # )

    return FileListItem(
        id=file_id,
        name=file.filename,
        size=human_size(size),
        mime_type=mime,
        status="processing",
    )


@router.get("/files/list", response_model=List[FileListItem])
async def list_files(request: Request):
    user_id = get_user_from_request(request)
    meta_dict = await metadata_store.load_metadata(user_id)

    # consistency check
    try:
        chroma_ids = await asyncio.to_thread(_get_all_file_ids_from_chroma_sync, user_id)
        missing = [
            fid for fid in meta_dict
            if meta_dict[fid]["status"] == "ready" and fid not in chroma_ids
        ]
        if missing:
            logger.warning(f"{len(missing)} ready files missing in Chroma")
    except Exception:
        pass

    return [
        FileListItem(
            id=f["id"],
            name=f["name"],
            size=human_size(f["size"]),
            status=f["status"],
            mime_type=f["mime_type"],
            error=f.get("error")
        )
        for f in meta_dict.values()
    ]


@router.get("/get/{file_id}")
async def get_file(request: Request, file_id: str):
    user_id = get_user_from_request(request)
    entry = await metadata_store.get_file(user_id, file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        entry["path"],
        media_type=entry["mime_type"],
        headers={"Content-Disposition": f'inline; filename="{entry["name"]}"'}
    )


@router.get("/files/{file_id}/status")
async def get_file_status(request: Request, file_id: str):
    user_id = get_user_from_request(request)
    status = await metadata_store.get_file_status(user_id, file_id)
    if not status:
        raise HTTPException(status_code=404, detail="File not found")
    return status


@router.delete("/files/delete/{file_id}")
async def delete_file(request: Request, file_id: str):
    user_id = get_user_from_request(request)
    entry = await metadata_store.get_file(user_id, file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.exists(entry["path"]):
        os.remove(entry["path"])

    try:
        await asyncio.to_thread(delete_file_chunks, user_id, file_id)
    except Exception as e:
        logger.error(f"Chroma cleanup failed: {e}")

    await metadata_store.delete_file(user_id, file_id)
    return {"status": "deleted", "id": file_id}
