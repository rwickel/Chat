from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from agents.agentic_rag import AGENT_GRAPH, AgentState
from typing import List, Dict, Any, Optional
from utils.helpers import get_user_from_request, human_size, sanitize_filename
from services.vector_store import query_similar

router = APIRouter()

# -----------------------------
# Request/Response Models
# -----------------------------
class ChatMessage(BaseModel):
    id: str
    role: str  # 'user' | 'assistant' | 'system'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    contextDocIds: List[str] = []

class ChatResponse(BaseModel):
    content: str
    citations: Optional[List[Dict[str, Any]]] = None
    error: str = ""


from typing import List, Dict, Any
import asyncio

async def generate_chat_response(
    user_id: str,
    messages: List[ChatMessage],
    context_doc_ids: List[str]
) -> Dict[str, Any]:
    await asyncio.sleep(1)  # simulate async LLM processing

    last_user_message = messages[-1].content if messages else "Hello"

    content = f"Echoing your message: '{last_user_message}'"

    citations = [
        {
            "docId": doc_id,
            "docName": f"Document {i+1}",
            "pageNumber": i + 1,
            "snippet": f"Sample snippet from {doc_id}"
        }
        for i, doc_id in enumerate(context_doc_ids)
    ]

    return {"content": content, "citations": citations}

# --- Chat Endpoint ---
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, request: Request):
    """
    Receives chat messages and context document IDs.
    Returns AI assistant response with optional citations.
    """
    try:
        user_id = get_user_from_request(request)

        # Call the mock service
        ai_response = await generate_chat_response(
            user_id=user_id,
            messages=req.messages,
            context_doc_ids=req.contextDocIds,
        )

        return ChatResponse(
            content=ai_response["content"],
            citations=ai_response.get("citations", []),
            error=""
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))