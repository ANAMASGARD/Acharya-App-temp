import asyncio
import json
import logging
from pathlib import Path

from fastapi import WebSocket, WebSocketDisconnect

from voice_gateway.auth import SessionClaims, verify_session_token
from voice_gateway.config import get_settings
from voice_gateway import protocol
from voice_gateway.language import (
    append_language_lock,
    detect_language_switch,
    infer_language_from_text,
)
from voice_gateway.sarvam import llm, stt, tts
from voice_gateway.transcript import upload_transcript_batch

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "acharya-voice.txt"
OPENING_LINE = "Namaste, I am Acharya AI."
SLICE_MS = 1250
END_OF_TURN_SILENCE_MS = 1500


def load_system_prompt() -> str:
    if PROMPT_PATH.is_file():
        return PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "You are Acharya AI, a helpful teaching assistant for Indian teachers."


class VoiceSession:
    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self.claims: SessionClaims | None = None
        self.audio_mime = "audio/x-m4a"
        self.history: list[dict[str, str]] = []
        self.transcript_log: list[dict[str, str]] = []
        self.system_prompt = load_system_prompt()
        self.closed = False
        self.audio_task: asyncio.Task[None] | None = None
        self.audio_queue: asyncio.Queue[tuple[str, str]] = asyncio.Queue()
        self.current_user_parts: list[str] = []
        self.queued_user_parts: list[str] = []
        self.silence_ms = 0
        self.processing_response = False
        self.tts_language = "en-IN"
        self.stt_language: str | None = None
        self.locked_reply_language: str | None = None

    async def run(self) -> None:
        settings = get_settings()
        authenticated = False

        try:
            while True:
                raw = await self.websocket.receive_text()
                message = json.loads(raw)
                msg_type = message.get("type")

                if msg_type == "auth":
                    token = message.get("sessionToken", "")
                    self.claims = verify_session_token(token, settings.voice_session_signing_secret)

                    if not self.claims:
                        await self.websocket.send_text(
                            protocol.error_message("Invalid or expired session token."),
                        )
                        await self.websocket.close()
                        return

                    authenticated = True
                    await self._speak_opening()
                    await self.websocket.send_text(protocol.ready_message())
                    self.audio_task = asyncio.create_task(self._consume_audio())
                    continue

                if not authenticated:
                    await self.websocket.send_text(
                        protocol.error_message("Authenticate before sending audio."),
                    )
                    continue

                if msg_type == "audio":
                    chunk_b64 = message.get("data", "")
                    mime_type = message.get("mimeType", "audio/x-m4a")
                    self.audio_mime = mime_type

                    if chunk_b64:
                        await self.audio_queue.put((chunk_b64, mime_type))
                    continue

                if msg_type == "end_turn":
                    await self._finish_current_turn()
                    continue

                if msg_type == "hangup":
                    self.closed = True
                    if self.audio_task and not self.audio_task.done():
                        self.audio_task.cancel()
                    break
        except WebSocketDisconnect:
            self.closed = True
        finally:
            if self.audio_task and not self.audio_task.done():
                self.audio_task.cancel()
            await self._flush_transcripts()

    async def _send_text(self, payload: str) -> None:
        if self.closed:
            return
        await self.websocket.send_text(payload)

    async def _speak_opening(self) -> None:
        opening = OPENING_LINE
        self.history.append({"role": "assistant", "content": opening})
        self.transcript_log.append({"role": "assistant", "content": opening})
        await self._send_text(protocol.transcript_message("assistant", opening))
        await self._send_tts(opening, language_code=self.tts_language, notify_error=False)

    async def _consume_audio(self) -> None:
        while not self.closed:
            chunk_b64, mime_type = await self.audio_queue.get()
            await self._process_audio_slice(chunk_b64, mime_type)

    def _active_user_parts(self) -> list[str]:
        return self.queued_user_parts if self.processing_response else self.current_user_parts

    async def _process_audio_slice(self, audio_b64: str, mime_type: str) -> None:
        active_parts = self._active_user_parts()

        try:
            user_text = await asyncio.to_thread(
                stt.transcribe_audio_base64,
                audio_b64,
                mime_type,
                self.stt_language,
            )
        except Exception:
            logger.exception("STT failed for audio slice")
            if not self.processing_response:
                self.silence_ms += SLICE_MS
                if active_parts and self.silence_ms >= END_OF_TURN_SILENCE_MS:
                    await self._finish_current_turn()
            return

        if not user_text:
            if not self.processing_response:
                self.silence_ms += SLICE_MS
                if self.current_user_parts and self.silence_ms >= END_OF_TURN_SILENCE_MS:
                    await self._finish_current_turn()
            return

        active_parts.append(user_text)
        if not self.processing_response:
            self.silence_ms = 0

        await self._send_text(protocol.agent_state("listening"))

    async def _finish_current_turn(self) -> None:
        if self.processing_response:
            return

        user_text = " ".join(self.current_user_parts).strip()
        self.current_user_parts.clear()
        self.silence_ms = 0

        if not user_text:
            await self._send_text(protocol.agent_state("listening"))
            return

        switched = detect_language_switch(user_text)
        if switched:
            self.locked_reply_language = switched
            self.stt_language = switched
            self.tts_language = switched
        elif self.locked_reply_language:
            self.stt_language = self.locked_reply_language
            self.tts_language = self.locked_reply_language
        else:
            inferred = infer_language_from_text(user_text, self.tts_language)
            self.stt_language = inferred
            self.tts_language = inferred

        self.processing_response = True
        await self._send_text(protocol.agent_state("thinking"))

        self.history.append({"role": "user", "content": user_text})
        self.transcript_log.append({"role": "user", "content": user_text})
        await self._send_text(protocol.transcript_message("user", user_text))

        effective_prompt = append_language_lock(
            self.system_prompt,
            self.locked_reply_language,
        )

        try:
            assistant_text = await asyncio.to_thread(
                llm.chat_completion,
                effective_prompt,
                self.history,
            )
        except Exception:
            logger.exception("LLM chat completion failed")
            assistant_text = ""

        if not assistant_text:
            assistant_text = (
                "Sorry, I could not generate a reply just now. "
                "Please ask your teaching question again."
            )

        if self.locked_reply_language:
            reply_language = self.locked_reply_language
        else:
            reply_language = infer_language_from_text(assistant_text, self.tts_language)
            self.tts_language = reply_language
            self.stt_language = reply_language

        self.history.append({"role": "assistant", "content": assistant_text})
        self.transcript_log.append({"role": "assistant", "content": assistant_text})
        await self._send_text(
            protocol.transcript_message("assistant", assistant_text),
        )
        await self._send_tts(assistant_text, language_code=reply_language)
        self.processing_response = False

        if self.queued_user_parts:
            self.current_user_parts.extend(self.queued_user_parts)
            self.queued_user_parts.clear()
            await self._finish_current_turn()

    async def _send_tts(
        self,
        text: str,
        language_code: str | None = None,
        notify_error: bool = True,
    ) -> None:
        await self._send_text(protocol.agent_state("speaking"))

        try:
            audio_b64, mime_type = await asyncio.to_thread(
                tts.synthesize_speech_base64,
                text,
                language_code,
            )
        except Exception:
            logger.exception("TTS failed")
            if notify_error:
                await self._send_text(
                    protocol.error_message("Voice audio is temporarily unavailable. Please try again."),
                )
            await self._send_text(protocol.agent_state("listening"))
            return

        if audio_b64:
            await self._send_text(protocol.audio_message(audio_b64, mime_type))

        await self._send_text(protocol.agent_state("listening"))

    async def _flush_transcripts(self) -> None:
        if not self.claims or not self.transcript_log:
            return

        try:
            await upload_transcript_batch(
                voice_session_id=self.claims.voice_session_id,
                conversation_id=self.claims.conversation_id,
                clerk_id=self.claims.clerk_id,
                messages=self.transcript_log,
            )
        except Exception:
            # Best-effort — chat refresh may still load messages on next open.
            logger.warning("Transcript upload failed on disconnect", exc_info=True)
