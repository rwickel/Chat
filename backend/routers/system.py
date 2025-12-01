# backend/routers/system.py
import os
import platform
import psutil
import torch
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Optional: Only import if installed
try:
    from sentence_transformers import SentenceTransformer
    _SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    _SENTENCE_TRANSFORMERS_AVAILABLE = False

router = APIRouter(prefix="/system", tags=["system"])

class SystemInfo(BaseModel):
    status: str
    timestamp: float
    platform: str
    python_version: str
    process: Dict[str, Any]
    gpu: Optional[Dict[str, Any]] = None
    embedding_test: Optional[Dict[str, Any]] = None
    environment: Dict[str, str]

@router.get("/health", response_model=SystemInfo)
async def system_health(request: Request):
    """
    Comprehensive system health check.
    - CPU/RAM usage
    - GPU status (if available)
    - Embedding model test (on GPU if possible)
    - Environment info
    """
    import time
    start_time = time.time()

    # 🔍 CPU/RAM
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    
    sys_info = {
        "status": "healthy",
        "timestamp": time.time(),
        "platform": f"{platform.system()} {platform.release()}",
        "python_version": platform.python_version(),
        "process": {
            "pid": os.getpid(),
            "cpu_percent": process.cpu_percent(interval=0.1),
            "memory_mb": round(mem_info.rss / 1024 / 1024, 1),
            "threads": process.num_threads(),
            "uptime_sec": round(time.time() - start_time, 3)
        },
        "environment": {
            "env": os.getenv("ENV", "development"),
            "workers": os.getenv("WEB_CONCURRENCY", "1"),
            "host": request.client.host if request.client else "unknown"
        }
    }

    # 🎮 GPU Info (RTX 3090 optimized)
    gpu_info = None
    if torch.cuda.is_available():
        try:
            props = torch.cuda.get_device_properties(0)
            gpu_info = {
                "name": torch.cuda.get_device_name(0),
                "cuda_available": True,
                "cuda_version": torch.version.cuda,
                "compute_capability": f"{props.major}.{props.minor}",
                "total_vram_gb": round(props.total_memory / 1e9, 1),
                "allocated_vram_gb": round(torch.cuda.memory_allocated(0) / 1e9, 2),
                "reserved_vram_gb": round(torch.cuda.memory_reserved(0) / 1e9, 2),
                "utilization_percent": torch.cuda.utilization(0) if hasattr(torch.cuda, 'utilization') else "N/A",
                "temperature_c": _get_gpu_temp()
            }
            sys_info["gpu"] = gpu_info
        except Exception as e:
            sys_info["gpu"] = {"error": f"GPU query failed: {str(e)}"}

    # 🧠 Embedding Test (quick, non-blocking)
    embedding_test = None
    if _SENTENCE_TRANSFORMERS_AVAILABLE and torch.cuda.is_available():
        try:
            # Use a lightweight model for fast test
            model = SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2",
                device="cuda",
                cache_folder="/tmp"  # avoid polluting project dir
            )
            with torch.no_grad():
                emb = model.encode(["System check"], convert_to_tensor=True)
            
            embedding_test = {
                "model": "all-MiniLM-L6-v2",
                "device": "cuda" if emb.is_cuda else "cpu",
                "embedding_dim": emb.shape[1],
                "latency_ms": round((time.time() - start_time) * 1000, 1),
                "status": "success"
            }
            sys_info["embedding_test"] = embedding_test
        except Exception as e:
            sys_info["embedding_test"] = {
                "status": "error",
                "error": str(e)
            }

    # Check Ollama
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{OLLAMA_HOST}/api/tags", timeout=5.0)
            ollama_status = "healthy" if r.status_code == 200 else "unhealthy"
    except:
        ollama_status = "down"
    
    sys_info["ollama"] = {
        "status": ollama_status,
        "model": EMBEDDING_MODEL
    }        

    return SystemInfo(**sys_info)


def _get_gpu_temp() -> str:
    """Get GPU temp (Linux only via nvidia-smi; fallback to 'N/A')"""
    try:
        if os.name == "posix":
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=2
            )
            if result.returncode == 0:
                return f"{result.stdout.strip()}°C"
    except:
        pass
    return "N/A"


# 🔐 Optional: Protected debug endpoint (requires auth header)
@router.get("/debug/gpu")
async def debug_gpu(request: Request):
    """
    Detailed GPU debug info (for admins only).
    Requires header: x-admin-key: <SECRET>
    """
    admin_key = os.getenv("ADMIN_KEY")
    if not admin_key or request.headers.get("x-admin-key") != admin_key:
        raise HTTPException(403, "Forbidden")

    if not torch.cuda.is_available():
        return {"error": "CUDA not available"}

    return {
        "cuda_version": torch.version.cuda,
        "cudnn_version": torch.backends.cudnn.version(),
        "gpu_name": torch.cuda.get_device_name(0),
        "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1),
        "vram_allocated_gb": round(torch.cuda.memory_allocated(0) / 1e9, 2),
        "vram_reserved_gb": round(torch.cuda.memory_reserved(0) / 1e9, 2),
        "vram_free_gb": round((torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_reserved(0)) / 1e9, 2),
        "gpu_utilization": f"{torch.cuda.utilization(0)}%",
        "temperature": _get_gpu_temp(),
        "torch_version": torch.__version__,
        "device_count": torch.cuda.device_count(),
        "current_device": torch.cuda.current_device(),
        "memory_summary": torch.cuda.memory_summary(device=0, abbreviated=True)
    }