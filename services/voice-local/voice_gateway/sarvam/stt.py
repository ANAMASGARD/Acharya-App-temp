import base64
import os
import tempfile
from pathlib import Path

from voice_gateway.config import get_settings
from voice_gateway.sarvam.client import get_sarvam_client


def _audio_path_for_mime(mime_type: str) -> tuple[str, str]:
    """Pick a Sarvam-accepted filename suffix (avoids video/mp4 sniffing on .mp4)."""
    mime = mime_type.lower().strip()

    if "webm" in mime:
        return ".webm", "audio/webm"
    if "wav" in mime:
        return ".wav", "audio/wav"
    if "m4a" in mime or "mp4" in mime or "aac" in mime or "mpeg" in mime:
        return ".m4a", "audio/mp4"

    return ".m4a", "audio/mp4"


def transcribe_audio_base64(
    audio_b64: str,
    mime_type: str,
    language_code: str | None = None,
) -> str:
    settings = get_settings()
    audio_bytes = base64.b64decode(audio_b64)
    suffix, _ = _audio_path_for_mime(mime_type)
    temp_dir = tempfile.mkdtemp(prefix="acharya-voice-stt-")
    input_path = Path(temp_dir) / f"chunk{suffix}"

    try:
        input_path.write_bytes(audio_bytes)
        client = get_sarvam_client()

        with input_path.open("rb") as audio_file:
            transcribe_kwargs: dict[str, object] = {
                "file": audio_file,
                "model": settings.sarvam_stt_model,
                "mode": "transcribe",
            }
            if language_code:
                transcribe_kwargs["language_code"] = language_code
            response = client.speech_to_text.transcribe(**transcribe_kwargs)

        return (response.transcript or "").strip()
    finally:
        try:
            os.remove(input_path)
            os.rmdir(temp_dir)
        except OSError:
            pass
