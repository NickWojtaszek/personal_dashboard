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
    # Comma-separated string; use `cors_origins_list` to get a parsed list.
    # Pydantic-settings v2 tries to JSON-decode List[str] env vars before
    # validators run, which fails for plain comma-separated values — so we
    # store as a string and split on demand.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    max_audio_size_mb: int = 25

    # Defaults
    default_language: str = "en"

    @property
    def cors_origins_list(self) -> List[str]:
        value = self.cors_origins.strip()
        if not value:
            return []
        # Tolerate a JSON array too, for users who set it that way
        if value.startswith("["):
            import json
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in value.split(",") if o.strip()]


settings = Settings()
