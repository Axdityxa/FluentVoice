"""
Speech analysis API routes.

Endpoints
---------
POST /api/analyze-speech  – upload WAV audio and receive phoneme-level analysis
"""

import os
import tempfile
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.services import azure_speech, gemini_feedback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/analyze-speech")
async def analyze_speech(
    audio: UploadFile = File(...),
    referenceText: str = Form("Please generate a tongue twister first"),
):
    """
    Accept a WAV file upload + reference text, run Azure pronunciation
    assessment, and return phoneme scores with optional AI feedback.

    The reference text is sent alongside the audio in the same request
    (as a multipart form field), eliminating the need for separate
    state and avoiding race conditions between concurrent users.
    """
    uploaded_path: str | None = None

    try:
        # Save to a temp file outside the project tree so watchfiles
        # doesn't trigger a reload, and avoid directory-existence issues.
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".wav", prefix="fluentvoice_"
        ) as tmp:
            uploaded_path = tmp.name
            content = await audio.read()
            tmp.write(content)

        # Run pronunciation assessment
        result = azure_speech.assess_pronunciation(
            audio_path=uploaded_path,
            reference_text=referenceText,
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
        elif not gemini_feedback.is_available():
            response["aiFeedback"] = (
                "AI feedback is unavailable. Add GEMINI_API_KEY to your .env file."
            )
        else:
            response["aiFeedback"] = gemini_feedback.get_feedback(low_scoring)

        return response

    except Exception as exc:
        logger.error("Analysis error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    finally:
        if uploaded_path and os.path.exists(uploaded_path):
            os.unlink(uploaded_path)
