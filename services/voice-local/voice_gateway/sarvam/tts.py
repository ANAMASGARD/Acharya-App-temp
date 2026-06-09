import base64
import time

from voice_gateway.config import get_settings
from voice_gateway.sarvam.client import get_sarvam_client


def synthesize_speech_base64(
    text: str,
    language_code: str | None = None,
) -> tuple[str, str]:
    settings = get_settings()
    client = get_sarvam_client()
    trimmed = text.strip()

    if not trimmed:
        return "", "audio/wav"

    target_language = language_code or settings.sarvam_tts_language
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            response = client.text_to_speech.convert(
                text=trimmed[:2500],
                target_language_code=target_language,
                model=settings.sarvam_tts_model,
                speaker=settings.sarvam_tts_speaker,
            )
            audio_b64 = response.audios[0] if response.audios else ""
            return audio_b64, "audio/wav"
        except Exception as error:
            last_error = error
            if attempt == 0:
                time.sleep(0.75)

    raise RuntimeError("Sarvam TTS failed") from last_error
