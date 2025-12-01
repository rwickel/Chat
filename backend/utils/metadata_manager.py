import json
import os
import asyncio
import aiofiles
from typing import Dict, Any, Optional
import time

class MetadataManager:
    def __init__(self, base_uploads_dir: str):
        self.base_uploads_dir = base_uploads_dir
        self._locks: Dict[str, asyncio.Lock] = {}
        self._lock = asyncio.Lock()  # For locks dictionary
        
    async def _get_user_lock(self, user_id: str) -> asyncio.Lock:
        """Get or create a lock for a specific user"""
        async with self._lock:
            if user_id not in self._locks:
                self._locks[user_id] = asyncio.Lock()
            return self._locks[user_id]

    def _metadata_path(self, user_id: str) -> str:
        """Get metadata file path for user"""
        user_path = os.path.join(self.base_uploads_dir, user_id)
        os.makedirs(user_path, exist_ok=True)
        metadata_path = os.path.join(user_path, "metadata.json")
        print(f"JSON File updated: {metadata_path}")
        return metadata_path

    async def _ensure_metadata_file(self, user_id: str):
        """Ensure metadata file exists, create empty one if it doesn't"""
        path = self._metadata_path(user_id)
        if not os.path.exists(path):
            print(f"Creating new metadata file for {user_id} at {path}")
            try:
                async with aiofiles.open(path, "w", encoding="utf-8") as f:
                    await f.write("{}")
                print(f"✅ Created empty metadata file for {user_id}")
            except Exception as e:
                print(f"❌ Failed to create metadata file for {user_id}: {e}")
                raise

    async def load_metadata(self, user_id: str) -> Dict[str, Any]:
        """Thread-safe metadata loading with CPU-bound operation outside the lock."""
        lock = await self._get_user_lock(user_id)
        path = self._metadata_path(user_id)
        content = ""

        # Use the lock ONLY for the file I/O operations
        async with lock:
            # Ensure the file exists before trying to load it
            await self._ensure_metadata_file(user_id)
            
            try:
                async with aiofiles.open(path, "r", encoding="utf-8") as f:
                    content = await f.read()
            except Exception as e:
                print(f"❌ Error reading metadata file for {user_id}: {e}")
                return {}

        # Perform synchronous (CPU-bound) JSON decoding OUTSIDE the lock
        if not content.strip():
            # The file was empty, return an empty dictionary
            return {}
        
        try:
            data = json.loads(content)
            print(f"✅ Loaded metadata for {user_id}: {len(data)} files")
            return data
        except json.JSONDecodeError as e:
            # Handle corrupted JSON without crashing or holding the lock
            print(f"❌ JSON Decode Error loading metadata for {user_id}: {e}")
            return {}

    async def save_metadata(self, user_id: str, data: Dict[str, Any]):
        """Thread-safe metadata saving with retry logic and offloaded JSON dumping."""
        lock = await self._get_user_lock(user_id)
        path = self._metadata_path(user_id)
        
        # 1. Synchronous (CPU-bound) JSON dumping OUTSIDE the lock
        try:
            json_data = json.dumps(data, indent=2)
        except TypeError as e:
            print(f"❌ Error serializing metadata for {user_id}: {e}")
            raise # Re-raise if data can't be serialized

        # 2. Use the lock ONLY for the file I/O write operation
        async with lock:
            # Retry logic for file operations
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # Write new data
                    async with aiofiles.open(path, "w", encoding="utf-8") as f:
                        await f.write(json_data)
                    
                    print(f"✅ Metadata saved for {user_id}, {len(data)} files")
                    return
                    
                except Exception as e:
                    print(f"❌ Error saving metadata for {user_id} (attempt {attempt + 1}): {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(0.1 * (attempt + 1))  # Exponential backoff
                    else:
                        print(f"❌ All retries failed for {user_id}")
                        raise

    async def update_file_metadata(self, user_id: str, file_id: str, updates: Dict[str, Any]):
        """Update specific file metadata atomically."""
        # 🔒 Load current metadata
        meta = await self.load_metadata(user_id)
        
        # 🛡️ Safety: Enforce minimal schema for NEW entries
        if file_id not in meta:
            # Required for ANY file to exist
            REQUIRED_KEYS = {
                "id", "name", "stored_name", "path",
                "size", "mime_type", "status", "uploaded_at"
            }
            provided = set(updates.keys())
            missing = REQUIRED_KEYS - provided
            
            if missing:
                raise ValueError(
                    f"❌ Cannot create file metadata for {file_id} — missing required fields: {sorted(missing)}\n"
                    f"✅ Provided: {sorted(provided)}\n"
                    f"💡 Hint: Call update_file_metadata with full initial metadata on upload."
                )
            print(f"🆕 Creating new file entry: {file_id}")
            meta[file_id] = {}

        # ✅ Merge updates
        meta[file_id].update(updates)
        meta[file_id]["last_updated"] = time.time()
        
        print(f"📝 Updated {file_id}: {list(updates.keys())}")

        # 💾 Save
        await self.save_metadata(user_id, meta)
        print(f"✅ Metadata saved for {file_id}")

    async def delete_file_metadata(self, user_id: str, file_id: str):
        """Delete file metadata atomically"""
        lock = await self._get_user_lock(user_id)
        async with lock:
            meta = await self.load_metadata(user_id)
            if file_id in meta:
                del meta[file_id]
                await self.save_metadata(user_id, meta)
                print(f"✅ Deleted file metadata for {file_id}")

# Initialize with correct path
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploaded_files")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Global metadata manager instance
metadata_manager = MetadataManager(UPLOADS_DIR)