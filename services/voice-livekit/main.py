import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext
from livekit.plugins import sarvam, silero

from transcript import upload_transcript_batch

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

logger = logging.getLogger("acharya-voice-agent")

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "acharya-voice.txt"
OPENING_LINE = "Namaste, I am Acharya AI."
AGENT_NAME = os.environ.get("LIVEKIT_AGENT_NAME", "acharya-voice-agent")


def load_system_prompt() -> str:
    if PROMPT_PATH.is_file():
        return PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "You are Acharya AI, a helpful teaching assistant for Indian teachers."


def parse_metadata(raw: str | None) -> dict[str, str]:
    if not raw:
        return {}

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    return {
        "voiceSessionId": str(parsed.get("voiceSessionId", "")),
        "conversationId": str(parsed.get("conversationId", "")),
        "clerkId": str(parsed.get("clerkId", "")),
    }


class AcharyaVoiceAgent(Agent):
    def __init__(self, instructions: str, transcript_log: list[dict[str, str]]) -> None:
        super().__init__(instructions=instructions)
        self._transcript_log = transcript_log

    async def on_enter(self) -> None:
        self._transcript_log.append({"role": "assistant", "content": OPENING_LINE})
        await self.session.say(OPENING_LINE, allow_interruptions=True)


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    metadata = parse_metadata(ctx.job.metadata)
    voice_session_id = metadata.get("voiceSessionId", "")
    conversation_id = metadata.get("conversationId", "")
    clerk_id = metadata.get("clerkId", "")
    transcript_log: list[dict[str, str]] = []

    session = AgentSession(
        stt=sarvam.STT(model=os.environ.get("SARVAM_STT_MODEL", "saaras:v3")),
        llm=sarvam.LLM(model=os.environ.get("SARVAM_LLM_MODEL", "sarvam-30b")),
        tts=sarvam.TTS(
            model=os.environ.get("SARVAM_TTS_MODEL", "bulbul:v3"),
            speaker=os.environ.get("SARVAM_TTS_SPEAKER", "priya"),
        ),
        vad=silero.VAD.load(),
    )

    @session.on("user_input_transcribed")
    def on_user_input(event) -> None:
        if event.is_final and event.transcript:
            transcript_log.append({"role": "user", "content": event.transcript})

    @session.on("conversation_item_added")
    def on_item_added(event) -> None:
        item = event.item
        if item.type == "message" and item.role == "assistant" and item.text_content:
            entry = {"role": "assistant", "content": item.text_content}
            if not transcript_log or transcript_log[-1] != entry:
                transcript_log.append(entry)

    async def flush_transcripts() -> None:
        if not voice_session_id or not conversation_id or not clerk_id:
            return

        try:
            await upload_transcript_batch(
                voice_session_id=voice_session_id,
                conversation_id=conversation_id,
                clerk_id=clerk_id,
                messages=transcript_log,
            )
        except Exception:
            logger.exception("Failed to upload voice transcript batch")

    ctx.add_shutdown_callback(flush_transcripts)

    await session.start(
        agent=AcharyaVoiceAgent(load_system_prompt(), transcript_log),
        room=ctx.room,
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
