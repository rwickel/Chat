import os
import io
import re
import time
import asyncio
import traceback
from pypdf import PdfReader
from typing import List, Dict, Any, Tuple
from services.embedder import embed_texts, embed_text
from core.event_loop import get_event_loop
from utils.chunking import recursive_chunking
from utils.helpers import update_file_metadata
from services.vector_store import store_chunks_in_chroma
from utils.pdf_extraction import extract_text, extract_pdf_text_and_images, extract_pdf_content



def _sync_await(coro):
    if not hasattr(coro, '__await__'):
        raise TypeError(f"_sync_await() called with non-coroutine: {type(coro)}")
    try:
        loop = get_event_loop()
    except RuntimeError as e:
        # Improve error message
        raise RuntimeError(
            "Event loop not ready. Ensure app fully started. "
            "Did you call this during import or before lifespan?"
        ) from e
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result()

def process_file_background(
    user_id: str,
    file_id: str,
    file_path: str,
    original_name: str,
    mime_type: str
):
    """
    Sync background task (runs in ThreadPoolExecutor).
    Performs: text extraction → chunking → embedding → metadata update.
    """
    print(f"[BG] 🔄 Starting processing for {file_id} ({original_name})")

    try:        

        # Step 1: Extract text
        raw_text = extract_text(file_path, mime_type)
        if not raw_text.strip():
            raise ValueError("No text extracted from file")

        # Step 2: Chunk with metadata
        print(f"[BG] Chunking ({len(raw_text)} chars)")
        chunks_meta = recursive_chunking(
            text=raw_text,
            separators=["\n\n", "\n", ". ", " ", ""],
            page_number=1,  # TODO: use real page numbers from PDF
            file_id=file_id,
        )
        print(f"[BG] Generated {len(chunks_meta)} chunks")

        # Step 3: Update status → "embedding"
        _sync_await(
            update_file_metadata(
                user_id, file_id,
                {
                    "status": "processing",
                    "chunk_count": len(chunks_meta),
                }
            )
        )

         # Step 4: Embed each chunk
        for chunk in chunks_meta:
            text = chunk["Text"]
            if not text or not text.strip():
                print(f"[BG] ⚠️ Skipping empty chunk Id={chunk['Id']}")
                chunk["Embeddings"] = []  # or skip entirely
                continue

            try:
                chunk["Embeddings"] = embed_text(text)  # dict assignment, not .Embeddings
            except Exception as e:
                raise RuntimeError(f"Failed to embed chunk Id={chunk['Id']}: {e}") from e

            # Optional: validate embedding
            if not isinstance(chunk["Embeddings"], list) or len(chunk["Embeddings"]) == 0:
                raise RuntimeError(f"Invalid embedding for chunk Id={chunk['Id']}")

        
        # Step 6: Store in ChromaDB (replaces mock debug)
        try:
            stored_count = store_chunks_in_chroma(user_id, file_id, chunks_meta)
            print(f"[BG] Stored {stored_count} chunks in ChromaDB")
        except Exception as e:
            raise RuntimeError(f"ChromaDB storage failed: {e}") from e

        # Step 7: Final update → "ready"
        _sync_await(
            update_file_metadata(
                user_id,
                file_id,
                {
                    "status": "ready",
                    "processed_at": time.time(),
                    "chunk_count": len(chunks_meta),
                    "embedding_model": os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
                },
            )
        )
        print(f"[BG] {file_id} processed successfully ({len(chunks_meta)} chunks)")

    except Exception as e:
        error_msg = f"{type(e).__name__}: {e}"
        print(f"[BG] ❌ Failed for {file_id}: {error_msg}")
        traceback.print_exc()
        # Update status to "failed" (not "error" — use consistent status)
        try:
            _sync_await(
                update_file_metadata(
                    user_id, file_id,
                    {"status": "error", "error": error_msg}
                )
            )
        except Exception as update_err:
            print(f"[BG] ⚠️ Failed to update error status: {update_err}")

def _store_chunks_in_vector_db(
    user_id: str,
    file_id: str,
    chunks: List[Dict[str, Any]]
):
    """
    Mock: Save chunks to disk for debugging.
    Replace with real vector DB insertion (e.g., Chroma, Qdrant).
    """
    # Use os.path.join for cross-platform safety
    debug_dir = os.path.join("debug", user_id)
    os.makedirs(debug_dir, exist_ok=True)
    debug_filename = f"{file_id}_chunks.json"
    debug_path = os.path.join(debug_dir, debug_filename)

    try:
        # Prepare serializable data
        serializable = []
        for c in chunks:
            text_preview = c["Text"][:100]
            if len(c["Text"]) > 100:
                text_preview += "..."
            
            # Safely truncate embeddings
            embeddings_preview = None
            if c.get("Embeddings"):
                emb = c["Embeddings"]
                if isinstance(emb, list) and len(emb) > 0:
                    # Show first 5 dims + ellipsis indicator
                    embeddings_preview = emb[:5] + ["..."] if len(emb) > 5 else emb

            serializable.append({
                "Id": c["Id"],
                "Text": text_preview,
                "Page": c.get("Page", 1),
                "EmbeddingDim": len(c["Embeddings"]) if c.get("Embeddings") else 0,
                "EmbeddingsPreview": embeddings_preview,
            })

        # Write to file
        with open(debug_path, "w", encoding="utf-8") as f:
            import json
            json.dump(serializable, f, indent=2, ensure_ascii=False)

        # Safe f-string — no stray }
        print(f"[BG] 📁 Debug chunks saved to: {debug_path}")

    except Exception as e:
        # Safe f-string — no stray }
        print(f"[BG] ⚠️ Failed to write debug file '{debug_path}': {e}")
        # Optionally log full traceback during dev:
        # traceback.print_exc()