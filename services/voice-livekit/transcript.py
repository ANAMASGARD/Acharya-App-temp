import os

import httpx

VOICE_WEBHOOK_HEADER = "x-voice-agent-secret"


async def upload_transcript_batch(
    *,
    voice_session_id: str,
    conversation_id: str,
    clerk_id: str,
    messages: list[dict[str, str]],
) -> None:
    if not messages:
        return

    api_base = os.environ.get("ACHARYA_API_BASE_URL", "").rstrip("/")
    webhook_secret = os.environ.get("VOICE_AGENT_WEBHOOK_SECRET", "")

    if not api_base or not webhook_secret:
        return

    url = f"{api_base}/api/voice/transcript-batch"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            headers={
                VOICE_WEBHOOK_HEADER: webhook_secret,
                "Content-Type": "application/json",
            },
            json={
                "voiceSessionId": voice_session_id,
                "conversationId": conversation_id,
                "clerkId": clerk_id,
                "messages": messages,
            },
        )
        response.raise_for_status()
