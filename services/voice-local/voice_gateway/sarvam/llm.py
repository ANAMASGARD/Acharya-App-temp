from typing import Literal

from voice_gateway.config import get_settings
from voice_gateway.sarvam.client import get_sarvam_client

ChatRole = Literal["system", "user", "assistant"]


def chat_completion(
    system_prompt: str,
    history: list[dict[str, str]],
) -> str:
    settings = get_settings()
    client = get_sarvam_client()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        *history,
    ]

    response = client.chat.completions(
        model=settings.sarvam_llm_model,
        messages=messages,
        temperature=0.5,
        max_tokens=512,
        # Voice needs direct answers — reasoning mode can consume the token budget
        # and leave `content` empty (only `reasoning_content` is filled).
        reasoning_effort=None,
    )

    if not response.choices:
        return ""

    message = response.choices[0].message
    content = (message.content or "").strip()
    if content:
        return content

    reasoning = (getattr(message, "reasoning_content", None) or "").strip()
    return reasoning[:400] if reasoning else ""
