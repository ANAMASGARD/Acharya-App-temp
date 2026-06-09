import httpx

from voice_gateway.config import get_settings

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

    settings = get_settings()
    url = f"{settings.acharya_api_base_url.rstrip('/')}/api/voice/transcript-batch"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            headers={
                VOICE_WEBHOOK_HEADER: settings.voice_agent_webhook_secret,
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
