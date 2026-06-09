import json
from typing import Any, Literal


AgentState = Literal["connecting", "listening", "thinking", "speaking"]


def dumps(message: dict[str, Any]) -> str:
    return json.dumps(message, separators=(",", ":"))


def agent_state(state: AgentState) -> str:
    return dumps({"type": "agent_state", "state": state})


def audio_message(data_b64: str, mime_type: str = "audio/wav") -> str:
    return dumps({"type": "audio", "data": data_b64, "mimeType": mime_type})


def error_message(message: str) -> str:
    return dumps({"type": "error", "message": message})


def ready_message() -> str:
    return dumps({"type": "ready"})


def transcript_message(role: Literal["user", "assistant"], content: str) -> str:
    return dumps({"type": "transcript", "role": role, "content": content})
