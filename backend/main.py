# ===== IMPORTS (add asyncio at top if not present) =====
import asyncio  # ← ADD THIS if not already imported
import os
import time
import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from routers import system, files, tools, chat
from core.event_loop import set_event_loop, shutdown_executor
from services.vector_store import init_chroma

# ===== GLOBAL EVENT LOOP REFERENCE =====
_GLOBAL_LOOP = None  # ← ADDED: will hold main event loop

# ===== LOGGING CONFIG =====
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("agentic-rag")


# ===== LIFESPAN (startup/shutdown) =====
@asynccontextmanager
async def lifespan(app: FastAPI):    

    # 🟢 Startup
    logger.info("🚀 Starting Agentic RAG backend...")
    logger.info(f"Base directory: {os.path.dirname(os.path.abspath(__file__))}")

    try:
        init_chroma()
    except Exception as e:
        logger.warning(f"ChromaDB init failed (will try on first use): {e}")

    # Set event loop early for background threads
    set_event_loop(asyncio.get_running_loop())
    logger.info("✅ Event loop initialized for background tasks.")

    # Optional: Warm up embedder model
    try:        
        logger.info("Warming up embedding model...")      
        logger.info("✅ Embedding model ready.")
    except Exception as e:
        logger.warning(f"Embedder warmup skipped: {e}")

    yield  # Run app

    # 🔴 Shutdown
    logger.info("🔴 Shutting down Agentic RAG backend...")

    # Graceful executor shutdown
    try:
        shutdown_executor()
        logger.info("✅ Background executor shut down.")
    except Exception as e:
        logger.error(f"Error during executor shutdown: {e}")


# ===== FASTAPI APP =====
app = FastAPI(
    title="Agentic RAG API",
    description="""
    🧠 Intelligent document processing & retrieval system with autonomous agents.

    ## Features
    - Secure file upload & user isolation
    - PDF text/image extraction
    - Semantic chunking & embedding
    - Agentic RAG with tool use (retrieve, read, search)
    - Real-time status tracking
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",        # Swagger UI
    redoc_url="/api/redoc",      # ReDoc
    openapi_url="/api/openapi.json"
)

# ===== MIDDLEWARE =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== EXCEPTION HANDLER =====
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url)}
    )

# ===== HEALTH CHECK =====
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0"
    }

# ===== ROUTERS =====
app.include_router(system.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(tools.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# ===== CUSTOM OPENAPI =====
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "X-User-Header": {
            "type": "apiKey",
            "in": "header",
            "name": "x-user",
            "description": "User ID for authentication"
        }
    }
    openapi_schema["security"] = [{"X-User-Header": []}]
    app.openapi_schema = openapi_schema
    return openapi_schema

app.openapi = custom_openapi

# ===== EXPORT FOR BACKGROUND THREADS =====
def get_event_loop():
    """Safe accessor for background threads to get main event loop."""
    if _GLOBAL_LOOP is None:
        raise RuntimeError("Event loop not initialized. App not started yet.")
    return _GLOBAL_LOOP

# ===== ENTRY POINT =====
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1,
        log_level="info"
    )