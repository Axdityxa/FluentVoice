"""
FluentVoice — FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --port 3000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings, PUBLIC_DIR
from app.routers import speech
from app.services import openai_feedback

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FluentVoice",
    description="AI-powered speech therapy and pronunciation practice",
    version="1.0.0",
)

# CORS — allow everything (matches Express cors() defaults)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API routes (must be registered BEFORE the static-file catch-all)
# ---------------------------------------------------------------------------
app.include_router(speech.router)


@app.get("/api/health")
async def health():
    """Server and configuration status."""
    return {
        "status": "ok",
        "speechConfigured": bool(settings.SPEECH_KEY and settings.SPEECH_REGION),
        "openaiConfigured": openai_feedback.is_available(),
    }


# ---------------------------------------------------------------------------
# Static files — serve the public/ directory (catch-all, so register last)
# ---------------------------------------------------------------------------
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")


# ---------------------------------------------------------------------------
# Startup banner
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def _startup_banner():
    logger.info("FluentVoice server running at http://localhost:%s", settings.PORT)
    logger.info("Serving frontend from: %s", PUBLIC_DIR)
    logger.info(
        "OpenAI: %s",
        "enabled" if openai_feedback.is_available() else "disabled (optional)",
    )
