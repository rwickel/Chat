# backend/services/vector_store.py
import os
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils import embedding_functions
import ollama

logger = logging.getLogger(__name__)

# Configuration
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")  # or "mxbai-embed-large"

# Global client (singleton, safe for threads after init)
_client: Optional[chromadb.PersistentClient] = None


def init_chroma():
    """Initialize Chroma client (call once at startup)."""
    global _client
    if _client is None:
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        logger.info(f"✅ ChromaDB initialized at {CHROMA_PERSIST_DIR}")
    return _client


def get_chroma_client() -> chromadb.PersistentClient:
    if _client is None:
        raise RuntimeError("ChromaDB not initialized. Call init_chroma() first.")
    return _client


def get_or_create_collection(user_id: str, file_id: str) -> chromadb.Collection:
    """Per-user, per-file collection for isolation."""
    client = get_chroma_client()
    collection_name = f"user_{user_id[:8]}_file_{file_id[:8]}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}  # or "ip", "l2"
    )


def embed_batch(texts: List[str], model: str = EMBEDDING_MODEL) -> List[List[float]]:
    """Sync, batched, thread-safe embedding using Ollama."""
    if not texts:
        return []
    try:
        # Ollama sync client supports batch input!
        response = ollama.embed(model=model, input=texts)
        return response["embeddings"]
    except Exception as e:
        logger.error(f"❌ Ollama embedding failed for {len(texts)} texts: {e}")
        raise


def store_chunks_in_chroma(
    user_id: str,
    file_id: str,
    chunks: List[Dict[str, Any]]  # each: {"Id": str, "Text": str, "Page": int, ...}
) -> int:
    """
    Store chunks in ChromaDB with embeddings.
    Returns number of chunks stored.
    """
    if not chunks:
        return 0

    collection = get_or_create_collection(user_id, file_id)

    # Extract texts
    texts = [c["Text"] for c in chunks]
    ids = [c["Id"] for c in chunks]

    # Batch embedding (faster, GPU-efficient on RTX 3090)
    embeddings = embed_batch(texts, model=EMBEDDING_MODEL)

    # Metadata (for filtering later)
    metadatas = [
        {
            "file_id": file_id,
            "page": c.get("Page", 1),
            "chunk_index": i,
            "size": len(c["Text"])
        }
        for i, c in enumerate(chunks)
    ]

    try:
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )
        logger.info(f"✅ Stored {len(chunks)} chunks in Chroma (user={user_id}, file={file_id})")
        return len(chunks)
    except Exception as e:
        logger.error(f"❌ Chroma add failed: {e}")
        raise

def query_similar(
    user_id: str,
    file_id: str,
    query: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Perform semantic search in a user's file collection.
    Returns list of {text, metadata, distance}
    """
    if not query.strip():
        return []
    
    client = get_chroma_client()
    
    # Build collection name (must match store_chunks_in_chroma)
    collection_name = f"user_{user_id[:8]}_file_{file_id[:8]}"
    
    try:
        collection = client.get_collection(collection_name)
    except ValueError:
        raise ValueError(f"Collection not found for file '{file_id}'. Is it processed?")
    
    try:
        # Embed query (sync, safe)
        query_emb = embed_batch([query])[0]
        
        # Query Chroma
        results = collection.query(
            query_embeddings=[query_emb],
            n_results=top_k,
            where={"file_id": file_id},  # ensure we only get this file's chunks
            include=["documents", "metadatas", "distances"]
        )
        
        # Parse results
        matches = []
        if results["documents"] and results["documents"][0]:
            for i in range(len(results["documents"][0])):
                matches.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0.0
                })
        
        return matches
        
    except Exception as e:
        logger.error(f"Chroma query failed for user={user_id}, file={file_id}: {e}")
        raise    