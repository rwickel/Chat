# agents/agentic_rag.py
from typing import TypedDict, List, Annotated, Any
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.tools import tool
from langchain_ollama import ChatOllama  # ← Key change

# Optional: checkpointing
# from langgraph.checkpoint.memory import MemorySaver


class AgentState(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]
    user_id: str


# 🔧 Tools (same as before — RAG logic goes here)
@tool
def retrieve(query: str, user_id: str) -> str:
    """Search user-specific knowledge base."""
    # ✅ Replace with real RAG: e.g., Chroma + your embeddings
    return f"[Mock RAG] Top doc for '{user_id}': 'The answer to {query} is 42.'"


def get_tools(user_id: str):
    from functools import partial
    return [partial(retrieve, user_id=user_id)]


# 🧠 LLM: Ollama (local, GPU-accelerated on your RTX 3090!)
llm = ChatOllama(
    model="qwen3:14b",   # ✅ Try: "llama3.2", "qwen2.5:7b-instruct", "phi3:medium"
    base_url="http://localhost:11434",  # Default Ollama server
    temperature=0.3,
    num_ctx=4096,                # Context window (adjust per model)
    # Additional Ollama params (optional):
    # num_gpu=50,               # % of layers offloaded to GPU (RTX 3090 → high value!)
    # num_thread=8,             # CPU threads (if hybrid)
)

# 🧩 Agentic RAG Graph
def agent_node(state: AgentState):
    tools = get_tools(state["user_id"])
    # Bind tools — Ollama supports tool calling in llama3.1+, llama3.2+
    bound_llm = llm.bind_tools(tools)
    response = bound_llm.invoke(state["messages"])
    return {"messages": [response]}


def should_continue(state: AgentState) -> str:
    last_msg = state["messages"][-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "tools"
    return END


def tool_node(state: AgentState):
    last_msg = state["messages"][-1]
    tools_by_name = {t.name: t for t in get_tools(state["user_id"])}
    outputs = []
    for tool_call in last_msg.tool_calls:
        tool = tools_by_name[tool_call["name"]]
        result = tool.invoke(tool_call["args"])
        outputs.append(
            ToolMessage(content=str(result), tool_call_id=tool_call["id"])
        )
    return {"messages": outputs}


# 🔗 Build graph
builder = StateGraph(AgentState)
builder.add_node("agent", agent_node)
builder.add_node("tools", tool_node)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
builder.add_edge("tools", "agent")

AGENT_GRAPH = builder.compile()
# Optional: AGENT_GRAPH = builder.compile(checkpointer=MemorySaver())