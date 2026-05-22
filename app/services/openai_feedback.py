"""
OpenAI chat-completion wrapper for speech therapy feedback.
"""

import json
import logging

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

# Initialise client only when an API key is configured
_client: OpenAI | None = (
    OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
)


def is_available() -> bool:
    """Return True if the OpenAI client is configured."""
    return _client is not None


def get_feedback(low_scoring_phonemes: list[dict]) -> str:
    """
    Ask OpenAI for actionable pronunciation advice.

    *low_scoring_phonemes* is a list of dicts with keys:
        phoneme, score, word

    Returns an HTML-formatted string.
    """
    if not _client:
        return "AI feedback is unavailable. Add OPENAI_API_KEY to your .env file."

    if not low_scoring_phonemes:
        return "Great job! All phonemes were pronounced well."

    try:
        response = _client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful speech therapist providing "
                        "specific, actionable pronunciation advice."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "As a speech therapist, provide specific advice for "
                        "improving these phonemes:\n"
                        f"{json.dumps(low_scoring_phonemes, indent=2)}\n\n"
                        "For each problematic phoneme:\n"
                        "1. Explain mouth, tongue, and lip position\n"
                        "2. Provide a simple practice exercise\n"
                        "3. Suggest 2-3 practice words\n\n"
                        "Format the response in clear HTML bullet points."
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=500,
        )
        return response.choices[0].message.content or ""

    except Exception as exc:
        logger.error("OpenAI API error: %s", exc)
        return f"AI feedback unavailable at the moment. Error: {exc}"
