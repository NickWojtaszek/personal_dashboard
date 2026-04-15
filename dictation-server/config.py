"""Configuration loaded from environment variables / .env file."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    # Whisper
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_beam_size: int = 5

    # HTTP
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    max_audio_size_mb: int = 25

    # Defaults
    default_language: str = "en"


settings = Settings()
