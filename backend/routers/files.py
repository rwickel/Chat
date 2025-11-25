# backend/routers/files.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid
import json
from typing import Dict, Any

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # backend/
UPLOADS_DIR = os.path.join(BASE_DIR, "uploaded_files")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def get_user_from_request(request: Request) -> str:
    """
    Resolve the user id from request.
    Priority:
    1. query param 'token' (for iframe PDF requests)
    2. header 'x-user'
    3. Authorization: Bearer user:<email>
    """
    # 1. query param
    token = request.query_params.get("token")
    if token:
        if token.startswith("user:"):
            return token.split(":", 1)[1]
        return token

    # 2. header
    user = request.headers.get("x-user")
    if user:
        return user

    # 3. Authorization header
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        if token.startswith("user:"):
            return token.split(":", 1)[1]
        return token

    return "anonymous"
def user_dir(user_id: str):
    path = os.path.join(UPLOADS_DIR, user_id)
    os.makedirs(path, exist_ok=True)
    return path


def metadata_path(user_id: str):
    return os.path.join(user_dir(user_id), "metadata.json")


def load_metadata(user_id: str) -> Dict[str, Any]:
    path = metadata_path(user_id)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_metadata(user_id: str, data: Dict[str, Any]):
    path = metadata_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    Upload file to the folder of the requesting user (determined from header or Bearer token)
    Returns metadata for the uploaded file.
    """
    user_id = get_user_from_request(request)
    meta = load_metadata(user_id)

    file_id = str(uuid.uuid4())
    # store filename as {file_id}_{originalname} to avoid clashes
    safe_filename = f"{file_id}__{file.filename}"
    user_path = user_dir(user_id)
    file_path = os.path.join(user_path, safe_filename)

    # Save file to disk
    try:
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    file_meta = {
        "id": file_id,
        "original_name": file.filename,
        "stored_name": safe_filename,
        "path": file_path,
        "size": os.path.getsize(file_path),
        "mime_type": file.content_type or "application/octet-stream",
        "status": "ready"
    }
    meta[file_id] = file_meta
    save_metadata(user_id, meta)

    # return clean metadata
    result = {k: file_meta[k] for k in ("id", "original_name", "size", "mime_type", "status")}
    return JSONResponse(result)


@router.get("/files/list")
def list_files(request: Request):
    user_id = get_user_from_request(request)
    meta = load_metadata(user_id)
    # convert size to human readable
    def human_size(n):
        for unit in ["B", "KB", "MB", "GB"]:
            if n < 1024.0:
                return f"{round(n, 2)} {unit}"
            n /= 1024.0
        return f"{round(n,2)} TB"
    files = []
    for f in meta.values():
        files.append({
            "id": f["id"],
            "name": f["original_name"],
            "size": human_size(f["size"]),
            "status": f.get("status", "ready"),
            "mime_type": f.get("mime_type", "")
        })
    return JSONResponse(files)


@router.get("/get/{file_id}")
def get_file(request: Request, file_id: str):
    user_id = get_user_from_request(request)
    meta = load_metadata(user_id)
    entry = meta.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    # For inline display in browser/iframe
    return FileResponse(
        entry["path"],
        media_type=entry.get("mime_type", "application/octet-stream"),
        headers={"Content-Disposition": f'inline; filename="{entry["original_name"]}"'}
    )

@router.get("/content/{file_id}")
def get_file_content(request: Request, file_id: str):
    """
    Return plain text content for text files; for other types, return metadata and preview URL.
    - For text/plain or text/* we return the text body.
    - For PDFs we return a JSON with preview_url; frontend can open /api/get/{file_id} in iframe.
    """
    user_id = get_user_from_request(request)
    meta = load_metadata(user_id)
    entry = meta.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    mime = entry.get("mime_type", "")
    if mime.startswith("text/") or entry["original_name"].lower().endswith((".md", ".txt", ".csv")):
        try:
            with open(entry["path"], "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return JSONResponse({"type": "text", "content": content})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not read file: {e}")
    else:
        # non-text — provide preview URL (PDFs/images will render in browser)
        preview_url = f"/api/get/{file_id}"
        return JSONResponse({"type": "binary", "preview_url": preview_url, "mime_type": mime, "name": entry["original_name"]})


@router.delete("/files/delete/{file_id}")
def delete_file(request: Request, file_id: str):
    user_id = get_user_from_request(request)
    meta = load_metadata(user_id)
    entry = meta.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    # remove file from disk
    try:
        if os.path.exists(entry["path"]):
            os.remove(entry["path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not remove file: {e}")

    # remove metadata
    del meta[file_id]
    save_metadata(user_id, meta)
    return JSONResponse({"status": "deleted", "id": file_id})
