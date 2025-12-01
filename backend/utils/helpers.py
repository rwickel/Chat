# backend/utils/helpers.py
import os
import json
from fastapi import Request
from .metadata_manager import metadata_manager
from typing import Dict, Any
import time
import re


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to be safe for storage.
    - Removes/escapes dangerous chars
    - Preserves extension
    - Limits length
    - Prevents path traversal (e.g., '../../secret')
    """
    if not filename:
        return "unnamed_file"

    # Split into name and extension
    name, ext = os.path.splitext(filename)
    
    # Remove path components (security: prevent directory traversal)
    name = os.path.basename(name)
    
    # Replace dangerous/reserved characters with underscore
    # Allow: letters, digits, underscore, dash, dot, space (temporarily)
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)  # Replace each bad char with _
    name = re.sub(r'_+', '_', name)  # ⚠️ FIX: Replace multiple underscores with single _
    name = name.strip(' ._')  # trim unsafe leading/trailing chars

    # Truncate name (not full filename) to avoid OS limits
    if len(name) > 100:
        name = name[:100]

    # Reassemble
    safe = name + (ext.lower() if ext else "")
    
    # Final fallback
    if not safe or safe.startswith('.'):
        safe = "file_" + str(int(time.time())) + (ext.lower() if ext else "")
    
    return safe

def get_user_from_request(request: Request) -> str:
    """
    Resolve the user id from request.
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

def user_dir(base_uploads_dir: str, user_id: str) -> str:
    path = os.path.join(base_uploads_dir, user_id)
    os.makedirs(path, exist_ok=True)
    return path

def metadata_path(base_uploads_dir: str, user_id: str) -> str:
    return os.path.join(user_dir(base_uploads_dir, user_id), "metadata.json")

def human_size(size_bytes: int) -> str:
    """Convert size in bytes to human readable format."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"

# Delegate to metadata manager
async def load_metadata( user_id: str) -> dict:
    return await metadata_manager.load_metadata(user_id)

async def save_metadata( user_id: str, data: dict):
    await metadata_manager.save_metadata(user_id, data)

async def update_file_metadata(user_id: str, file_id: str, updates: Dict[str, Any]):
    """
    Wrapper function to update specific file metadata atomically.
    It delegates to the global metadata_manager instance.
    """
    # The MetadataManager class handles the base_uploads_dir internally, 
    # so we pass only the necessary arguments.
    await metadata_manager.update_file_metadata(user_id, file_id, updates)