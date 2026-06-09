from functools import lru_cache

from sarvamai import SarvamAI

from voice_gateway.config import get_settings


@lru_cache
def get_sarvam_client() -> SarvamAI:
    settings = get_settings()
    return SarvamAI(api_subscription_key=settings.sarvam_api_key)
