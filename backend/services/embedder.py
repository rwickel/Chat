# backend/services/embedder.py
import ollama  # ← sync client, not async!
import os
from typing import List

_EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "haybu/mxbai-embed-large-latest")

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Synchronous embedding — safe for threads."""
    try:
        # ollama.embeddings is sync and thread-safe
        response = ollama.embeddings(
            model=_EMBEDDING_MODEL,
            prompt=texts  
        )
        return response["embeddings"]
    except Exception as e:
        raise RuntimeError(f"Ollama embedding failed: {e}") from e


def embed_text(text: str)-> List[float]:
    """Synchronous embedding — safe for threads."""
    try:
        # ollama.embeddings is sync and thread-safe
        response = ollama.embeddings(
            model=_EMBEDDING_MODEL,
            prompt=text  
        )
        return response.embedding
    except Exception as e:
        raise RuntimeError(f"Ollama embedding failed: {e}") from e
