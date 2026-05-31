"""
Google Gemini wrapper for speech therapy feedback.
"""

import json
import logging

from google import genai

from app.config import settings

logger = logging.getLogger(__name__)

# Initialise client only when an API key is configured
_client: genai.Client | None = (
    genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
)

_MODEL = "gemini-2.5-flash"


def is_available() -> bool:
    """Return True if the Gemini client is configured."""
    return _client is not None


def get_feedback(low_scoring_phonemes: list[dict]) -> str:
    """
    Ask Gemini for actionable pronunciation advice.

    *low_scoring_phonemes* is a list of dicts with keys:
        phoneme, score, word

    Returns an HTML-formatted string.
    """
    if not _client:
        return "AI feedback is unavailable. Add GEMINI_API_KEY to your .env file."

    if not low_scoring_phonemes:
        return "Great job! All phonemes were pronounced well."

    prompt = (
        "You are a helpful speech therapist providing "
        "specific, actionable pronunciation advice.\n\n"
        "As a speech therapist, provide specific advice for "
        "improving these phonemes:\n"
        f"{json.dumps(low_scoring_phonemes, indent=2)}\n\n"
        "For each problematic phoneme:\n"
        "1. Explain mouth, tongue, and lip position\n"
        "2. Provide a simple practice exercise\n"
        "3. Suggest 2-3 practice words\n\n"
        "Format the response in clear HTML bullet points."
    )

    try:
        response = _client.models.generate_content(
            model=_MODEL,
            contents=prompt,
        )
        return response.text or ""

    except Exception as exc:
        logger.error("Gemini API error: %s", exc)
        return f"AI feedback unavailable at the moment. Error: {exc}"
