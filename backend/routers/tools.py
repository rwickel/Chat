from fastapi import APIRouter, Request, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from services.vector_store import query_similar  
from utils.helpers import get_user_from_request

router = APIRouter()

class SimilaritySearchRequest(BaseModel):
    file_id: str
    query: str
    top_k: Optional[int] = 5

class ChunkResult(BaseModel):
    text: str
    page: int
    chunk_index: int
    distance: float

class SimilaritySearchResponse(BaseModel):
    results: List[ChunkResult]
    user_id: str
    file_id: str
    query: str

@router.get("/tools")
async def list_tools():
    return [
        {"name": "retrieve", "description": "Search knowledge base"},
        {"name": "read_pdf", "description": "Extract text from uploaded PDFs"},
    ]

# Add more endpoints as needed

@router.get("/tools/search", response_model=SimilaritySearchResponse)
async def search_chunks(
    request: Request,
    file_id: str = Query(..., description="File ID to search in"),
    query: str = Query(..., min_length=1, description="Search query"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results")
):
    """
    🔍 Test endpoint: Semantic search in a specific file's chunks.
    Requires: file must be 'ready' and stored in ChromaDB.
    """
    user_id = get_user_from_request(request)
    
    try:
        results = query_similar(user_id, file_id, query, top_k)
        
        # Format for response
        formatted = [
            ChunkResult(
                text=r["text"],
                page=r["metadata"].get("page", 1),
                chunk_index=r["metadata"].get("chunk_index", 0),
                distance=r["distance"]
            )
            for r in results
        ]
        
        return SimilaritySearchResponse(
            results=formatted,
            user_id=user_id,
            file_id=file_id,
            query=query
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")