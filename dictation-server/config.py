"""Configuration loaded from environment variables / .env file."""

from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    # Whisper
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_beam_size: int = 5

    # HTTP
    # Accepts either a JSON list in the env var or a comma-separated string:
    #   CORS_ORIGINS=http://a.com,https://b.com
    #   CORS_ORIGINS=["http://a.com","https://b.com"]
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    max_audio_size_mb: int = 25

    # Defaults
    default_language: str = "en"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                # Let pydantic handle JSON parsing
                return v
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return v


settings = Settings()
