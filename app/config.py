"""
Application configuration loaded from environment variables / .env file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
ENV_PATH = ROOT_DIR / ".env"


class Settings(BaseSettings):
    """Validated application settings sourced from .env."""

    SPEECH_KEY: str
    SPEECH_REGION: str = "eastus"
    GEMINI_API_KEY: str | None = None
    PORT: int = 3000

    model_config = {
        "env_file": str(ENV_PATH),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
