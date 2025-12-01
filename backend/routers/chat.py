from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from agents.agentic_rag import AGENT_GRAPH, AgentState

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    user_id: str

@router.post("/chat")
async def chat(body: ChatRequest):  # ← removed `request: Request`
    state: AgentState = {
        "messages": [HumanMessage(content=body.query)],
        "user_id": body.user_id,
    }

    try:
        result = await AGENT_GRAPH.ainvoke(state)

        messages = result.get("messages", [])
        if not messages:
            raise ValueError("Agent returned no messages")

        final_message = messages[-1]
        answer = getattr(final_message, "content", str(final_message))

        # Count conversational turns (Human ↔ AI)
        from langchain_core.messages import HumanMessage, AIMessage
        turn_count = sum(
            1 for m in messages if isinstance(m, (HumanMessage, AIMessage))
        ) // 2

        return {
            "answer": answer,
            "steps": turn_count,
            "total_messages": len(messages),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent execution failed: {e}"
        )