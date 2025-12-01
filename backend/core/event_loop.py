# backend/core/event_loop.py
import asyncio
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

_event_loop: Optional[asyncio.AbstractEventLoop] = None
_executor: Optional[ThreadPoolExecutor] = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Set the global event loop (call once at app startup)."""
    global _event_loop
    if _event_loop is not None:
        raise RuntimeError("Event loop already set.")
    _event_loop = loop


def get_event_loop() -> asyncio.AbstractEventLoop:
    """Get the global event loop (safe for background threads)."""
    if _event_loop is None:
        raise RuntimeError(
            "Event loop not initialized. "
            "Ensure app lifespan has started and set_event_loop() was called."
        )
    return _event_loop


def get_background_executor() -> ThreadPoolExecutor:
    """Lazy-create and return thread pool for CPU-bound background tasks."""
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(
            max_workers=4,
            thread_name_prefix="bg-worker"
        )
    return _executor


def shutdown_executor() -> None:
    """Gracefully shut down the background executor."""
    global _executor
    if _executor is not None:
        _executor.shutdown(wait=True)
        _executor = None