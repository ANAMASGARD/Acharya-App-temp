from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    sarvam_api_key: str
    voice_session_signing_secret: str
    voice_agent_webhook_secret: str
    acharya_api_base_url: str
    sarvam_stt_model: str = "saaras:v3"
    sarvam_llm_model: str = "sarvam-30b"
    sarvam_tts_model: str = "bulbul:v3"
    sarvam_tts_speaker: str = "priya"
    sarvam_tts_language: str = "en-IN"
    host: str = "0.0.0.0"
    port: int = 8080


@lru_cache
def get_settings() -> Settings:
    return Settings()
