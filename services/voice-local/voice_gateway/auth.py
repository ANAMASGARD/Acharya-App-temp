import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class SessionClaims:
    voice_session_id: str
    conversation_id: str
    clerk_id: str
    exp: int


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def verify_session_token(token: str, secret: str) -> SessionClaims | None:
    parts = token.split(".")

    if len(parts) != 3:
        return None

    header_b64, payload_b64, signature_b64 = parts
    unsigned = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), unsigned, hashlib.sha256).digest()
    provided = _b64url_decode(signature_b64)

    if not hmac.compare_digest(expected, provided):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (json.JSONDecodeError, ValueError):
        return None

    if int(payload.get("exp", 0)) < int(time.time()):
        return None

    voice_session_id = payload.get("voiceSessionId")
    conversation_id = payload.get("conversationId")
    clerk_id = payload.get("clerkId")

    if not all(isinstance(value, str) for value in (voice_session_id, conversation_id, clerk_id)):
        return None

    return SessionClaims(
        voice_session_id=voice_session_id,
        conversation_id=conversation_id,
        clerk_id=clerk_id,
        exp=int(payload["exp"]),
    )
