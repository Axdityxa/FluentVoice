"""
Speech analysis API routes.

Endpoints
---------
POST /api/set-reference   – update the reference text for pronunciation scoring
POST /api/analyze-speech  – upload WAV audio and receive phoneme-level analysis
"""

import os
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.config import UPLOADS_DIR
from app.services import azure_speech, openai_feedback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# In-memory reference text (matches Express behaviour — single-worker only)
# ---------------------------------------------------------------------------
_current_reference_text: str = "Please generate a tongue twister first"


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class SetReferenceRequest(BaseModel):
    referenceText: str


class SetReferenceResponse(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/set-reference", response_model=SetReferenceResponse)
async def set_reference(body: SetReferenceRequest):
    """Update the reference text used for the next pronunciation assessment."""
    global _current_reference_text
    _current_reference_text = body.referenceText
    return SetReferenceResponse(success=True, message="Reference text updated")


@router.post("/analyze-speech")
async def analyze_speech(audio: UploadFile = File(...)):
    """
    Accept a WAV file upload, run Azure pronunciation assessment,
    and return phoneme scores with optional AI feedback.
    """
    uploaded_path: str | None = None

    try:
        # Save the uploaded file to disk (Azure SDK requires a file path)
        uploaded_path = os.path.join(UPLOADS_DIR, audio.filename or "recording.wav")
        content = await audio.read()
        with open(uploaded_path, "wb") as f:
            f.write(content)

        # Run pronunciation assessment
        result = azure_speech.assess_pronunciation(
            audio_path=uploaded_path,
            reference_text=_current_reference_text,
        )

        response = {
            "transcription": result["text"],
            "phonemes": result["phonemes"],
            "feedback": "Speech analysis completed",
        }

        # Identify problem phonemes and get AI feedback
        low_scoring = [
            {"phoneme": p["phoneme"], "score": p["accuracyScore"], "word": p["fromWord"]}
            for p in response["phonemes"]
            if p["accuracyScore"] < 70
        ]

        if not low_scoring:
            response["aiFeedback"] = "Great job! All phonemes were pronounced well."
        elif not openai_feedback.is_available():
            response["aiFeedback"] = (
                "AI feedback is unavailable. Add OPENAI_API_KEY to your .env file."
            )
        else:
            response["aiFeedback"] = openai_feedback.get_feedback(low_scoring)

        return response

    except Exception as exc:
        logger.error("Analysis error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    finally:
        if uploaded_path and os.path.exists(uploaded_path):
            os.unlink(uploaded_path)
