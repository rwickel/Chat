import os
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction 
from utils.config import BASE_DIR, UPLOADS_DIR, EMBEDDING_MODEL,OLLAMA_BASE_URL, user_dir
from utils.types import TextChunk

logger = logging.getLogger(__name__)

# --- Configuration ---
# Define the single collection name (used by all user databases)
_COLLECTION_NAME = "rag_documents"

# Initialize the embedding function once (it's stateless and reusable)
_EMBEDDING_FUNCTION = OllamaEmbeddingFunction(
    url=OLLAMA_BASE_URL,
    model_name=EMBEDDING_MODEL,
)

def _get_user_chroma_path(user_id: str) -> str:
    """Calculates the unique Chroma persistence path for a given user."""
    # Structure: uploaded_files/{user_id}/chroma_db
    user_path = user_dir(user_id)
    chroma_path = os.path.join(user_path, "chroma_db")
    return chroma_path

def get_chroma_collection(user_id: str) -> chromadb.Collection:
    """
    Initializes/retrieves the ChromaDB PersistentClient and Collection 
    specific to the given user ID.
    """
    chroma_path = _get_user_chroma_path(user_id)
    
    try:
        # 1. Ensure the directory exists
        os.makedirs(chroma_path, exist_ok=True)
        
        # 2. Initialize the client for the user's specific path
        # NOTE: A new client instance is created/retrieved for each user context
        user_client = chromadb.PersistentClient(path=chroma_path)
        logger.debug(f"Client established for user {user_id} at {chroma_path}")
        
        # 3. Get or create the collection within this specific user's database
        collection = user_client.get_or_create_collection(
            name=_COLLECTION_NAME,
            embedding_function=_EMBEDDING_FUNCTION,
            metadata={"hnsw:space": "cosine"}
        )
        return collection
        
    except Exception as e:
        logger.error(f"Failed to initialize ChromaDB for user {user_id} at {chroma_path}: {e}")
        raise RuntimeError(f"Database service failed for user {user_id}.")

def store_chunks_in_chroma(user_id: str, file_id: str, chunks: List[TextChunk]) -> int:
    """
    Adds a list of chunks (documents) to the user's ChromaDB collection.
    
    :param user_id: The ID of the user owning the file.
    :param file_id: The ID of the file the chunks belong to.
    :param chunks: A list of chunk dictionaries.
    :return: The number of documents successfully added.
    """
    # Now calls the user-specific collection
    collection = get_chroma_collection(user_id)
    
    documents = []
    metadatas = []
    ids = []
    
    for chunk in chunks:
        documents.append(chunk.Text)
        
        # In the siloed model, we don't strictly need user_id in metadata, 
        # but it's good practice for debugging/future migration.
        metadatas.append({
            "user_id": user_id, 
            "file_id": file_id,
            "page_number": chunk.Page,
        })
        ids.append(chunk.Id)

    try:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Successfully added {len(ids)} chunks for file {file_id} (User: {user_id}).")
        return len(ids)
    except Exception as e:
        logger.error(f"Failed to add documents to ChromaDB for file {file_id}: {e}")
        return 0

def delete_file_chunks(user_id: str, file_id: str) -> int:
    """
    Deletes all vector embeddings associated with a specific file from the user's collection.
    
    :param user_id: The ID of the user owning the file.
    :param file_id: The ID of the file to delete chunks for.
    :return: 1 if successful, 0 if failure.
    """
    # Now calls the user-specific collection
    collection = get_chroma_collection(user_id)
    
    try:
        # Delete items only matching file_id (user_id is implicit via the client path)
        collection.delete(
            where={
                "file_id": file_id
            }
        )
        logger.info(f"Successfully deleted chunks for file {file_id} (User: {user_id}).")
        return 1
    except Exception as e:
        logger.error(f"Failed to delete chunks for file {file_id}: {e}")
        return 0

def query_similar(user_id: str, query_text: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """
    Performs a similarity search against the user's dedicated ChromaDB collection.
    
    :param user_id: The ID of the user performing the query.
    :param query_text: The natural language query string.
    :param n_results: The maximum number of documents to retrieve.
    :return: A list of dictionaries, each representing a retrieved chunk.
    """
    # Now calls the user-specific collection
    collection = get_chroma_collection(user_id)
    
    try:
        # No 'where' filter on user_id is needed since the client already points 
        # to the user's dedicated database.
        results = collection.query(
            query_texts=[query_text],
            n_results=n_results,
            include=['metadatas', 'documents', 'distances']
        )
        
        retrieved_chunks = []
        
        if results and results.get('documents') and results['documents'][0]:
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            distances = results['distances'][0]
            
            for doc, meta, dist in zip(documents, metadatas, distances):
                retrieved_chunks.append({
                    "text": doc,
                    "metadata": meta,
                    "distance": dist,
                })

        logger.info(f"Retrieved {len(retrieved_chunks)} chunks for user {user_id}.")
        return retrieved_chunks

    except Exception as e:
        logger.error(f"Failed to query ChromaDB for user {user_id}: {e}")
        return []