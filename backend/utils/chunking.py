# backend/utils/chunking.py
import re
import uuid
from typing import List, Dict, Any, Optional

# --- Configurable Defaults ---
CHUNK_SIZE = 400
CHUNK_OVERLAP = 10
SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


def recursive_chunking(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
    separators: Optional[List[str]] = None,
    page_number: Optional[int] = None,
    file_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Splits text recursively while preserving structure and adding metadata.
    
    Args:
        text: Input text to chunk.
        chunk_size: Max chars per chunk.
        chunk_overlap: Overlap between chunks.
        separators: Split hierarchy (default: paragraph → line → sentence → space).
        page_number: Optional source page number.
        file_id: Optional source file ID (for vector DB linking).
    
    Returns:
        List of chunk dicts with: Id, Text, Page, SourceFileId, Embeddings=None
    """
    if not text.strip():
        return []
    
    if separators is None:
        separators = SEPARATORS.copy()

    final_chunks_text: List[str] = []

    def _split(t: str, seps: List[str]):
        if not seps or len(t) <= chunk_size:
            # Fixed-size fallback
            for i in range(0, len(t), chunk_size - chunk_overlap):
                chunk = t[i:i + chunk_size].strip()
                if chunk:
                    final_chunks_text.append(chunk)
            return

        sep = seps[0]
        rest_seps = seps[1:]
        parts = [p for p in t.split(sep) if p]

        current = ""
        for part in parts:
            to_add_len = len(part) + (len(sep) if current else 0)
            if len(current) + to_add_len <= chunk_size:
                current = f"{current}{sep}{part}" if current else part
            else:
                if current:
                    final_chunks_text.append(current)
                    # Add overlap
                    overlap_start = max(0, len(current) - chunk_overlap)
                    current = current[overlap_start:]
                
                # If part itself is too big, recurse
                if len(part) > chunk_size:
                    _split(part, rest_seps)
                    current = ""
                else:
                    current = part
        if current.strip():
            final_chunks_text.append(current)

    _split(text, separators)

    # Deduplicate by text (safe: order not critical for embeddings)
    seen = set()
    unique_chunks = []
    for c in final_chunks_text:
        key = c.strip()
        if key and key not in seen:
            seen.add(key)
            unique_chunks.append(key)

    # Build structured output
    return [
        {
            "Id": str(uuid.uuid4()),
            "Text": chunk,
            "Page": page_number,
            "SourceFileId": file_id,
            "Embeddings": None,
        }
        for chunk in unique_chunks
    ]


# Convenience wrapper for embedding-only use (returns List[str])
def chunk_text_for_embedding(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
    separators: Optional[List[str]] = None
) -> List[str]:
    """Returns only the text of chunks (no metadata) — ideal for embedding."""
    chunks = recursive_chunking(
        text=text,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators
    )
    return [c["Text"] for c in chunks]