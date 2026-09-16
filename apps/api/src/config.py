from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    gemini_api_key: str
    spike_capture_dir: Path = Path("/tmp/spike-sessions")


def get_settings() -> Settings:
    return Settings()
